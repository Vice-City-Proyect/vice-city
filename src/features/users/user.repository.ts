import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateUserData, UserWithRole } from "./types";

/**
 * Crea un usuario en la base de datos.
 *
 * La unicidad del email (case-insensitive) se garantiza a nivel de base de datos
 * mediante el índice `users_email_lower_uidx` → `UNIQUE(lower(email))`.
 *
 * Si el email ya existe (sin importar mayúsculas/minúsculas), la BD rechaza
 * la inserción con un error de constraint único.
 */
export async function createUser(data: CreateUserData): Promise<UserWithRole> {
  return prisma.users.create({
    data: {
      role_id: data.role_id,
      email: data.email.trim().toLowerCase(),
      full_name: data.full_name.trim(),
      password_hash: data.password_hash,
      phone: data.phone?.trim() || null,
      document_id: data.document_id?.trim() || null,
    },
    include: { roles: true },
  });
}

/**
 * Busca un usuario por email sin distinguir mayúsculas/minúsculas.
 *
 * Usa `mode: "insensitive"` de Prisma, que genera `ILIKE` en PostgreSQL.
 * Devuelve `null` si no se encuentra.
 */
export async function findUserByEmail(
  email: string,
): Promise<UserWithRole | null> {
  return prisma.users.findFirst({
    where: {
      email: {
        equals: email.trim(),
        mode: "insensitive",
      },
    },
    include: { roles: true },
  });
}

/**
 * Verifica si un error de Prisma corresponde a una violación de unicidad.
 *
 * Útil para detectar emails duplicados sin exponer detalles internos.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
