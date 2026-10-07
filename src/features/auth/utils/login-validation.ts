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
const MESSAGES = {
  EMAIL_REQUIRED: 'El correo es obligatorio.',
  EMAIL_INVALID: 'Ingresa un formato de correo válido.',
  PASSWORD_REQUIRED: 'La contraseña es obligatoria.',
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
    errors.email = MESSAGES.EMAIL_REQUIRED;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = MESSAGES.EMAIL_INVALID;
  }

  // ── Validación de contraseña ──────────────────────────────────────────────
  if (!password) {
    errors.password = MESSAGES.PASSWORD_REQUIRED;
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
