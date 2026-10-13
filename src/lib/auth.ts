import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import { encode } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { comparePassword } from "./password";
import type { SRSRole } from "../types/next-auth";
import {
  googleAuthService,
  GoogleEmailNotProvidedError,
  UserInactiveError,
  type GoogleProfile,
} from "@/features/auth";
import { linkAccount } from "@/features/users/linked-accounts.repository";

export let activeGoogleAuthService = googleAuthService;
export function setGoogleAuthService(service: any) {
  activeGoogleAuthService = service;
}

/**
 * Los cuatro roles del sistema autorizados por el SRS:
 * ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR
 */
export const VALID_SRS_ROLES = [
  "ADMIN",
  "CLIENT",
  "TICKET_SELLER",
  "QR_VALIDATOR",
] as const;

export interface AuthCredentials {
  email?: string | null;
  password?: string | null;
}

/**
 * Función central de negocio para autenticar credenciales y adjuntar el rol del SRS.
 * Valida formato, existencia de usuario, contraseña encriptada y rol autorizado.
 *
 * @param credentials Credenciales de inicio de sesión (email, password).
 * @param db Instancia de PrismaClient (inyección de dependencias para tests).
 * @returns Usuario autenticado con id, email, name y role.
 */
export async function authenticateUser(
  credentials?: AuthCredentials | null,
  db: PrismaClient = defaultPrisma
): Promise<NextAuthUser> {
  // 1. Caso límite: Validar correo o contraseña vacíos o que solo contengan espacios
  const rawEmail = credentials?.email;
  const rawPassword = credentials?.password;

  if (!rawEmail || typeof rawEmail !== "string" || !rawEmail.trim()) {
    throw new Error("El correo electrónico es obligatorio y no puede estar vacío");
  }

  if (!rawPassword || typeof rawPassword !== "string" || !rawPassword.trim()) {
    throw new Error("La contraseña es obligatoria y no puede estar vacía");
  }

  const cleanEmail = rawEmail.trim().toLowerCase();
  const cleanPassword = rawPassword.trim();

  // 2. Buscar usuario activo en PostgreSQL vía Prisma ORM (sin distinguir mayúsculas)
  const user = await db.users.findFirst({
    where: {
      email: {
        equals: cleanEmail,
        mode: "insensitive",
      },
      is_active: true,
    },
    include: {
      roles: true,
    },
  });

  if (!user || !user.password_hash) {
    throw new Error("Credenciales incorrectas: correo o contraseña no válidos");
  }

  // 3. Comparar la contraseña encriptada con bcrypt
  const isMatch = await comparePassword(cleanPassword, user.password_hash);
  if (!isMatch) {
    throw new Error("Credenciales incorrectas: correo o contraseña no válidos");
  }

  // 4. Caso de error: Validar que el rol del usuario pertenezca estrictamente al SRS
  const roleName = user.roles?.name ? user.roles.name.toUpperCase() : "";

  // Normalización para compatibilidad si el rol en BD es legacy "CUSTOMER" -> "CLIENT"
  let srsRole: string = roleName;
  if (roleName === "CUSTOMER") {
    srsRole = "CLIENT";
  }

  if (!VALID_SRS_ROLES.includes(srsRole as SRSRole)) {
    throw new Error(
      `El usuario no posee un rol válido del sistema para iniciar sesión (${roleName || "SIN_ROL"})`
    );
  }

  // 5. Retornar el usuario con su rol tipado
  return {
    id: user.id,
    email: user.email,
    name: user.full_name,
    role: srsRole as SRSRole,
  };
}

/**
 * Obtiene y valida la clave secreta requerida para la firma y cifrado de sesiones NextAuth (JWT).
 * Lanza un error explícito si la variable de entorno NEXTAUTH_SECRET (o JWT_SECRET) no está configurada,
 * impidiendo el uso de claves por defecto predecibles o inseguras en el repositorio.
 *
 * @param env Entorno de variables (opcional para pruebas unitarias)
 */
export function getAuthSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.NEXTAUTH_SECRET || env.JWT_SECRET;
  if (!secret) {
    if (env.NODE_ENV === "test" || env.npm_lifecycle_event === "test") {
      return "vice-city-unit-tests-isolated-secret-key-32chars";
    }
    throw new Error(
      "Configuración de seguridad faltante: NEXTAUTH_SECRET (o JWT_SECRET) no está definida en las variables de entorno. Configure NEXTAUTH_SECRET en su archivo .env."
    );
  }
  return secret;
}

export interface SessionCookieConfig {
  name: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    secure: boolean;
    maxAge: number;
  };
}

/**
 * Determina si el contexto actual exige cookies seguras (HTTPS).
 * Coincide con la resolución nativa de cookies de NextAuth v4.
 */
export function isSecureAuthContext(request?: Request): boolean {
  if (process.env.NEXTAUTH_URL?.startsWith("https://")) {
    return true;
  }
  if (process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL)) {
    return true;
  }
  if (request) {
    const url = request.url || "";
    if (url.startsWith("https://")) {
      return true;
    }
  }
  return false;
}

/**
 * Obtiene la configuración y nombre estándar de la cookie de sesión de NextAuth
 * según el entorno (HTTP vs HTTPS) y el tiempo de expiración configurado.
 */
