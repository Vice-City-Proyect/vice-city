import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { requireAdminRole } from "../../src/features/services/auth-guard.ts";
import { middleware } from "../../src/middleware.ts";

function createRequest(url, { method = "GET", headers = {} } = {}) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: new Headers(headers),
  });
}

const ORIGINAL_FLAG = process.env.ENABLE_MOCK_AUTH_HEADERS;

function setMockAuthFlag(value) {
  if (value) {
    process.env.ENABLE_MOCK_AUTH_HEADERS = "true";
  } else {
    delete process.env.ENABLE_MOCK_AUTH_HEADERS;
  }
}

describe("Seguridad: las cabeceras de rol solo se aceptan con flag explícito (MEDIO-2)", () => {
  afterEach(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.ENABLE_MOCK_AUTH_HEADERS;
    } else {
      process.env.ENABLE_MOCK_AUTH_HEADERS = ORIGINAL_FLAG;
    }
  });

  test("Flag deshabilitado (default): x-user-role ADMIN se rechaza con 401 incluso en no-producción", async () => {
    process.env.NODE_ENV = "test";
    setMockAuthFlag(false);

    const result = await requireAdminRole(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "x-user-role": "ADMIN" },
      })
    );

    assert.equal(result.authorized, false);
    assert.equal(result.status, 401);
  });

  test("Flag habilitado: x-user-role ADMIN se acepta (compatibilidad con pruebas)", async () => {
    setMockAuthFlag(true);

    const result = await requireAdminRole(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "x-user-role": "ADMIN" },
      })
    );

    assert.equal(result.authorized, true);
    assert.equal(result.roleName, "ADMIN");
  });

  test("Flag habilitado: x-user-role no-admin se rechaza con 403", async () => {
    setMockAuthFlag(true);

    const result = await requireAdminRole(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "x-user-role": "CLIENT" },
      })
    );

    assert.equal(result.authorized, false);
    assert.equal(result.status, 403);
  });

  test("Flag deshabilitado: x-user-id falsificado se rechaza con 401 sin consultar la BD", async () => {
    setMockAuthFlag(false);

    const result = await requireAdminRole(
      createRequest("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "x-user-id": "admin-uuid-inexistente" },
      })
    );

    assert.equal(result.authorized, false);
    assert.equal(result.status, 401);
  });

  test("Sin credenciales ni cabeceras ni flag: 401", async () => {
    setMockAuthFlag(false);

    const result = await requireAdminRole(
      createRequest("http://localhost:3000/api/services", { method: "POST" })
    );

    assert.equal(result.authorized, false);
    assert.equal(result.status, 401);
  });

  test("Middleware con flag deshabilitado: x-mock-role ADMIN no otorga acceso (401)", async () => {
    setMockAuthFlag(false);

    const response = await middleware(
      createRequest("http://localhost:3000/api/admin/users", {
        headers: { "x-mock-role": "ADMIN" },
      })
    );

    assert.equal(response.status, 401);
  });

  test("Middleware con flag habilitado: x-mock-role ADMIN permite el acceso (compatibilidad)", async () => {
    setMockAuthFlag(true);

    const response = await middleware(
      createRequest("http://localhost:3000/api/admin/users", {
        headers: { "x-mock-role": "ADMIN" },
      })
    );

    assert.equal(response.headers.get("Location"), null);
    assert.notEqual(response.status, 401);
    assert.notEqual(response.status, 403);
  });
});