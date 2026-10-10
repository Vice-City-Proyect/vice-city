import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
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

  // 4. Validar que el rol del usuario pertenezca estrictamente al SRS
  const roleName = user.roles?.name ? user.roles.name.toUpperCase() : "";

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
 * Configuración completa de NextAuth para sesiones basadas en tokens JWT
 * Soporta autenticación local por credenciales y federada con Google OAuth (HU05-B).
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas según configuración del proyecto
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "default_super_secret_jwt_key_vice_city_2026",
  providers: [
    // Proveedor Google OAuth (HU05-B)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "google_client_id_placeholder",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || "google_client_secret_placeholder",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
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
  ],
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
          const result = await googleAuthService.handleGoogleAuth(googleProfile);

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

    // 2. Inyección de id y role en el token JWT (Criterio 1)
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },

    // 3. Transferencia de id y role desde el JWT a session.user (Criterio 1)
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
    error: "/login",
  },
};

