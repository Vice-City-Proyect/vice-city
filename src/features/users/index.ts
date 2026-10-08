/**
 * Módulo de Usuarios, Verificación, Recuperación y Cuentas Vinculadas (Features: Users)
 * Vice City - Soporte para HU01-BD, HU02-BD, HU03-BD, HU04-BD y HU05-BD
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

// Repositorio de cuentas vinculadas externas (HU05-BD)
export {
  findLinkedAccount,
  linkAccount,
  getLinkedAccountsByUser,
  unlinkAccount,
} from "./linked-accounts.repository";

// Tipos compartidos (HU01-BD a HU05-BD)
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
  LinkedAccountWithUser,
  LinkAccountParams,
  LinkAccountResult,
} from "./types";

