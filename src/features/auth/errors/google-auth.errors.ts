/**
 * Errores de Dominio para Inicio de Sesión con Google (HU05-B)
 * Vice City - Features: Auth
 */

/**
 * Error base para fallos en la autenticación con Google.
 */
export class GoogleAuthError extends Error {
  public readonly code: string;

  constructor(message: string, code = "GOOGLE_AUTH_ERROR") {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
    Object.setPrototypeOf(this, GoogleAuthError.prototype);
  }
}

/**
 * Error lanzado cuando el perfil de Google no incluye un correo electrónico válido.
 * Cumple con el Criterio de Aceptación:
 * "Caso de error: Google sin correo disponible devuelve un error de negocio claro."
 */
export class GoogleEmailNotProvidedError extends GoogleAuthError {
  constructor(
    message = "No se pudo autenticar con Google porque la cuenta no proporcionó una dirección de correo electrónico."
  ) {
    super(message, "GOOGLE_EMAIL_NOT_PROVIDED");
    this.name = "GoogleEmailNotProvidedError";
    Object.setPrototypeOf(this, GoogleEmailNotProvidedError.prototype);
  }
}

/**
 * Error lanzado cuando la cuenta de usuario existe pero está marcada como inactiva (is_active = false).
 */
export class UserInactiveError extends GoogleAuthError {
  constructor(
    message = "Tu cuenta se encuentra inactiva. Por favor, comunícate con la administración del complejo."
  ) {
    super(message, "USER_INACTIVE");
    this.name = "UserInactiveError";
    Object.setPrototypeOf(this, UserInactiveError.prototype);
  }
}

/**
 * Error lanzado cuando el correo provisto por Google no está verificado en el proveedor.
 * Previene vulnerabilidades de Pre-Account Takeover.
 */
export class GoogleEmailNotVerifiedError extends GoogleAuthError {
  constructor(
    message = "El correo electrónico no ha sido verificado por Google. Por favor, verifica tu cuenta en Google antes de continuar."
  ) {
    super(message, "GOOGLE_EMAIL_NOT_VERIFIED");
    this.name = "GoogleEmailNotVerifiedError";
    Object.setPrototypeOf(this, GoogleEmailNotVerifiedError.prototype);
  }
}

/**
 * Error lanzado cuando faltan credenciales requeridas de Google OAuth o contienen placeholders.
 */
export class GoogleAuthConfigError extends GoogleAuthError {
  constructor(
    message = "Configuración de Google OAuth no disponible o incompleta en las variables de entorno."
  ) {
    super(message, "GOOGLE_AUTH_CONFIG_ERROR");
    this.name = "GoogleAuthConfigError";
    Object.setPrototypeOf(this, GoogleAuthConfigError.prototype);
  }
}


