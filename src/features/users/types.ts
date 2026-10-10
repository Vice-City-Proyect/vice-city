import { Prisma, role_name_enum } from "@prisma/client";

/**
 * Datos requeridos para crear un usuario en la base de datos (HU01-BD)
 */
export type CreateUserData = {
  role_id: string;
  email: string;
  full_name: string;
  password_hash?: string;
  phone?: string;
  document_id?: string;
};

/**
 * Usuario tal como lo devuelve Prisma (incluyendo la relación con roles) (HU01-BD)
 */
export type UserWithRole = Prisma.usersGetPayload<{
  include: { roles: true };
}>;

/**
 * Estructura de usuario optimizada para la consulta de login (HU02-BD)
 */
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
 * Permite reutilizar la misma tabla para distintos flujos de seguridad.
 */
export type TokenType = "email_verification" | "password_reset";

/**
 * Parámetros para la creación de un token en verification_tokens (HU03/HU04-BD)
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
  /** Tipo de token: 'email_verification' (HU03) o 'password_reset' (HU04) */
  type?: TokenType;
};

/**
 * Resultado de la creación de un token (HU03/HU04-BD)
 */
export type CreateVerificationTokenResult = {
  /** Registro del token persistido en la base de datos (con token_hash) */
  tokenRecord: Prisma.verification_tokensGetPayload<{}>;
  /** Token en texto plano para despachar por correo electrónico al usuario */
  plainToken: string;
};

/**
 * Token con la relación del usuario (HU03/HU04-BD)
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

// ---------------------------------------------------------------------------
// HU04-BD: Recuperación de Contraseña
// ---------------------------------------------------------------------------

/**
 * Parámetros para crear un token específico de recuperación de contraseña (HU04-BD)
 */
export type CreatePasswordResetTokenParams = {
  /** Identificador único del usuario (UUID) al que pertenece el token */
  userId: string;
  /**
   * Token en texto plano (opcional). Si no se envía, se genera
   * criptográficamente con 32 bytes seguros (256 bits).
   */
  plainToken?: string;
  /**
   * Duración en horas del token de recuperación. Por defecto: 1 hora.
   * Los tokens de recuperación deben tener vida corta (máximo 1 hora)
   * para minimizar la ventana de ataque.
   */
  expiresInHours?: number;
};

/**
 * Resultado de la creación de un token de recuperación (HU04-BD)
 */
export type CreatePasswordResetTokenResult = {
  /** Registro del token persistido en la base de datos */
  tokenRecord: Prisma.verification_tokensGetPayload<{}>;
  /** Token en texto plano para incluir en el enlace de restablecimiento enviado por email */
  plainToken: string;
};

/**
 * Resultado de la operación de restablecimiento atómico de contraseña (HU04-BD)
 */
export type ResetPasswordResult = {
  /** Indica si el restablecimiento fue exitoso */
  success: boolean;
  /**
   * Código de estado detallado del resultado:
   * - SUCCESS: Contraseña restablecida correctamente
   * - NOT_FOUND: Token no existe en la base de datos
   * - ALREADY_USED: Token ya fue consumido anteriormente
   * - EXPIRED: Token superó su ventana de validez
   * - INVALID_INPUT: Email o token vacío o inválido
   */
  reason?: "SUCCESS" | "NOT_FOUND" | "ALREADY_USED" | "EXPIRED" | "INVALID_INPUT";
  /** ID del usuario cuya contraseña fue restablecida (si fue exitoso) */
  userId?: string;
};

// ---------------------------------------------------------------------------
// HU05-BD: Cuentas Vinculadas Externas (Google / OAuth)
// ---------------------------------------------------------------------------

/**
 * Registro de cuenta vinculada incluyendo la relación con el usuario
 */
export type LinkedAccountWithUser = Prisma.linked_accountsGetPayload<{
  include: { users: true };
}>;

/**
 * Parámetros requeridos para vincular una cuenta externa a un usuario
 */
export type LinkAccountParams = {
  /** UUID del usuario en el sistema */
  userId: string;
  /** Nombre del proveedor externo (ej. 'google') */
  provider: string;
  /** Identificador de la cuenta provisto por el servicio externo (ej. sub/id de Google) */
  providerAccountId: string;
};

/**
 * Resultado de la vinculación de una cuenta externa
 */
export type LinkAccountResult = {
  /** Indica si la cuenta se vinculó exitosamente */
  success: boolean;
  /** Código detallado del resultado */
  reason?:
    | "SUCCESS"
    | "ALREADY_LINKED_TO_SAME_USER"
    | "ALREADY_LINKED_TO_OTHER_USER"
    | "USER_NOT_FOUND"
    | "INVALID_INPUT";
  /** Registro de la cuenta vinculada creada o encontrada */
  account?: Prisma.linked_accountsGetPayload<{}>;
};

