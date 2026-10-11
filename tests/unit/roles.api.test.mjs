import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as listUsersGetHandler } from "../../src/app/api/admin/users/route.ts";
import { PATCH as changeRolePatchHandler } from "../../src/app/api/admin/users/[id]/role/route.ts";
import { RoleManagementService } from "../../src/features/users/index.ts";

function createMockRequest(url, { method = "GET", headers = {}, body = null } = {}) {
  const reqInit = {
    method,
    headers: new Headers(headers),
  };
  if (body !== null && method !== "GET") {
    reqInit.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit);
}

describe("HU07-B: API Endpoints - Gestión de Roles", () => {
  let mockUsers;
  let mockService;

  beforeEach(() => {
    mockUsers = [
      {
        id: "usr-admin-01",
        email: "admin@vicecity.com",
        full_name: "Administrador General",
        role: "ADMIN",
        roles: { name: "ADMIN" },
        is_active: true,
      },
      {
        id: "usr-client-02",
        email: "cliente@example.com",
        full_name: "Cliente Deportivo",
        role: "CLIENT",
        roles: { name: "CLIENT" },
        is_active: true,
      },
    ];

    mockService = new RoleManagementService({
      findRoleFn: async (name) => {
        const validRoles = ["ADMIN", "CLIENT", "TICKET_SELLER", "QR_VALIDATOR"];
        if (validRoles.includes(name.toUpperCase())) {
          return { id: `role-${name.toLowerCase()}-id`, name: name.toUpperCase() };
        }
        return null;
      },
      findUserByIdFn: async (id) => {
        return mockUsers.find((u) => u.id === id) || null;
      },
      countAdminUsersFn: async () => {
        return mockUsers.filter((u) => u.role === "ADMIN").length;
      },
      updateUserRoleWithAuditFn: async (params) => {
        const target = mockUsers.find((u) => u.id === params.targetUserId);
        target.role = params.details.new_role;
        return {
          success: true,
          reason: "SUCCESS",
          user: {
            id: target.id,
            email: target.email,
            full_name: target.full_name,
            role: target.role,
            role_id: params.newRoleId,
          },
          auditLog: {
            id: "audit-001",
            action: "UPDATE_USER_ROLE",
            entity: "users",
            entity_id: target.id,
            created_at: new Date(),
          },
        };
      },
      listUsersWithRolePagedFn: async () => ({
        users: mockUsers,
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      }),
    });
  });

  // -------------------------------------------------------------------------
  // CRITERIO 1: Un ADMIN lista usuarios y cambia roles (200)
  // -------------------------------------------------------------------------
  test("Criterio 1: Un ADMIN lista usuarios con status 200", async () => {
    const adminSession = {
      user: { id: "usr-admin-01", email: "admin@vicecity.com", role: "ADMIN" },
    };

    const request = createMockRequest("http://localhost:3000/api/admin/users");
    const response = await listUsersGetHandler(request, adminSession, mockService);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.users.length >= 2);
    assert.equal(body.data.pagination.total, 2);
  });

  test("Criterio 1: Un ADMIN cambia el rol de otro usuario con status 200", async () => {
    const adminSession = {
      user: { id: "usr-admin-01", email: "admin@vicecity.com", role: "ADMIN" },
    };

    const request = createMockRequest(
      "http://localhost:3000/api/admin/users/usr-client-02/role",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: { role: "TICKET_SELLER", reason: "Asignado como cajero" },
      }
    );

    const context = { params: Promise.resolve({ id: "usr-client-02" }) };
    const response = await changeRolePatchHandler(
      request,
      { ...adminSession, targetUserId: "usr-client-02", ...context },
      mockService
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, "TICKET_SELLER");
    assert.ok(body.data.auditLog);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 2: Caso de error - sin sesión (401) y sin rol ADMIN (403)
  // -------------------------------------------------------------------------
  test("Criterio 2: Petición sin sesión activa devuelve 401 UNAUTHORIZED", async () => {
    const request = createMockRequest("http://localhost:3000/api/admin/users");
    const response = await listUsersGetHandler(request, null, mockService);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error, "UNAUTHORIZED");
  });

  test("Criterio 2: Usuario con rol no administrativo (CLIENT) recibe 403 FORBIDDEN al listar", async () => {
    const clientSession = {
      user: { id: "usr-client-02", email: "cliente@example.com", role: "CLIENT" },
    };

    const request = createMockRequest("http://localhost:3000/api/admin/users");
    const response = await listUsersGetHandler(request, clientSession, mockService);
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error, "FORBIDDEN");
  });

  test("Criterio 2: Usuario con rol no administrativo (TICKET_SELLER) recibe 403 FORBIDDEN al cambiar rol", async () => {
    const sellerSession = {
      user: { id: "usr-seller-03", email: "cajero@vicecity.com", role: "TICKET_SELLER" },
    };

    const request = createMockRequest(
      "http://localhost:3000/api/admin/users/usr-client-02/role",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: { role: "ADMIN" },
      }
    );

    const context = { params: Promise.resolve({ id: "usr-client-02" }) };
    const response = await changeRolePatchHandler(
      request,
      { ...sellerSession, targetUserId: "usr-client-02", ...context },
      mockService
    );
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error, "FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // CRITERIO 3: Caso límite - enviar un rol que no existe devuelve 400
  // -------------------------------------------------------------------------
  test("Criterio 3 (Caso límite): Enviar un rol que no existe en el SRS devuelve 400", async () => {
    const adminSession = {
      user: { id: "usr-admin-01", email: "admin@vicecity.com", role: "ADMIN" },
    };

    const request = createMockRequest(
      "http://localhost:3000/api/admin/users/usr-client-02/role",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: { role: "ROL_INVENTADO_NO_EXISTE" },
      }
    );

    const context = { params: Promise.resolve({ id: "usr-client-02" }) };
    const response = await changeRolePatchHandler(
      request,
      { ...adminSession, targetUserId: "usr-client-02", ...context },
      mockService
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error, "VALIDATION_ERROR");
  });

  test("Criterio 3 (Caso límite): Intentar degradar al único administrador devuelve 400", async () => {
    const adminSession = {
      user: { id: "usr-admin-01", email: "admin@vicecity.com", role: "ADMIN" },
    };

    const request = createMockRequest(
      "http://localhost:3000/api/admin/users/usr-admin-01/role",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: { role: "CLIENT" },
      }
    );

    const context = { params: Promise.resolve({ id: "usr-admin-01" }) };
    const response = await changeRolePatchHandler(
      request,
      { ...adminSession, targetUserId: "usr-admin-01", ...context },
      mockService
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error, "CANNOT_DEMOTE_LAST_ADMIN");
  });

  // -------------------------------------------------------------------------
  // VALIDACIONES DE CONTRATO (vice-city-api-contracts)
  // -------------------------------------------------------------------------
  test("Contrato API: Rechaza Content-Type inválido con 400", async () => {
    const adminSession = {
      user: { id: "usr-admin-01", role: "ADMIN" },
    };

    const request = createMockRequest(
      "http://localhost:3000/api/admin/users/usr-client-02/role",
      {
        method: "PATCH",
        headers: { "Content-Type": "text/plain" },
        body: "invalid",
      }
    );

    const response = await changeRolePatchHandler(
      request,
      { ...adminSession, targetUserId: "usr-client-02" },
      mockService
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "INVALID_CONTENT_TYPE");
  });

  test("Contrato API: Zod estricto rechaza campos desconocidos no permitidos con 400", async () => {
    const adminSession = {
      user: { id: "usr-admin-01", role: "ADMIN" },
    };

    const request = createMockRequest(
      "http://localhost:3000/api/admin/users/usr-client-02/role",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: {
          role: "CLIENT",
          campo_malicioso: "hack",
        },
      }
    );

    const response = await changeRolePatchHandler(
      request,
      { ...adminSession, targetUserId: "usr-client-02" },
      mockService
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "VALIDATION_ERROR");
  });
});
