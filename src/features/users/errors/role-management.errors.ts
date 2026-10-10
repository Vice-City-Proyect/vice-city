/**
 * Errores de Dominio para la Gestión de Roles (HU07-B)
 * Vice City - Features: Users / Roles
 */

export class RoleManagementError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "ROLE_MANAGEMENT_ERROR", statusCode = 400) {
    super(message);
    this.name = "RoleManagementError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, RoleManagementError.prototype);
  }
}

/**
 * Lanzado cuando el solicitante no posee el rol ADMIN para gestionar roles.
 * Código HTTP correspondiente: 403 Forbidden.
 */
export class UnauthorizedRoleManagerError extends RoleManagementError {
  constructor(
    message = "Acceso denegado: solo los administradores pueden gestionar o asignar roles."
  ) {
    super(message, "FORBIDDEN_ROLE_MANAGEMENT", 403);
    this.name = "UnauthorizedRoleManagerError";
    Object.setPrototypeOf(this, UnauthorizedRoleManagerError.prototype);
  }
}

/**
 * Lanzado cuando se intenta asignar un rol que no pertenece a los cuatro del SRS
 * (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR).
 */
export class InvalidRoleError extends RoleManagementError {
  constructor(
    roleName: string,
    message = `El rol '${roleName}' no es válido. Los roles autorizados por el SRS son: ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR.`
  ) {
    super(message, "INVALID_ROLE", 400);
    this.name = "InvalidRoleError";
    Object.setPrototypeOf(this, InvalidRoleError.prototype);
  }
}

/**
 * Lanzado cuando se intenta quitar el rol al último administrador activo del sistema.
 * Cumple con el Criterio de Aceptación:
 * "Caso límite: el último ADMIN no puede quitarse su propio rol."
 */
export class CannotDemoteLastAdminError extends RoleManagementError {
  constructor(
    message = "Operación rechazada: no es posible revocar el rol al único administrador registrado en el sistema."
  ) {
    super(message, "CANNOT_DEMOTE_LAST_ADMIN", 400);
    this.name = "CannotDemoteLastAdminError";
    Object.setPrototypeOf(this, CannotDemoteLastAdminError.prototype);
  }
}

/**
 * Lanzado cuando el usuario objetivo no existe en la base de datos.
 */
export class TargetUserNotFoundError extends RoleManagementError {
  constructor(
    userId: string,
    message = `El usuario con identificador '${userId}' no existe en el sistema.`
  ) {
    super(message, "USER_NOT_FOUND", 404);
    this.name = "TargetUserNotFoundError";
    Object.setPrototypeOf(this, TargetUserNotFoundError.prototype);
  }
}

/**
 * Lanzado cuando el rol especificado no existe en la tabla de roles de la BD.
 */
export class RoleNotFoundError extends RoleManagementError {
  constructor(
    roleName: string,
    message = `El rol '${roleName}' no se encuentra configurado en la base de datos.`
  ) {
    super(message, "ROLE_NOT_FOUND", 404);
    this.name = "RoleNotFoundError";
    Object.setPrototypeOf(this, RoleNotFoundError.prototype);
  }
}
