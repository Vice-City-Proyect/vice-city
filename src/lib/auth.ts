import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";
import { comparePassword } from "./password";
import type { SRSRole } from "../types/next-auth";

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
 * Configuración completa de NextAuth para sesiones basadas en tokens JWT
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas según .env.example
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "default_super_secret_jwt_key",
  providers: [
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
    // Inyecta id y role dentro del token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    // Transfiere id y role desde el token JWT a la sesión del usuario
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as SRSRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

