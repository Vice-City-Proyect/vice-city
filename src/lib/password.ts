import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 10;

/**
 * Encripta una contraseña en texto plano utilizando bcrypt.
 * @param password Contraseña en texto plano.
 * @param saltRounds Número de rondas de salado (por defecto 10).
 * @returns Hash de la contraseña.
 */
export async function hashPassword(
  password: string,
  saltRounds: number = DEFAULT_SALT_ROUNDS
): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("La contraseña debe ser una cadena de texto válida");
  }
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compara una contraseña en texto plano contra su hash encriptado.
 * @param password Contraseña en texto plano.
 * @param hash Hash almacenado previamente.
 * @returns True si coinciden, false en caso contrario.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

