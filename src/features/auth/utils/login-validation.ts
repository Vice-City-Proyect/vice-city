/**
 * @file src/features/auth/utils/login-validation.ts
 * @description Validaciones del lado del cliente para el formulario de login.
 *
 * Contiene únicamente reglas de formato e integridad básica.
 * No implementa reglas de negocio del servidor (ej. existencia del usuario,
 * bloqueo de cuenta), que se gestionan en la capa de Backend (HU02-B).
 *
 * @see HU-02F — Formulario e Interfaz de Login
 */

/** Mensajes de error mostrados al usuario. */
export const LOGIN_MESSAGES = {
  EMAIL_REQUIRED: 'El correo es obligatorio.',
  EMAIL_INVALID: 'Ingresa un formato de correo válido.',
  PASSWORD_REQUIRED: 'La contraseña es obligatoria.',
  GENERIC_INVALID_CREDENTIALS: 'Correo o contraseña incorrectos. Verifica tus datos.',
  EMAIL_NOT_VERIFIED: 'Debes confirmar tu correo electrónico antes de iniciar sesión.',
  INVALID_ROLE: 'El usuario no posee un rol válido del sistema para iniciar sesión.',
  USER_INACTIVE: 'Tu cuenta está desactivada. Contacta al administrador del complejo.',
} as const;

/** Resultado de la validación del formulario. */
export interface LoginValidationErrors {
  email?: string;
  password?: string;
}

/**
 * Valida los campos del formulario de login.
 *
 * Reglas aplicadas:
 * - `email`: obligatorio y con formato válido (`usuario@dominio.ext`).
 * - `password`: obligatorio.
 *
 * @param email    Valor del campo correo electrónico.
 * @param password Valor del campo contraseña.
 * @returns Objeto con los errores encontrados. Objeto vacío si no hay errores.
 *
 * @example
 * const errors = validateLoginForm('', '');
 * // { email: 'El correo es obligatorio.', password: 'La contraseña es obligatoria.' }
 */
export function validateLoginForm(
  email: string,
  password: string
): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  // ── Validación de correo ──────────────────────────────────────────────────
  if (!email.trim()) {
    errors.email = LOGIN_MESSAGES.EMAIL_REQUIRED;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = LOGIN_MESSAGES.EMAIL_INVALID;
  }

  // ── Validación de contraseña ──────────────────────────────────────────────
  if (!password) {
    errors.password = LOGIN_MESSAGES.PASSWORD_REQUIRED;
  }

  return errors;
}

/**
 * Indica si un objeto de errores de validación no contiene ningún error.
 *
 * @param errors Resultado de `validateLoginForm`.
 * @returns `true` si el formulario es válido.
 */
export function isLoginFormValid(errors: LoginValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * Mapea y normaliza el mensaje de error de autenticación devuelto por NextAuth o por la URL.
 * Preserva la seguridad contra la enumeración de usuarios mientras informa claramente si la cuenta
 * requiere confirmación de correo electrónico previa (permitiendo el reenvío).
 *
 * @param error Código o mensaje de error recibido tras el intento de autenticación.
 * @returns Mensaje descriptivo para mostrar en la interfaz de usuario.
 */
export function resolveLoginErrorMessage(error: string | null | undefined): string {
  if (!error || typeof error !== 'string') {
    return LOGIN_MESSAGES.GENERIC_INVALID_CREDENTIALS;
  }

  let decoded = error;
  try {
    decoded = decodeURIComponent(error);
  } catch {
    decoded = error;
  }

  const lower = decoded.toLowerCase();

  // 1. Cuentas creadas que no han verificado su correo electrónico (H-AUTH-02)
  if (
    lower.includes('confirmar tu correo') ||
    lower.includes('email_not_verified') ||
    lower.includes('emailnotverified') ||
    decoded === 'GoogleEmailNotVerified' ||
    decoded === 'EmailNotVerified'
  ) {
    return LOGIN_MESSAGES.EMAIL_NOT_VERIFIED;
  }

  // 2. Rol no autorizado en el sistema
  if (lower.includes('no posee un rol válido') || lower.includes('sin_rol')) {
    return LOGIN_MESSAGES.INVALID_ROLE;
  }

  // 3. Cuenta desactivada por el administrador
  if (decoded === 'UserInactive' || lower.includes('desactivad')) {
    return LOGIN_MESSAGES.USER_INACTIVE;
  }

  // 4. Credenciales erróneas o usuario inexistente (mensaje genérico anti-enumeración)
  return LOGIN_MESSAGES.GENERIC_INVALID_CREDENTIALS;
}
