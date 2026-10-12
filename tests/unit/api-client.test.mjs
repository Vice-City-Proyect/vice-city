import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { apiRequest, ApiError, getErrorMessage } from "../../src/lib/api-client.ts";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const REAL_FETCH = globalThis.fetch;

function mockFetch(impl) {
  globalThis.fetch = impl;
}

afterEach(() => {
  globalThis.fetch = REAL_FETCH;
});

describe("apiRequest: normalización del contrato { success, data }", () => {
  test("Devuelve `data` de una respuesta 200", async () => {
    mockFetch(async () =>
      jsonResponse({ success: true, data: { id: "x", name: "Cancha" } })
    );

    const result = await apiRequest("/api/services");
    assert.deepEqual(result, { id: "x", name: "Cancha" });
  });

  test("Respuesta 200 con cuerpo no-JSON lanza ApiError INVALID_RESPONSE (BAJO-3)", async () => {
    mockFetch(async () => new Response("Not JSON", { status: 200 }));

    await assert.rejects(
      () => apiRequest("/api/services"),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 200);
        assert.equal(err.code, "INVALID_RESPONSE");
        return true;
      }
    );
  });

  test("Respuesta 500 con mensaje JSON lanza ApiError con status y mensaje", async () => {
    mockFetch(async () =>
      jsonResponse({ success: false, error: "INTERNAL", message: "Error interno" }, 500)
    );

    await assert.rejects(
      () => apiRequest("/api/admin/users"),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 500);
        assert.equal(err.message, "Error interno");
        return true;
      }
    );
  });

  test("Respuesta 200 con success=false lanza ApiError", async () => {
    mockFetch(async () =>
      jsonResponse({ success: false, error: "BUSINESS_RULE", message: "Regla violada" })
    );

    await assert.rejects(
      () => apiRequest("/api/admin/users/1/role"),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, "BUSINESS_RULE");
        return true;
      }
    );
  });

  test("Error de red lanza ApiError NETWORK_ERROR", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    await assert.rejects(
      () => apiRequest("/api/services"),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 0);
        assert.equal(err.code, "NETWORK_ERROR");
        return true;
      }
    );
  });
});

describe("getErrorMessage", () => {
  test("Devuelve el mensaje de ApiError", () => {
    assert.equal(getErrorMessage(new ApiError("Algo falló", 500)), "Algo falló");
  });

  test("Devuelve el mensaje de Error genérico", () => {
    assert.equal(getErrorMessage(new Error("boom")), "boom");
  });

  test("Devuelve un texto genérico para valores desconocidos", () => {
    assert.match(getErrorMessage(null), /inesperado/);
  });
});