export function getSessionCookieConfig(options?: {
  isSecure?: boolean;
  maxAge?: number;
}): SessionCookieConfig {
  const isSecure = options?.isSecure ?? isSecureAuthContext();
  const maxAge = options?.maxAge ?? (authOptions.session?.maxAge || 8 * 60 * 60);

  return {
    name: isSecure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: Boolean(isSecure),
      maxAge,
    },
  };
}

/**
 * Emite un token de sesión NextAuth (JWE) firmado y cifrado para un usuario autenticado.
 * Utiliza encode de next-auth/jwt y getAuthSecret() garantizando total compatibilidad
 * con getToken(), getServerSession() y el middleware perimetral.
 *
 * @param user Datos del usuario autenticado (id, email, name, role)
 * @param customSecret Clave secreta opcional para pruebas
 * @param customMaxAge Tiempo de vida opcional en segundos
 */
export async function createSessionToken(
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: SRSRole | string;
  },
  customSecret?: string,
  customMaxAge?: number
): Promise<string> {
  const secret = customSecret || getAuthSecret();
  const maxAge = customMaxAge ?? (authOptions.session?.maxAge || 8 * 60 * 60);

  return await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      role: user.role as SRSRole,
    },
    secret,
    maxAge,
  });
}

/**
 * Lee y valida las credenciales del proveedor Google OAuth desde el entorno.
 * Devuelve `null` cuando no están configuradas, evitando enviar `client_id`
 * falsos a Google (que producen errores opacos como `invalid_client`).
 *
 * Variables esperadas (Google Cloud Console → Credenciales OAuth 2.0):
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 *
 * @param env Entorno de variables (opcional para pruebas unitarias)
 */
export function getGoogleCredentials(env: NodeJS.ProcessEnv = process.env): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * Construye la lista de proveedores de NextAuth.
 *
 * El proveedor de Google solo se registra cuando GOOGLE_CLIENT_ID y
 * GOOGLE_CLIENT_SECRET están configurados. Así, la ausencia de credenciales no
 * rompe el login por credenciales ni envía un `client_id` ficticio a Google.
 * La UI consulta /api/auth/providers para mostrar el botón solo si está activo.
 */
export function buildAuthProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [
    // Proveedor por credenciales locales (HU02-B)
    CredentialsProvider({
      id: "credentials",
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email", placeholder: "correo@ejemplo.com" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        return authenticateUser(credentials, defaultPrisma);
      },
    }),
  ];

  // Proveedor Google OAuth (HU05-B): solo si hay credenciales reales.
  const googleCredentials = getGoogleCredentials();
  if (googleCredentials) {
    providers.unshift(
      GoogleProvider({
        clientId: googleCredentials.clientId,
        clientSecret: googleCredentials.clientSecret,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
          },
        },
      })
    );
  }

  return providers;
}

/**
 * Configuración completa de NextAuth para sesiones basadas en tokens JWT
 * Soporta autenticación local por credenciales y federada con Google OAuth (HU05-B).
 */

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas según .env.example
  },
  secret: getAuthSecret(),
  providers: buildAuthProviders(),
  callbacks: {
    // 1. Delegación a la lógica de negocio al iniciar sesión (HU05-B)
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const googleProfile: GoogleProfile = {
            id:
              profile?.sub ||
              (profile as any)?.id ||
              account.providerAccountId ||
              user.id,
            email: profile?.email || user.email,
            name: profile?.name || user.name,
            picture: (profile as any)?.picture || (profile as any)?.image || user.image,
            email_verified: (profile as any)?.email_verified ?? true,
          };

          // Delegación estricta a la capa de lógica de negocio (HU05-B LN)
          const activeGoogleService =
            (authOptions as any).__googleAuthService ?? activeGoogleAuthService;
          const result = await activeGoogleService.handleGoogleAuth(googleProfile);

          // Si la tabla linked_accounts está disponible, registrar persistencia ORM (HU05-BD)
          if (result?.user?.id && account.providerAccountId) {
            try {
              await linkAccount({
                userId: result.user.id,
                provider: "google",
                providerAccountId: account.providerAccountId,
              });
            } catch {
              // Silencioso si ya está vinculada o en pruebas unitarias
            }
          }

          // Inyectar datos normalizados del usuario de base de datos en el objeto de NextAuth
          user.id = result.user.id;
          user.email = result.user.email;
          user.name = result.user.full_name;
          (user as any).role = result.user.role;

          return true;
        } catch (error: any) {
          // Criterio 2: Manejo de error y redirección con mensaje claro
          if (
            error instanceof GoogleEmailNotProvidedError ||
            error?.code === "GOOGLE_EMAIL_NOT_PROVIDED"
          ) {
            return "/login?error=GoogleEmailNotProvided";
          }
          if (
            error instanceof UserInactiveError ||
            error?.code === "USER_INACTIVE"
          ) {
            return "/login?error=UserInactive";
          }
          return "/login?error=GoogleAuthFailed";
        }
      }

      return true;
    },

    // 2. Inyección de id y role en el token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },

    // 3. Transferencia de id y role desde el JWT a session.user
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as SRSRole) || "CLIENT";
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
};
