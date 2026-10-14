process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-characters-long!!";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

const { GET, PATCH } = await import("../../src/app/api/users/me/route.ts");

function createJsonRequest(url, { method = "GET", headers = {}, body = null } = {}) {
  const init = {
    method,
    headers: new Headers({
      "content-type": "application/json",
      ...headers,
    }),
  };
  if (body !== null && method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("HU28 — Endpoint /api/users/me (Datos reales de perfil)", () => {
  // Mock database
  function createMockDb() {
    const usersStore = [
      {
        id: "usr_client_1",
        full_name: "Carlos Santana",
        email: "carlos@example.com",
        phone: "+573001112233",
        document_id: "CC 10203040",
        roles: { name: "CLIENT" },
        is_active: true,
        created_at: new Date("2025-01-15T10:00:00Z"),
      },
      {
        id: "usr_client_2",
        full_name: "Lucia Ramirez",
        email: "lucia@example.com",
        phone: null,
        document_id: "CC 99887766",
        roles: { name: "CLIENT" },
        is_active: true,
        created_at: new Date("2025-02-20T12:00:00Z"),
      },
    ];

    return {
      users: {
        async findFirst({ where }) {
          const conditions = where?.OR || [];
          return (
            usersStore.find((u) =>
              conditions.some(
                (cond) =>
                  (cond.id && u.id === cond.id) ||
                  (cond.email && u.email.toLowerCase() === cond.email.equals?.toLowerCase())
              )
            ) || null
          );
        },
        async update({ where, data }) {
          const userIndex = usersStore.findIndex((u) => u.id === where.id);
          if (userIndex === -1) throw new Error("User not found in mock store");
          const updated = {
            ...usersStore[userIndex],
            ...data,
          };
          usersStore[userIndex] = updated;
          return updated;
        },
      },
    };
  }

  test("1. GET /api/users/me sin sesión devuelve 401 Unauthorized", async () => {
    const req = createJsonRequest("http://localhost:3000/api/users/me");
    const res = await GET(req, { sessionOverride: null });
    assert.equal(res.status, 401);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, "UNAUTHORIZED");
  });

  test("2. GET /api/users/me con sesión retorna los datos del usuario autenticado", async () => {
    const mockDb = createMockDb();
    const req = createJsonRequest("http://localhost:3000/api/users/me");
    const session = {
      user: {
        id: "usr_client_1",
        email: "carlos@example.com",
        name: "Carlos Santana",
        role: "CLIENT",
      },
    };

    const res = await GET(req, { sessionOverride: session, prismaOverride: mockDb });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, "usr_client_1");
    assert.equal(json.data.full_name, "Carlos Santana");
    assert.equal(json.data.email, "carlos@example.com");
    assert.equal(json.data.phone, "+573001112233");
    assert.equal(json.data.document_id, "CC 10203040");
    assert.equal(json.data.role, "CLIENT");
    assert.equal(json.data.status, "ACTIVE");
  });

  test("3. Multi-usuario: Usuario B ve estrictamente sus propios datos y maneja teléfono null", async () => {
    const mockDb = createMockDb();
    const req = createJsonRequest("http://localhost:3000/api/users/me");
    const session = {
      user: {
        id: "usr_client_2",
        email: "lucia@example.com",
        name: "Lucia Ramirez",
        role: "CLIENT",
      },
    };

    const res = await GET(req, { sessionOverride: session, prismaOverride: mockDb });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, "usr_client_2");
    assert.equal(json.data.full_name, "Lucia Ramirez");
    assert.equal(json.data.email, "lucia@example.com");
    assert.equal(json.data.phone, null); // Edge case: campo opcional nulo
  });

  test("4. PATCH /api/users/me sin sesión devuelve 401 Unauthorized", async () => {
    const req = createJsonRequest("http://localhost:3000/api/users/me", {
      method: "PATCH",
      body: { name: "Nuevo Nombre" },
    });
    const res = await PATCH(req, { sessionOverride: null });
    assert.equal(res.status, 401);
  });

  test("5. PATCH /api/users/me rechaza validación con nombre vacío", async () => {
    const mockDb = createMockDb();
    const req = createJsonRequest("http://localhost:3000/api/users/me", {
      method: "PATCH",
      body: { name: "" },
    });
    const session = {
      user: { id: "usr_client_1", email: "carlos@example.com" },
    };

    const res = await PATCH(req, { sessionOverride: session, prismaOverride: mockDb });
    assert.equal(res.status, 400);

    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, "VALIDATION_ERROR");
  });

  test("6. PATCH /api/users/me actualiza nombre y teléfono persistiendo en la BD", async () => {
    const mockDb = createMockDb();
    const req = createJsonRequest("http://localhost:3000/api/users/me", {
      method: "PATCH",
      body: {
        name: "Carlos Alberto Santana",
        phone: "+573119998877",
      },
    });
    const session = {
      user: { id: "usr_client_1", email: "carlos@example.com" },
    };

    const res = await PATCH(req, { sessionOverride: session, prismaOverride: mockDb });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.full_name, "Carlos Alberto Santana");
    assert.equal(json.data.phone, "+573119998877");

    // Verificar persistencia consultando GET inmediatamente después
    const getReq = createJsonRequest("http://localhost:3000/api/users/me");
    const getRes = await GET(getReq, { sessionOverride: session, prismaOverride: mockDb });
    const getJson = await getRes.json();
    assert.equal(getJson.data.full_name, "Carlos Alberto Santana");
    assert.equal(getJson.data.phone, "+573119998877");
  });

  test("7. GET normaliza el rol de BD 'customer' al rol SRS 'CLIENT'", async () => {
    const db = {
      users: {
        async findFirst() {
          return {
            id: "usr_legacy",
            full_name: "Ana Legacy",
            email: "ana@example.com",
            phone: null,
            document_id: null,
            roles: { name: "customer" },
            is_active: true,
            created_at: new Date("2025-03-01T10:00:00Z"),
          };
        },
      },
    };
    const session = { user: { id: "usr_legacy", email: "ana@example.com" } };
    const req = createJsonRequest("http://localhost:3000/api/users/me");

    const res = await GET(req, { sessionOverride: session, prismaOverride: db });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.role, "CLIENT");
    assert.equal(json.data.phone, null);
    assert.equal(json.data.document_id, null);
  });

  test("8. GET informa status INACTIVE para un usuario desactivado", async () => {
    const db = {
      users: {
        async findFirst() {
          return {
            id: "usr_off",
            full_name: "Inactivo",
            email: "off@example.com",
            phone: null,
            document_id: null,
            roles: { name: "CLIENT" },
            is_active: false,
            created_at: null,
          };
        },
      },
    };
    const session = { user: { id: "usr_off", email: "off@example.com" } };
    const req = createJsonRequest("http://localhost:3000/api/users/me");

    const res = await GET(req, { sessionOverride: session, prismaOverride: db });
    const json = await res.json();
    assert.equal(json.data.status, "INACTIVE");
  });

  test("9. GET devuelve 500 con mensaje claro si la BD falla", async () => {
    const db = {
      users: {
        async findFirst() {
          throw new Error("db down");
        },
      },
    };
    const session = { user: { id: "usr_client_1", email: "carlos@example.com" } };
    const req = createJsonRequest("http://localhost:3000/api/users/me");

    const res = await GET(req, { sessionOverride: session, prismaOverride: db });
    const json = await res.json();
    assert.equal(res.status, 500);
    assert.equal(json.success, false);
    assert.equal(json.error, "INTERNAL_SERVER_ERROR");
    assert.equal(json.data, undefined);
  });

  test("10. PATCH /api/users/me permite limpiar el teléfono estableciéndolo en null", async () => {
    const mockDb = createMockDb();
    const req = createJsonRequest("http://localhost:3000/api/users/me", {
      method: "PATCH",
      body: {
        phone: null,
      },
    });
    const session = {
      user: { id: "usr_client_1", email: "carlos@example.com" },
    };

    const res = await PATCH(req, { sessionOverride: session, prismaOverride: mockDb });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.phone, null);
  });
});
