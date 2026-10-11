/**
 * Errores de Dominio para la Recuperación de Contraseña (HU04-B)
 * Vice City - Lógica de Negocio
 */

/**
 * Error lanzado cuando un token de recuperación ha superado su ventana de expiración (1 hora).
 */
export class PasswordResetTokenExpiredError extends Error {
  public readonly code = "TOKEN_EXPIRED";

  constructor(message = "El enlace de recuperación ha expirado. Por favor, solicita uno nuevo.") {
    super(message);
    this.name = "PasswordResetTokenExpiredError";
    Object.setPrototypeOf(this, PasswordResetTokenExpiredError.prototype);
  }
}

/**
 * Error lanzado cuando un token no existe, ya fue consumido o está alterado.
 */
export class InvalidPasswordResetTokenError extends Error {
  public readonly code = "INVALID_TOKEN";

  constructor(message = "El enlace de recuperación no es válido o ya fue utilizado.") {
    super(message);
    this.name = "InvalidPasswordResetTokenError";
    Object.setPrototypeOf(this, InvalidPasswordResetTokenError.prototype);
  }
}

/**
 * Error lanzado cuando el correo electrónico no coincide con ningún usuario activo.
 */
export class UserNotFoundError extends Error {
  public readonly code = "USER_NOT_FOUND";

  constructor(message = "No existe una cuenta registrada con el correo electrónico proporcionado.") {
    super(message);
    this.name = "UserNotFoundError";
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

/**
 * Error lanzado cuando la nueva contraseña no cumple con las políticas mínimas de seguridad.
 */
export class WeakPasswordError extends Error {
  public readonly code = "WEAK_PASSWORD";

  constructor(message = "La nueva contraseña debe tener al menos 8 caracteres.") {
    super(message);
    this.name = "WeakPasswordError";
    Object.setPrototypeOf(this, WeakPasswordError.prototype);
  }
}

