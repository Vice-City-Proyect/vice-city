/**
 * Módulo de Usuarios, Verificación y Recuperación de Contraseña (Features: Users)
 * Vice City - Soporte para HU01-BD, HU02-BD, HU03-BD y HU04-BD
 */

// Repositorio principal de usuarios (HU01-BD y HU02-BD)
export {
  createUser,
  findUserByEmail,
  findUserForLogin,
  findUserForAuth,
  normalizeRoleName,
  isUniqueConstraintError,
} from "./user.repository";

// Repositorio de verificación de correo y tokens (HU03-BD)
export {
  hashVerificationToken,
  createVerificationToken,
  getVerificationToken,
  markTokenAsUsed,
  markUserAsVerified,
  confirmEmailWithToken,
} from "./verification.repository";

// Repositorio de recuperación de contraseña (HU04-BD)
export {
  createPasswordResetToken,
  getPasswordResetToken,
  invalidatePasswordResetTokens,
  resetPassword,
} from "./password-reset.repository";

// Tipos compartidos (HU01-BD a HU04-BD)
export type {
  CreateUserData,
  UserWithRole,
  UserForLogin,
  TokenType,
  CreateVerificationTokenParams,
  CreateVerificationTokenResult,
  VerificationTokenWithUser,
  ConfirmEmailResult,
  CreatePasswordResetTokenParams,
  CreatePasswordResetTokenResult,
  ResetPasswordResult,
} from "./types";
