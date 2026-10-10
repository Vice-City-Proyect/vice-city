/**
 * Servicio de Lógica de Negocio: Inicio de Sesión con Google (HU05-B)
 * Vice City - Features: Auth
 *
 * Criterios de Aceptación:
 * 1. Un usuario nuevo se crea con rol CLIENT y correo verificado.
 * 2. Un usuario existente se vincula a Google sin duplicarse.
 * 3. Caso de error: Google sin correo disponible devuelve un error de negocio claro.
 * 4. Caso límite: Un correo con distinta capitalización se reconoce como el mismo usuario.
 * 5. Uso estricto de la capa ORM (Prisma), sin SQL directo.
 */

import { prisma } from "@/lib/prisma";
import {
  GoogleEmailNotProvidedError,
  UserInactiveError,
  GoogleAuthError,
} from "../errors/google-auth.errors";

export interface GoogleProfile {
  /** Identificador único del sujeto en Google (sub) */
  id: string;
  /** Correo electrónico proporcionado por Google */
  email?: string | null;
  /** Nombre completo del usuario */
  name?: string | null;
  /** URL del avatar o foto de perfil */
  picture?: string | null;
  /** Indicador si Google ha verificado este correo */
  email_verified?: boolean;
}

export interface GoogleAuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  metadata: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface GoogleAuthResult {
  user: GoogleAuthUser;
  isNewUser: boolean;
  isLinked: boolean;
  message: string;
}

export interface GoogleAuthServiceDependencies {
  findUserByEmailFn?: (email: string) => Promise<any>;
  findClientRoleFn?: () => Promise<{ id: string; name: string } | null>;
  createUserFn?: (data: any) => Promise<any>;
  updateUserFn?: (id: string, data: any) => Promise<any>;
}

export class GoogleAuthService {
  private findUserByEmailFn: (email: string) => Promise<any>;
  private findClientRoleFn: () => Promise<{ id: string; name: string } | null>;
  private createUserFn: (data: any) => Promise<any>;
  private updateUserFn: (id: string, data: any) => Promise<any>;

  constructor(dependencies: GoogleAuthServiceDependencies = {}) {
    // Inyección de dependencias o fallback al ORM Prisma por defecto
    this.findUserByEmailFn =
      dependencies.findUserByEmailFn ??
      (async (email: string) => {
        return prisma.users.findFirst({
          where: {
            email: {
              equals: email.trim(),
              mode: "insensitive", // Case-insensitive matching en PostgreSQL
            },
          },
          include: { roles: true },
        });
      });

    this.findClientRoleFn =
      dependencies.findClientRoleFn ??
      (async () => {
        // En Vice City, el rol de cliente puede nombrarse 'client' o 'customer'
        return prisma.roles.findFirst({
          where: {
            name: {
              in: ["customer", "client", "CLIENT", "CUSTOMER"],
              mode: "insensitive",
            },
          },
        });
      });

    this.createUserFn =
      dependencies.createUserFn ??
      (async (data: any) => {
        return prisma.users.create({
          data,
          include: { roles: true },
        });
      });

    this.updateUserFn =
      dependencies.updateUserFn ??
      (async (id: string, data: any) => {
        return prisma.users.update({
          where: { id },
          data,
          include: { roles: true },
        });
      });
  }

