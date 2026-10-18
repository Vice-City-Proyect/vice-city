import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "../../src/app/api/admin/users/[id]/route.ts";
import { prisma } from "../../src/lib/prisma";

function createMockRequest(url, { method = "GET", headers = {}, body = null } = {}) {
  const reqInit = {
    method,
    headers: new Headers({ "content-type": "application/json", ...headers }),
  };
  if (body !== null && method !== "GET") {
    reqInit.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit);
}

describe("API /api/admin/users/[id] - Activar / Desactivar usuarios", () => {
  let mockUsers;
  let auditLogs;
  const originalFindUnique = prisma.users.findUnique;
  const originalUpdate = prisma.users.update;
  const originalCount = prisma.users.count;
  const originalAuditCreate = prisma.audit_logs?.create;

  beforeEach(() => {
    mockUsers = [
      {
        id: "usr-admin-01",
        email: "admin@vicecity.com",
        full_name: "Administrador General",
        phone: "3001234567",
        document_id: "123456",
        is_active: true,
        roles: { name: "ADMIN" },
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "usr-client-01",
        email: "cliente@vicecity.com",
        full_name: "Carlos Cliente",
        phone: "3119876543",
        document_id: "654321",
        is_active: true,
        roles: { name: "CLIENT" },
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "usr-seller-01",
        email: "vendedor@vicecity.com",
        full_name: "Valeria Vendedora",
        phone: "3201112233",
        document_id: "789101",
        is_active: false,
        roles: { name: "TICKET_SELLER" },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    auditLogs = [];

    prisma.users.findUnique = async ({ where }) => {
      return mockUsers.find((u) => u.id === where.id) || null;
    };

    prisma.users.update = async ({ where, data }) => {
      const target = mockUsers.find((u) => u.id === where.id);
      if (!target) throw new Error("Record not found");
      Object.assign(target, data);
      return target;
    };

    prisma.users.count = async ({ where }) => {
      return mockUsers.filter((u) => {
        if (where?.roles?.name?.equals === "ADMIN" && where?.is_active === true) {
          return u.roles?.name === "ADMIN" && u.is_active === true;
        }
        return true;
      }).length;
    };

    if (!prisma.audit_logs) {
      prisma.audit_logs = {};
    }
    prisma.audit_logs.create = async ({ data }) => {
      auditLogs.push(data);
      return { id: "audit-1", ...data };
    };
  });

  test("1. Sin sesión devuelve 401 UNAUTHORIZED", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-client-01", {
      method: "PATCH",
      body: { is_active: false },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "usr-client-01" }),
      sessionOverride: null,
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error, "UNAUTHORIZED");
  });

  test("2. Rol no ADMIN (CLIENT) devuelve 403 FORBIDDEN", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-client-01", {
      method: "PATCH",
      body: { is_active: false },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "usr-client-01" }),
      sessionOverride: { id: "usr-client-01", role: "CLIENT" },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error, "FORBIDDEN");
  });

  test("3. Usuario no encontrado devuelve 404 NOT_FOUND", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-inexistente", {
      method: "PATCH",
      body: { is_active: false },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "usr-inexistente" }),
      sessionOverride: { id: "usr-admin-01", role: "ADMIN", email: "admin@vicecity.com" },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error, "NOT_FOUND");
  });

  test("4. Administrador no puede desactivarse a sí mismo (400 Bad Request)", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-admin-01", {
      method: "PATCH",
      body: { is_active: false },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "usr-admin-01" }),
      sessionOverride: { id: "usr-admin-01", role: "ADMIN", email: "admin@vicecity.com" },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error, "SELF_DEACTIVATION_PROHIBITED");
  });

  test("5. Desactivar a un CLIENT actualiza is_active: false y registra auditoría", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-client-01", {
      method: "PATCH",
      body: { is_active: false },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "usr-client-01" }),
      sessionOverride: { id: "usr-admin-01", role: "ADMIN", email: "admin@vicecity.com" },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.is_active, false);

    const client = mockUsers.find((u) => u.id === "usr-client-01");
    assert.equal(client.is_active, false);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, "USER_DEACTIVATED");
  });

  test("6. Activar a un usuario previamente inactivo actualiza is_active: true", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-seller-01", {
      method: "PATCH",
      body: { is_active: true },
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "usr-seller-01" }),
      sessionOverride: { id: "usr-admin-01", role: "ADMIN", email: "admin@vicecity.com" },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.is_active, true);

    const seller = mockUsers.find((u) => u.id === "usr-seller-01");
    assert.equal(seller.is_active, true);
    assert.equal(auditLogs[0].action, "USER_ACTIVATED");
  });

  test("7. DELETE /api/admin/users/[id] desactiva al usuario (soft-deactivate)", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-client-01", {
      method: "DELETE",
    });

    const res = await DELETE(req, {
      params: Promise.resolve({ id: "usr-client-01" }),
      sessionOverride: { id: "usr-admin-01", role: "ADMIN", email: "admin@vicecity.com" },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.is_active, false);
  });

  test("8. GET /api/admin/users/[id] devuelve los detalles del usuario", async () => {
    const req = createMockRequest("http://localhost:3000/api/admin/users/usr-client-01");

    const res = await GET(req, {
      params: Promise.resolve({ id: "usr-client-01" }),
      sessionOverride: { id: "usr-admin-01", role: "ADMIN", email: "admin@vicecity.com" },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.email, "cliente@vicecity.com");
    assert.equal(body.data.role, "CLIENT");
  });
});

