/**
 * Módulo de Usuarios, Verificación, Roles y Auditoría (Features: Users)
 * Vice City - Soporte para HU01-BD a HU07-BD/API
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

// Repositorio de cuentas vinculadas de Google/OAuth (HU05-BD)
export {
  findLinkedAccount,
  linkAccount,
  getLinkedAccountsByUser,
  unlinkAccount,
} from "./linked-accounts.repository";

// Repositorio de gestión de roles y auditoría (HU07-BD)
export {
  listUsersWithRolePaged,
  countAdminUsers,
  findRole,
  updateUserRoleWithAudit,
  type ListUsersWithRoleParams,
  type PagedUsersResult,
  type UpdateUserRoleParams,
  type UpdateUserRoleResult,
} from "./role-management.repository";

// Servicio de Lógica de Negocio de Gestión de Roles (HU07-B LN)
export {
  RoleManagementService,
  roleManagementService,
  VALID_SRS_ROLES,
  type RequesterUser,
  type ChangeUserRoleInput,
  type ChangeUserRoleResult,
} from "./services/role-management.service";

// Errores de Dominio de Gestión de Roles (HU07-B)
export {
  RoleManagementError,
  UnauthorizedRoleManagerError,
  InvalidRoleError,
  CannotDemoteLastAdminError,
  TargetUserNotFoundError,
  RoleNotFoundError,
} from "./errors/role-management.errors";

// Esquemas de Validación Zod (HU07-B API)
export {
  changeUserRoleSchema,
  listUsersQuerySchema,
  type ChangeUserRoleInput as ChangeUserRoleSchemaInput,
  type ListUsersQueryInput,
} from "./schemas/role-management.schema";

// Tipos compartidos (HU01-BD a HU07-BD)
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
