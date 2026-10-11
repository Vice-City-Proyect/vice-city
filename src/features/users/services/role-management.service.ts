/**
 * Servicio de Lógica de Negocio: Gestión de Roles (HU07-B LN)
 * Vice City - Features: Users / Roles
 *
 * Requerimientos y Criterios de Aceptación:
 * 1. Solo ADMIN puede cambiar roles (UnauthorizedRoleManagerError).
 * 2. Los roles válidos son los cuatro del SRS: ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR (InvalidRoleError).
 * 3. Caso límite: No permitir quitar el rol al último ADMIN del sistema (CannotDemoteLastAdminError).
 * 4. Registrar cada cambio de rol en audit_logs de forma atómica.
 */

import {
  UnauthorizedRoleManagerError,
  InvalidRoleError,
  CannotDemoteLastAdminError,
  TargetUserNotFoundError,
  RoleNotFoundError,
} from "../errors/role-management.errors";
import {
  findRole,
  countAdminUsers,
  updateUserRoleWithAudit,
  listUsersWithRolePaged,
  normalizeRoleName,
  type ListUsersWithRoleParams,
  type PagedUsersResult,
  type UpdateUserRoleResult,
} from "../role-management.repository";
import { prisma } from "@/lib/prisma";

export const VALID_SRS_ROLES = [
  "ADMIN",
  "CLIENT",
  "TICKET_SELLER",
  "QR_VALIDATOR",
] as const;

export type SRSRoleName = (typeof VALID_SRS_ROLES)[number];

export interface RequesterUser {
  id: string;
  email?: string;
  role: string;
}

export interface ChangeUserRoleInput {
  targetUserId: string;
  newRole: string;
  reason?: string | null;
  ipAddress?: string | null;
}

export interface ChangeUserRoleResult {
  success: boolean;
  message: string;
  user: {
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

export interface RoleServiceDependencies {
  findRoleFn?: (identifier: string) => Promise<{ id: string; name: string } | null>;
  findUserByIdFn?: (userId: string) => Promise<any>;
  countAdminUsersFn?: () => Promise<number>;
  updateUserRoleWithAuditFn?: (params: any) => Promise<UpdateUserRoleResult>;
  listUsersWithRolePagedFn?: (params: any) => Promise<PagedUsersResult>;
}

export class RoleManagementService {
  private findRoleFn: (identifier: string) => Promise<{ id: string; name: string } | null>;
  private findUserByIdFn: (userId: string) => Promise<any>;
  private countAdminUsersFn: () => Promise<number>;
  private updateUserRoleWithAuditFn: (params: any) => Promise<UpdateUserRoleResult>;
  private listUsersWithRolePagedFn: (params: any) => Promise<PagedUsersResult>;

  constructor(deps: RoleServiceDependencies = {}) {
    this.findRoleFn = deps.findRoleFn ?? ((identifier) => findRole(identifier));
    this.findUserByIdFn =
      deps.findUserByIdFn ??
      ((userId) =>
        prisma.users.findUnique({
          where: { id: userId },
          include: { roles: true },
        }));
    this.countAdminUsersFn = deps.countAdminUsersFn ?? (() => countAdminUsers());
    this.updateUserRoleWithAuditFn =
      deps.updateUserRoleWithAuditFn ?? ((params) => updateUserRoleWithAudit(params));
    this.listUsersWithRolePagedFn =
      deps.listUsersWithRolePagedFn ?? ((params) => listUsersWithRolePaged(params));
  }

  /**
   * Cambia el rol de un usuario registrando la auditoría de forma atómica.
   *
   * @param input Datos del cambio de rol (targetUserId, newRole, reason)
   * @param requester Administrador que solicita la operación
   * @returns Resultado del cambio con datos de usuario y registro de auditoría
   */
  async changeUserRole(
    input: ChangeUserRoleInput,
    requester?: RequesterUser | null
  ): Promise<ChangeUserRoleResult> {
    // 1. Requerimiento: Solo ADMIN puede cambiar roles
    if (!requester || normalizeRoleName(requester.role) !== "ADMIN") {
      throw new UnauthorizedRoleManagerError();
    }

    // 2. Requerimiento: Validar que el rol corresponda a uno de los cuatro del SRS
    const targetRoleName = normalizeRoleName(input.newRole);
    if (!VALID_SRS_ROLES.includes(targetRoleName as SRSRoleName)) {
      throw new InvalidRoleError(input.newRole);
    }

    // 3. Buscar el rol en la base de datos
    const roleRecord = await this.findRoleFn(targetRoleName);
    if (!roleRecord) {
      throw new RoleNotFoundError(targetRoleName);
    }

    // 4. Buscar el usuario objetivo
    const targetUser = await this.findUserByIdFn(input.targetUserId);
    if (!targetUser) {
      throw new TargetUserNotFoundError(input.targetUserId);
    }

    const currentRoleName = normalizeRoleName(targetUser.roles?.name);

    // 5. Criterio límite: No permitir quitar el rol al último ADMIN del sistema
    if (currentRoleName === "ADMIN" && targetRoleName !== "ADMIN") {
      const adminCount = await this.countAdminUsersFn();
      if (adminCount <= 1) {
        throw new CannotDemoteLastAdminError();
      }
    }

    // 6. Actualización atómica del rol y registro en audit_logs (HU07-BD)
    const result = await this.updateUserRoleWithAuditFn({
      targetUserId: targetUser.id,
      newRoleId: roleRecord.id,
      adminUserId: requester.id,
      ipAddress: input.ipAddress || null,
      reason: input.reason || `Rol cambiado de ${currentRoleName} a ${targetRoleName} por ${requester.id}`,
      details: {
        previous_role: currentRoleName,
        new_role: targetRoleName,
      },
    });

    if (!result.success || !result.user) {
      throw new Error("No se pudo completar la transacción de actualización de rol.");
    }

    return {
      success: true,
      message: `El rol del usuario ha sido actualizado a ${targetRoleName} exitosamente.`,
      user: result.user,
      auditLog: result.auditLog,
    };
  }

  /**
   * Lista usuarios con su rol actual de forma paginada para administradores.
   *
   * @param params Parámetros de consulta (page, limit, search, role)
   * @param requester Administrador que solicita la consulta
   * @returns Resultados paginados
   */
  async listUsers(
    params: ListUsersWithRoleParams = {},
    requester?: RequesterUser | null
  ): Promise<PagedUsersResult> {
    if (!requester || normalizeRoleName(requester.role) !== "ADMIN") {
      throw new UnauthorizedRoleManagerError(
        "Acceso denegado: solo los administradores pueden consultar el listado de roles de usuarios."
      );
    }

    return this.listUsersWithRolePagedFn(params);
  }
}

export const roleManagementService = new RoleManagementService();
