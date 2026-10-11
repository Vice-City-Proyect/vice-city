/**
 * Módulo de Usuarios, Verificación, Roles y Auditoría (Features: Users)
 * Vice City - Soporte para HU01-BD a HU07-BD/API
 */

// Repositorios base de usuarios, verificación, recuperación y OAuth
export * from "./user.repository";
export * from "./verification.repository";
export * from "./password-reset.repository";
export * from "./linked-accounts.repository";
export * from "./types";

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
  type RoleServiceDependencies,
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