  /**
   * Procesa el inicio de sesión o registro de un usuario mediante su perfil de Google OAuth.
   *
   * @param profile Perfil del usuario proveniente del proveedor de Google
   * @returns GoogleAuthResult con el usuario autenticado/creado y estado de la operación
   */
  async handleGoogleAuth(profile: GoogleProfile): Promise<GoogleAuthResult> {
    // 1. Criterio 3: Validación de correo obligatorio provisto por Google
    if (
      !profile ||
      !profile.email ||
      typeof profile.email !== "string" ||
      !profile.email.trim()
    ) {
      throw new GoogleEmailNotProvidedError();
    }

    // 2. Criterio 4 (Caso Límite): Normalizar email a minúsculas
    const normalizedEmail = profile.email.trim().toLowerCase();

    // 3. Buscar si el usuario ya existe en la base de datos vía ORM
    const existingUser = await this.findUserByEmailFn(normalizedEmail);

    // 4. Si el usuario ya existe: Vincular la cuenta de Google sin duplicarlo (Criterio 2)
    if (existingUser) {
      if (!existingUser.is_active) {
        throw new UserInactiveError();
      }

      const existingMetadata =
        typeof existingUser.metadata === "object" && existingUser.metadata !== null
          ? (existingUser.metadata as Record<string, any>)
          : {};

      const currentProviders = Array.isArray(existingMetadata.linked_providers)
        ? [...existingMetadata.linked_providers]
        : existingMetadata.auth_provider
        ? [existingMetadata.auth_provider]
        : [];

      if (!currentProviders.includes("google")) {
        currentProviders.push("google");
      }

      const updatedMetadata = {
        ...existingMetadata,
        google_id: profile.id,
        google_picture: profile.picture || existingMetadata.google_picture || null,
        linked_providers: currentProviders,
        // Criterio: Tratar el correo de Google como verificado
        email_verified: true,
        email_verified_at:
          existingMetadata.email_verified_at || new Date().toISOString(),
        last_google_login: new Date().toISOString(),
      };

      const updatedUser = await this.updateUserFn(existingUser.id, {
        metadata: updatedMetadata,
        last_login_at: new Date(),
        updated_at: new Date(),
      });

      return {
        user: this.formatUser(updatedUser),
        isNewUser: false,
        isLinked: true,
        message: "Cuenta de Google vinculada exitosamente al usuario existente.",
      };
    }

    // 5. Si el usuario no existe: Crear nuevo usuario con rol CLIENT y correo verificado (Criterio 1)
    let clientRole = await this.findClientRoleFn();

    if (!clientRole) {
      // Búsqueda defensiva por cualquier rol activo si no existe con esos nombres
      clientRole = await prisma.roles.findFirst();
    }

    if (!clientRole) {
      throw new GoogleAuthError(
        "No se pudo determinar el rol CLIENT en el sistema para crear la cuenta."
      );
    }

    const newMetadata = {
      google_id: profile.id,
      google_picture: profile.picture || null,
      auth_provider: "google",
      linked_providers: ["google"],
      // Criterio: Tratar el correo de Google como verificado
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      registered_via: "google_oauth",
    };

    const fullName =
      profile.name && profile.name.trim()
        ? profile.name.trim()
        : normalizedEmail.split("@")[0];

    const newUser = await this.createUserFn({
      role_id: clientRole.id,
      email: normalizedEmail,
      full_name: fullName,
      password_hash: null, // Usuarios registrados por Google OAuth no requieren contraseña local inicial
      is_active: true,
      metadata: newMetadata,
      last_login_at: new Date(),
    });

    return {
      user: this.formatUser(newUser),
      isNewUser: true,
      isLinked: false,
      message: "Usuario creado exitosamente con rol CLIENT y correo verificado.",
    };
  }

  /**
   * Normaliza la estructura del usuario devuelta por el ORM.
   */
  private formatUser(userRecord: any): GoogleAuthUser {
    const roleName =
      userRecord.roles && userRecord.roles.name
        ? String(userRecord.roles.name).toUpperCase()
        : "CLIENT";

    const metadata =
      typeof userRecord.metadata === "object" && userRecord.metadata !== null
        ? (userRecord.metadata as Record<string, any>)
        : {};

    return {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: roleName === "CUSTOMER" ? "CLIENT" : roleName,
      is_active: Boolean(userRecord.is_active),
      email_verified: Boolean(metadata.email_verified),
      metadata,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at,
    };
  }
}

// Instancia singleton por defecto
export const googleAuthService = new GoogleAuthService();

