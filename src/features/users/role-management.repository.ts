/**
 * Repositorio ORM de Gestión de Roles y Auditoría (HU07-BD)
 * Vice City - Features: Users / Roles
 *
 * Criterios de Aceptación:
 * 1. Listar y actualizar roles funciona contra Supabase vía Prisma ORM.
 * 2. Transaccionalidad atómica: El cambio de rol y el registro de auditoría
 *    se guardan juntos en una transacción o no se guarda ninguno.
 * 3. Caso de error: Actualizar un usuario inexistente devuelve un resultado controlado.
 * 4. Caso límite: Dos cambios simultáneos sobre el mismo usuario no dejan datos inconsistentes.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface ListUsersWithRoleParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface PagedUsersResult {
  users: Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    role_id: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateUserRoleParams {
  targetUserId: string;
  newRoleId: string;
  adminUserId: string;
  ipAddress?: string | null;
  reason?: string | null;
  details?: Record<string, any>;
}

export interface UpdateUserRoleResult {
  success: boolean;
  reason?: "SUCCESS" | "USER_NOT_FOUND" | "ROLE_NOT_FOUND" | "TRANSACTION_FAILED";
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    role_id: string;
  };
  auditLog?: {
    id: string;
    action: string;
    entity: string;
    entity_id: string | null;
    created_at: Date;
  };
}

/**
 * Normaliza el nombre del rol a formato estándar del SRS
 */
export function normalizeRoleName(name?: string | null): string {
  if (!name) return "CLIENT";
  const upper = name.trim().toUpperCase();
  if (upper === "CUSTOMER") return "CLIENT";
  return upper;
}

/**
 * Lista usuarios con su rol actual de forma paginada y con filtros de búsqueda opcionales.
 */
export async function listUsersWithRolePaged(
  params: ListUsersWithRoleParams = {},
  db = prisma
): Promise<PagedUsersResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
  const skip = (page - 1) * limit;

  const where: Prisma.usersWhereInput = {};

  // Filtro de texto por nombre o email
  if (params.search && params.search.trim()) {
    const cleanSearch = params.search.trim();
    where.OR = [
      { email: { contains: cleanSearch, mode: "insensitive" } },
      { full_name: { contains: cleanSearch, mode: "insensitive" } },
    ];
  }

  // Filtro por rol
  if (params.role && params.role.trim()) {
    const cleanRole = params.role.trim();
    const roleCandidates =
      cleanRole.toUpperCase() === "CLIENT"
        ? ["CLIENT", "CUSTOMER", "client", "customer"]
        : [cleanRole, cleanRole.toLowerCase(), cleanRole.toUpperCase()];

    where.roles = {
      name: { in: roleCandidates },
    };
  }

  const [total, userRecords] = await Promise.all([
    db.users.count({ where }),
    db.users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: { roles: true },
    }),
  ]);

  const users = userRecords.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: normalizeRoleName(u.roles?.name),
    role_id: u.role_id,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Cuenta la cantidad actual de usuarios activos con rol ADMIN en el sistema.
 */
export async function countAdminUsers(db = prisma): Promise<number> {
  return db.users.count({
    where: {
      is_active: true,
      roles: {
        name: {
          in: ["admin", "ADMIN"],
          mode: "insensitive",
        },
      },
    },
  });
}

/**
 * Busca un rol en la base de datos por su identificador único o nombre del SRS.
 */
export async function findRole(
  identifier: string,
  db = prisma
): Promise<{ id: string; name: string } | null> {
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    return null;
  }

  const clean = identifier.trim();

  // Búsqueda por UUID si tiene formato UUID
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

  if (isUuid) {
    const roleById = await db.roles.findUnique({
      where: { id: clean },
    });
    if (roleById) {
      return { id: roleById.id, name: normalizeRoleName(roleById.name) };
    }
  }

  // Búsqueda por nombre
  const candidates =
    clean.toUpperCase() === "CLIENT"
      ? ["CLIENT", "CUSTOMER", "client", "customer"]
      : [clean, clean.toLowerCase(), clean.toUpperCase()];

  const roleByName = await db.roles.findFirst({
    where: {
      name: { in: candidates },
    },
  });

  if (!roleByName) return null;

  return {
    id: roleByName.id,
    name: normalizeRoleName(roleByName.name),
  };
}

/**
 * Actualiza el rol de un usuario y registra la entrada en audit_logs dentro
 * de una misma transacción atómica (Criterio 2).
 */
export async function updateUserRoleWithAudit(
  params: UpdateUserRoleParams,
  db = prisma
): Promise<UpdateUserRoleResult> {
  const { targetUserId, newRoleId, adminUserId, ipAddress, reason, details } = params;

  if (!targetUserId || !newRoleId || !adminUserId) {
    return { success: false, reason: "TRANSACTION_FAILED" };
  }

  try {
    return await db.$transaction(async (tx) => {
      // 1. Verificar existencia del usuario objetivo y su rol actual
      const targetUser = await tx.users.findUnique({
        where: { id: targetUserId },
        include: { roles: true },
      });

      if (!targetUser) {
        return { success: false, reason: "USER_NOT_FOUND" };
      }

      // 2. Verificar existencia del nuevo rol
      const newRole = await tx.roles.findUnique({
        where: { id: newRoleId },
      });

      if (!newRole) {
        return { success: false, reason: "ROLE_NOT_FOUND" };
      }

      const previousRoleName = normalizeRoleName(targetUser.roles?.name);
      const newRoleName = normalizeRoleName(newRole.name);

      // 3. Actualizar el rol del usuario
      const updatedUser = await tx.users.update({
        where: { id: targetUserId },
        data: {
          role_id: newRoleId,
          updated_at: new Date(),
        },
        include: { roles: true },
      });

      // 4. Crear registro en audit_logs de forma atómica dentro de la misma transacción
      const auditLog = await tx.audit_logs.create({
        data: {
          user_id: adminUserId,
          action: "UPDATE_USER_ROLE",
          entity: "users",
          entity_id: targetUserId,
          ip_address: ipAddress || null,
          details: {
            previous_role_id: targetUser.role_id,
            previous_role: previousRoleName,
            new_role_id: newRoleId,
            new_role: newRoleName,
            changed_by_admin: adminUserId,
            reason: reason || "Cambio de rol administrativo",
            ...(details || {}),
          },
        },
      });

      return {
        success: true,
        reason: "SUCCESS",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          role: newRoleName,
          role_id: updatedUser.role_id,
        },
        auditLog: {
          id: auditLog.id,
          action: auditLog.action,
          entity: auditLog.entity,
          entity_id: auditLog.entity_id,
          created_at: auditLog.created_at,
        },
      };
    });
  } catch (error) {
    console.error("[ROLE_UPDATE_TRANSACTION_ERROR]", error);
    return {
      success: false,
      reason: "TRANSACTION_FAILED",
    };
  }
}
