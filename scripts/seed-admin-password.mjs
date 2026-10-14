/**
 * Validación de ADMIN_SEED_PASSWORD para scripts/seed-admin.mjs (VCP-86).
 *
 * Es una función pura (sin acceso a base de datos) para que pueda probarse y para que
 * el seed se detenga ANTES de abrir cualquier conexión si la configuración es inválida.
 */

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

// Valores conocidos o de ejemplo que nunca deben usarse como contraseña real.
const REJECTED_VALUES = new Set(["vicecity123*", "vicecity123", "changeme", "password"]);

/**
 * @param {string | undefined | null} rawPassword valor de process.env.ADMIN_SEED_PASSWORD
 * @returns {string} la contraseña validada
 * @throws {Error} si falta, está vacía, es solo espacios, es corta, o es un valor de ejemplo
 */
export function validateAdminSeedPassword(rawPassword) {
  if (rawPassword === undefined || rawPassword === null || rawPassword === "") {
    throw new Error(
      "Seguridad: debe definirse la variable ADMIN_SEED_PASSWORD en tu .env local antes de ejecutar el seed."
    );
  }

  if (rawPassword.trim() === "") {
    throw new Error(
      "Seguridad: ADMIN_SEED_PASSWORD no puede estar vacía ni contener solo espacios."
    );
  }

  const password = rawPassword.trim();

  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `Seguridad: ADMIN_SEED_PASSWORD debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres (sin contar espacios al inicio o al final).`
    );
  }

  // Marcadores tipo "<define-una-contraseña...>" copiados de .env.example sin modificar.
  if (/^<.*>$/.test(password) || REJECTED_VALUES.has(password.toLowerCase())) {
    throw new Error(
      "Seguridad: ADMIN_SEED_PASSWORD es un valor de ejemplo o conocido; define una contraseña propia."
    );
  }

  return password;
}
