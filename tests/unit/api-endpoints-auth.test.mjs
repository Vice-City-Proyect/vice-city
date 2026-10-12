import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { POST as createService, GET as listServices } from "../../src/app/api/services/route.ts";
import {
  PATCH as updateService,
  DELETE as deleteService,
} from "../../src/app/api/services/[id]/route.ts";
import { POST as createCategory } from "../../src/app/api/categories/route.ts";
import { DELETE as deleteCategory } from "../../src/app/api/categories/[id]/route.ts";
import {
  GET as listEmployees,
  POST as createEmployee,
} from "../../src/app/api/employees/route.ts";
import { PATCH as updateEmployee } from "../../src/app/api/employees/[id]/route.ts";

const ORIGINAL_FLAG = process.env.ENABLE_MOCK_AUTH_HEADERS;

before(() => {
  // Las pruebas de autorización simulan el rol ADMIN vía cabeceras: el flag
  // explícito de simulación debe estar habilitado durante la suite.
  process.env.ENABLE_MOCK_AUTH_HEADERS = "true";
});

after(() => {
  if (ORIGINAL_FLAG === undefined) {
    delete process.env.ENABLE_MOCK_AUTH_HEADERS;
  } else {
    process.env.ENABLE_MOCK_AUTH_HEADERS = ORIGINAL_FLAG;
  }
});

function createRequest(url, { method = "GET", headers = {}, body = null } = {}) {
  const init = { method, headers: new Headers(headers) };
  if (body !== null && method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

const jsonHeaders = (extra = {}) => ({ "content-type": "application/json", ...extra });

const idContext = () => ({ params: Promise.resolve({ id: "some-id" }) });

describe("Seguridad de endpoints: autenticación (401) y autorización (403)", () => {
  // -------------------------------------------------------------------------
  // 401 — Sin sesión / sin credenciales
  // -------------------------------------------------------------------------
  test("POST /api/services sin sesión responde 401", async () => {
    const res = await createService(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: jsonHeaders(),
        body: { name: "X" },
      })
    );
    assert.equal(res.status, 401);
  });

  test("PATCH /api/services/[id] sin sesión responde 401", async () => {
    const res = await updateService(
      createRequest("http://localhost:3000/api/services/abc", {
        method: "PATCH",
        headers: jsonHeaders(),
        body: { name: "X" },
      }),
      idContext()
    );
    assert.equal(res.status, 401);
  });

  test("DELETE /api/services/[id] sin sesión responde 401", async () => {
    const res = await deleteService(
      createRequest("http://localhost:3000/api/services/abc", { method: "DELETE" }),
      idContext()
    );
    assert.equal(res.status, 401);
  });

  test("POST /api/categories sin sesión responde 401", async () => {
    const res = await createCategory(
      createRequest("http://localhost:3000/api/categories", {
        method: "POST",
        headers: jsonHeaders(),
        body: { name: "X" },
      })
    );
    assert.equal(res.status, 401);
  });

  test("DELETE /api/categories/[id] sin sesión responde 401", async () => {
    const res = await deleteCategory(
      createRequest("http://localhost:3000/api/categories/abc", { method: "DELETE" }),
      idContext()
    );
    assert.equal(res.status, 401);
  });

  test("GET /api/employees sin sesión responde 401", async () => {
    const res = await listEmployees(
      createRequest("http://localhost:3000/api/employees")
    );
    assert.equal(res.status, 401);
  });

  test("POST /api/employees sin sesión responde 401", async () => {
    const res = await createEmployee(
      createRequest("http://localhost:3000/api/employees", {
        method: "POST",
        headers: jsonHeaders(),
        body: { email: "x@x.com" },
      })
    );
    assert.equal(res.status, 401);
  });

  test("PATCH /api/employees/[id] sin sesión responde 401", async () => {
    const res = await updateEmployee(
      createRequest("http://localhost:3000/api/employees/abc", {
        method: "PATCH",
        headers: jsonHeaders(),
        body: { full_name: "X" },
      }),
      idContext()
    );
    assert.equal(res.status, 401);
  });

  // -------------------------------------------------------------------------
  // 403 — Autenticado sin rol ADMIN (cabecera de rol no-admin en no-producción)
  // -------------------------------------------------------------------------
  test("POST /api/services con rol CLIENT responde 403", async () => {
    const res = await createService(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: jsonHeaders({ "x-user-role": "CLIENT" }),
        body: { name: "X" },
      })
    );
    assert.equal(res.status, 403);
  });

  test("POST /api/categories con rol TICKET_SELLER responde 403", async () => {
    const res = await createCategory(
      createRequest("http://localhost:3000/api/categories", {
        method: "POST",
        headers: jsonHeaders({ "x-user-role": "TICKET_SELLER" }),
        body: { name: "X" },
      })
    );
    assert.equal(res.status, 403);
  });

  test("GET /api/employees con rol CLIENT responde 403", async () => {
    const res = await listEmployees(
      createRequest("http://localhost:3000/api/employees", {
        headers: { "x-user-role": "CLIENT" },
      })
    );
    assert.equal(res.status, 403);
  });

  // -------------------------------------------------------------------------
  // 400 — Validación de datos (con rol ADMIN, sin tocar la BD por fallo previo)
  // -------------------------------------------------------------------------
  test("POST /api/services con ADMIN y aforo <= 0 responde 400", async () => {
    const res = await createService(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: jsonHeaders({ "x-user-role": "ADMIN" }),
        body: { category_id: "cat-1", name: "X", price: 10, capacity: 0 },
      })
    );
    assert.equal(res.status, 400);
  });

  test("POST /api/services con ADMIN y precio negativo responde 400", async () => {
    const res = await createService(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: jsonHeaders({ "x-user-role": "ADMIN" }),
        body: { category_id: "cat-1", name: "X", price: -1, capacity: 5 },
      })
    );
    assert.equal(res.status, 400);
  });

  // -------------------------------------------------------------------------
  // Catálogo público (GET /api/services) con dependencias aisladas
  // -------------------------------------------------------------------------
  test("GET /api/services es público: responde 200 con { success, data } sin sesión", async () => {
    const res = await listServices(
      createRequest("http://localhost:3000/api/services"),
      {
        params: undefined,
        listServicesOverride: async () => [
          { id: "srv-1", name: "Cancha microfútbol", price: 35000, is_active: true },
        ],
      }
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, "srv-1");
  });

  test("GET /api/services público no requiere rol ADMIN (sin cabecera de rol)", async () => {
    const res = await listServices(
      createRequest("http://localhost:3000/api/services", {
        headers: { "x-user-role": "CLIENT" },
      }),
      {
        params: undefined,
        listServicesOverride: async () => [],
      }
    );

    // La ruta pública no ejecuta requireAdminRole: un cliente puede leerla.
    assert.equal(res.status, 200);
  });
});
