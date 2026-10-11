import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  RoleManagementService,
  UnauthorizedRoleManagerError,
  InvalidRoleError,
  CannotDemoteLastAdminError,
  TargetUserNotFoundError,
} from "../../src/features/users/index.ts";

describe("HU07-B: Lógica de Negocio y ORM - Gestión de Roles", () => {
  let mockUsers;
  let mockRoles;
  let mockAuditLogs;
  let service;

  beforeEach(() => {
    mockRoles = [
      { id: "role-admin-id", name: "ADMIN" },
      { id: "role-client-id", name: "CLIENT" },
      { id: "role-seller-id", name: "TICKET_SELLER" },
      { id: "role-validator-id", name: "QR_VALIDATOR" },
    ];

    mockUsers = [
      {
        id: "usr-admin-1",
        email: "admin.principal@vicecity.com",
        full_name: "Super Admin",
        role_id: "role-admin-id",
        roles: { id: "role-admin-id", name: "ADMIN" },
        is_active: true,
      },
      {
        id: "usr-client-2",
        email: "cliente.juan@example.com",
        full_name: "Juan Pérez",
        role_id: "role-client-id",
        roles: { id: "role-client-id", name: "CLIENT" },
        is_active: true,
      },
    ];

    mockAuditLogs = [];

    // Dependencias desacopladas para simular el comportamiento de Prisma y la base de datos
    service = new RoleManagementService({
      findRoleFn: async (name) => {
        const found = mockRoles.find(
          (r) => r.name.toLowerCase() === name.trim().toLowerCase()
        );
        return found ? { id: found.id, name: found.name } : null;
      },
      findUserByIdFn: async (id) => {
        return mockUsers.find((u) => u.id === id) || null;
      },
      countAdminUsersFn: async () => {
        return mockUsers.filter(
          (u) => u.is_active && u.roles?.name.toUpperCase() === "ADMIN"
        ).length;
      },
      updateUserRoleWithAuditFn: async (params) => {
        const target = mockUsers.find((u) => u.id === params.targetUserId);
        if (!target) return { success: false, reason: "USER_NOT_FOUND" };

        const newRole = mockRoles.find((r) => r.id === params.newRoleId);
        if (!newRole) return { success: false, reason: "ROLE_NOT_FOUND" };

        // Transacción atómica en memoria
        target.role_id = newRole.id;
        target.roles = newRole;

        const audit = {
          id: `audit-${mockAuditLogs.length + 1}`,
          action: "UPDATE_USER_ROLE",
          entity: "users",
          entity_id: target.id,
          created_at: new Date(),
        };
        mockAuditLogs.push(audit);

        return {
          success: true,
          reason: "SUCCESS",
          user: {
            id: target.id,
            email: target.email,
            full_name: target.full_name,
            role: newRole.name,
            role_id: newRole.id,
          },
          auditLog: audit,
        };
      },
      listUsersWithRolePagedFn: async (params) => {
        let filtered = [...mockUsers];
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(
            (u) => u.email.toLowerCase().includes(s) || u.full_name.toLowerCase().includes(s)
          );
        }
        if (params.role) {
          filtered = filtered.filter(
            (u) => u.roles?.name.toUpperCase() === params.role.toUpperCase()
          );
        }
        return {
          users: filtered.map((u) => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.roles.name,
            role_id: u.role_id,
            is_active: u.is_active,
            created_at: new Date(),
            updated_at: new Date(),
          })),
          pagination: {
            total: filtered.length,
            page: params.page || 1,
            limit: params.limit || 10,
            totalPages: 1,
          },
        };
      },
    });
  });

  // -------------------------------------------------------------------------
  // CRITERIO 1: Un ADMIN cambia el rol de otro usuario y queda registrado
  // -------------------------------------------------------------------------
  test("Criterio 1: Un ADMIN cambia el rol de un usuario y la auditoría se registra", async () => {
    const adminRequester = { id: "usr-admin-1", role: "ADMIN" };

    const result = await service.changeUserRole(
      {
        targetUserId: "usr-client-2",
        newRole: "TICKET_SELLER",
        reason: "Ascenso a vendedor",
      },
      adminRequester
    );

    assert.equal(result.success, true);
    assert.equal(result.user.role, "TICKET_SELLER");
    assert.ok(result.auditLog);
    assert.equal(result.auditLog.action, "UPDATE_USER_ROLE");
    assert.equal(mockAuditLogs.length, 1);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 2: Caso de error - rol inválido o solicitante sin permiso
  // -------------------------------------------------------------------------
  test("Criterio 2: Solicitante sin rol ADMIN lanza UnauthorizedRoleManagerError", async () => {
    const nonAdminRequester = { id: "usr-client-2", role: "CLIENT" };

    await assert.rejects(
      async () => {
        await service.changeUserRole(
          { targetUserId: "usr-admin-1", newRole: "CLIENT" },
          nonAdminRequester
        );
      },
      (err) => {
        assert.ok(err instanceof UnauthorizedRoleManagerError);
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes("administradores"));
        return true;
      }
    );
  });

  test("Criterio 2: Asignar un rol que no pertenece al SRS lanza InvalidRoleError", async () => {
    const adminRequester = { id: "usr-admin-1", role: "ADMIN" };

    await assert.rejects(
      async () => {
        await service.changeUserRole(
          { targetUserId: "usr-client-2", newRole: "SUPER_GOD_ROLE" },
          adminRequester
        );
      },
      (err) => {
        assert.ok(err instanceof InvalidRoleError);
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("no es válido"));
        return true;
      }
    );
  });

  test("Caso de error: Usuario objetivo inexistente lanza TargetUserNotFoundError", async () => {
    const adminRequester = { id: "usr-admin-1", role: "ADMIN" };

    await assert.rejects(
      async () => {
        await service.changeUserRole(
          { targetUserId: "usr-inexistente-999", newRole: "QR_VALIDATOR" },
          adminRequester
        );
      },
      (err) => {
        assert.ok(err instanceof TargetUserNotFoundError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // CRITERIO 3: Caso límite - el último ADMIN no puede quitarse su propio rol
  // -------------------------------------------------------------------------
  test("Criterio 3 (Caso límite): No se puede revocar el rol al único administrador del sistema", async () => {
    const adminRequester = { id: "usr-admin-1", role: "ADMIN" };

    await assert.rejects(
      async () => {
        // Intenta degradar a usr-admin-1 siendo el único admin existente
        await service.changeUserRole(
          { targetUserId: "usr-admin-1", newRole: "CLIENT" },
          adminRequester
        );
      },
      (err) => {
        assert.ok(err instanceof CannotDemoteLastAdminError);
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes("único administrador"));
        return true;
      }
    );
  });

  test("Criterio 3 (Permitido cuando hay múltiples admins): Si existen dos administradores, uno sí puede ser cambiado", async () => {
    // Añadir un segundo administrador
    mockUsers.push({
      id: "usr-admin-2",
      email: "segundo.admin@vicecity.com",
      full_name: "Segundo Admin",
      role_id: "role-admin-id",
      roles: { id: "role-admin-id", name: "ADMIN" },
      is_active: true,
    });

    const adminRequester = { id: "usr-admin-1", role: "ADMIN" };

    const result = await service.changeUserRole(
      { targetUserId: "usr-admin-2", newRole: "TICKET_SELLER" },
      adminRequester
    );

    assert.equal(result.success, true);
    assert.equal(result.user.role, "TICKET_SELLER");
  });

  // -------------------------------------------------------------------------
  // CRITERIO ORM: Transaccionalidad atómica (se guardan juntos o ninguno)
  // -------------------------------------------------------------------------
  test("Criterio ORM: El cambio de rol y el registro de auditoría se guardan atómicamente", async () => {
    const adminRequester = { id: "usr-admin-1", role: "ADMIN" };
    const initialAuditCount = mockAuditLogs.length;

    const result = await service.changeUserRole(
      { targetUserId: "usr-client-2", newRole: "QR_VALIDATOR" },
      adminRequester
    );

    assert.equal(result.success, true);
    assert.equal(result.user.role, "QR_VALIDATOR");
    assert.equal(mockAuditLogs.length, initialAuditCount + 1);
  });

  test("Consulta de listado: Solo ADMIN puede consultar usuarios con rol", async () => {
    const adminRequester = { id: "usr-admin-1", role: "ADMIN" };
    const paged = await service.listUsers({ page: 1, limit: 10 }, adminRequester);

    assert.ok(paged.users.length >= 2);
    assert.equal(paged.pagination.total, 2);

    const clientRequester = { id: "usr-client-2", role: "CLIENT" };
    await assert.rejects(
      async () => {
        await service.listUsers({}, clientRequester);
      },
      (err) => err instanceof UnauthorizedRoleManagerError
    );
  });
});
