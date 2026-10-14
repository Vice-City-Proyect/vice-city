process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-characters-long!!";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isRouteAllowed, isPublicRoute } from "../../src/features/auth/permissions/route-permissions.ts";

const { POST } = await import("../../src/app/api/reservations/hold/route.ts");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const SERVICE_ID = "37844cc3-1e02-4b2d-ba99-831d94188b05";

function postRequest(body) {
  return new NextRequest(new URL("http://localhost:3000/api/reservations/hold"), {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function payload(userId) {
  return {
    userId,
    serviceId: SERVICE_ID,
    startAt: "2099-06-02T21:00:00.000Z",
    endAt: "2099-06-02T22:00:00.000Z",
    quantity: 1,
  };
}

function fakeService() {
  const calls = [];
  return {
    calls,
    holdReservation: async (params) => {
      calls.push(params);
      return { bookingId: "bk-1", userId: params.userId, status: "pending" };
    },
  };
}

const CLIENT = { user: { id: USER_ID, role: "CLIENT" } };

describe("POST /api/reservations/hold: sesión y propiedad", () => {
  it("401 sin sesión y no retiene ningún cupo", async () => {
    const service = fakeService();
    const res = await POST(postRequest(payload(USER_ID)), {
      sessionOverride: null,
      serviceOverride: service,
    });
    assert.equal(res.status, 401);
    assert.equal(service.calls.length, 0);
  });

  it("403 si el rol no puede reservar", async () => {
    const service = fakeService();
    const res = await POST(postRequest(payload(USER_ID)), {
      sessionOverride: { user: { id: "u9", role: "QR_VALIDATOR" } },
      serviceOverride: service,
    });
    assert.equal(res.status, 403);
    assert.equal(service.calls.length, 0);
  });

  it("403 si un cliente intenta reservar a nombre de otro usuario", async () => {
    const service = fakeService();
    const res = await POST(postRequest(payload(OTHER_ID)), {
      sessionOverride: CLIENT,
      serviceOverride: service,
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, "FORBIDDEN_USER");
    assert.equal(service.calls.length, 0);
  });

  it("201 si el userId coincide con la sesión", async () => {
    const service = fakeService();
    const res = await POST(postRequest(payload(USER_ID)), {
      sessionOverride: CLIENT,
      serviceOverride: service,
    });
    assert.equal(res.status, 201);
    assert.equal(service.calls[0].userId, USER_ID);
  });

  it("un ADMIN puede reservar a nombre de otro usuario", async () => {
    const service = fakeService();
    const res = await POST(postRequest(payload(OTHER_ID)), {
      sessionOverride: { user: { id: "admin-1", role: "ADMIN" } },
      serviceOverride: service,
    });
    assert.equal(res.status, 201);
    assert.equal(service.calls[0].userId, OTHER_ID);
  });

  it("400 si el cuerpo no es JSON válido (antes devolvía 500)", async () => {
    const res = await POST(postRequest("{no-es-json"), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 400);
  });

  it("el middleware ya no deja la ruta pública, pero conserva la consulta por UUID del checkout", () => {
    assert.equal(isPublicRoute("/api/reservations/hold"), false);
    assert.equal(isRouteAllowed("CLIENT", "/api/reservations/hold"), true);
    assert.equal(isRouteAllowed(null, "/api/reservations/hold"), false);
    assert.equal(isPublicRoute("/api/reservations/c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"), true);
  });
});
