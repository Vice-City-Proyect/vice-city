import { Prisma, role_name_enum } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateUserData, UserWithRole, UserForLogin } from "./types";

/**
 * Normaliza el nombre del rol al estándar del enum del sistema (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR).
 *
 * @param roleName Nombre del rol proveniente de la tabla roles
 * @returns Rol normalizado conforme al enum role_name_enum
 */
export function normalizeRoleName(roleName: string): role_name_enum | string {
  if (!roleName || typeof roleName !== "string") {
    return role_name_enum.CLIENT;
  }

  const normalized = roleName.trim().toUpperCase();

  switch (normalized) {
    case "ADMIN":
      return role_name_enum.ADMIN;
    case "CUSTOMER":
    case "CLIENT":
    case "CLIENTE":
      return role_name_enum.CLIENT;
    case "TICKET_SELLER":
    case "VENDEDOR":
      return role_name_enum.TICKET_SELLER;
    case "QR_VALIDATOR":
    case "VALIDADOR_QR":
    case "LECTOR_QR":
      return role_name_enum.QR_VALIDATOR;
    default:
      return normalized;
  }
}

/**
 * Crea un usuario en la base de datos (HU01-BD).
 *
 * La unicidad del email (case-insensitive) se garantiza a nivel de base de datos
 * mediante el índice `users_email_lower_uidx` → `UNIQUE(lower(email))`.
 *
 * Si el email ya existe (sin importar mayúsculas/minúsculas), la BD rechaza
 * la inserción con un error de constraint único (P2002).
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
 * Busca un usuario por email sin distinguir mayúsculas/minúsculas (HU01-BD).
 *
 * Usa `mode: "insensitive"` de Prisma, que genera `ILIKE` en PostgreSQL.
 * Devuelve `null` si no se encuentra o si la entrada es inválida.
 */
export async function findUserByEmail(
  email: string,
): Promise<UserWithRole | null> {
  if (!email || typeof email !== "string" || !email.trim()) {
    return null;
  }

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
 * Busca un usuario por correo electrónico optimizado para el flujo de login (HU02-BD).
 *
 * @param email Correo electrónico a consultar
 * @returns Objeto UserForLogin o null si el usuario no existe
 */
export async function findUserForLogin(
  email: string,
): Promise<UserForLogin | null> {
  if (!email || typeof email !== "string" || !email.trim()) {
    return null;
  }

  const cleanEmail = email.trim();

  try {
    const user = await prisma.users.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        password_hash: true,
        full_name: true,
        is_active: true,
        roles: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      role: normalizeRoleName(user.roles.name),
      full_name: user.full_name,
      is_active: user.is_active,
    };
  } catch (error) {
    console.error("Error al consultar usuario para login:", error);
    return null;
  }
}

/**
 * Alias de findUserForLogin para flujos de autenticación
 */
export const findUserForAuth = findUserForLogin;

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
