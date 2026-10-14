/**
 * Piezas del seed de administrador separadas de la conexión real para poder probarlas con
 * un cliente de Prisma simulado (VCP-86).
 */

/**
 * Genera el hash de la contraseña: primero con pgcrypto en la base; si la base restringe
 * CREATE EXTENSION (o falla la consulta), usa bcryptjs como respaldo.
 *
 * @param {object} prisma cliente de Prisma (o simulado)
 * @param {string} plainPassword contraseña ya validada
 * @param {() => Promise<{ hash?: Function } | null>} [loadBcrypt] cargador de bcryptjs (inyectable)
 */
export async function hashAdminPassword(
  prisma,
  plainPassword,
  loadBcrypt = () => import("bcryptjs").catch(() => null)
) {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    const hashResult = await prisma.$queryRawUnsafe(
      `SELECT crypt($1, gen_salt('bf', 10)) as hash;`,
      plainPassword
    );
    return hashResult[0].hash;
  } catch {
    const bcrypt = await loadBcrypt();
    if (bcrypt && bcrypt.hash) {
      return bcrypt.hash(plainPassword, 10);
    }
    throw new Error("No se pudo generar el hash de la contraseña.");
  }
}

/**
 * Crea el administrador solo si no existe. Si ya existe NO modifica su contraseña
 * (ni ningún otro dato): devuelve su id con created = false.
 *
 * @returns {Promise<{ userId: string, created: boolean }>}
 */
export async function ensureAdminUser(prisma, { roleId, email, fullName, passwordHash }) {
  const existingUser = await prisma.users.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
  });

  if (existingUser) {
    return { userId: existingUser.id, created: false };
  }

  const newUser = await prisma.users.create({
    data: {
      role_id: roleId,
      email,
      full_name: fullName,
      password_hash: passwordHash,
      is_active: true,
      metadata: {
        immutable: true,
        system_root: true,
        description: "Usuario administrador principal del sistema",
      },
    },
  });
  return { userId: newUser.id, created: true };
}
