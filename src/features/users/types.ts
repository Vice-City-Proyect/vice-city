import { Prisma, role_name_enum } from "@prisma/client";

/** Datos requeridos para crear un usuario (HU01-BD) */
export type CreateUserData = {
  role_id: string;
  email: string;
  full_name: string;
  password_hash?: string;
  phone?: string;
  document_id?: string;
};

/** Usuario tal como lo devuelve Prisma (incluyendo la relación con roles) (HU01-BD) */
export type UserWithRole = Prisma.usersGetPayload<{
  include: { roles: true };
}>;

/** Usuario con datos necesarios para autenticación / login (HU02-BD) */
export type UserForLogin = {
  id: string;
  email: string;
  password_hash: string | null;
  role: role_name_enum | string;
  full_name: string;
  is_active: boolean;
};

// ---------------------------------------------------------------------------
// HU03-BD: Verificación de Correo Electrónico
// ---------------------------------------------------------------------------

/**
 * Tipos de token soportados por la tabla verification_tokens.
 */
export type TokenType = "email_verification" | "password_reset";

/**
 * Parámetros para la creación de un token en verification_tokens (HU03-BD)
 */
export type CreateVerificationTokenParams = {
  /** Identificador único del usuario (UUID) */
  userId: string;
  /** Token en texto plano opcional (si no se envía, se genera criptográficamente) */
  plainToken?: string;
  /** Fecha exacta de expiración (opcional, por defecto según el tipo de token) */
  expiresAt?: Date;
  /** Duración en horas si no se provee expiresAt (por defecto: 24) */
  expiresInHours?: number;
  /** Tipo de token: 'email_verification' (HU03) */
  type?: TokenType;
};

/**
 * Resultado de la creación de un token (HU03-BD)
 */
export type CreateVerificationTokenResult = {
  /** Registro del token persistido en la base de datos (con token_hash) */
  tokenRecord: Prisma.verification_tokensGetPayload<{}>;
  /** Token en texto plano para despachar por correo electrónico al usuario */
  plainToken: string;
};

/**
 * Token con la relación del usuario (HU03-BD)
 */
export type VerificationTokenWithUser = Prisma.verification_tokensGetPayload<{
  include: { users: true };
}>;

/**
 * Resultado de la confirmación atómica de correo (HU03-BD)
 */
export type ConfirmEmailResult = {
  /** Indica si la confirmación fue exitosa */
  success: boolean;
  /** Código de estado o motivo si no fue exitosa */
  reason?: "SUCCESS" | "NOT_FOUND" | "ALREADY_USED" | "EXPIRED" | "INVALID_INPUT";
  /** ID del usuario confirmado si la operación fue exitosa */
  userId?: string;
};
