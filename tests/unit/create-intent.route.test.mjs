process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-characters-long!!";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { ForbiddenBookingAccessError } from "../../src/features/payments/errors/payments.errors.ts";

const { POST } = await import("../../src/app/api/payments/create-intent/route.ts");

const BOOKING_ID = "b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e";

function postRequest(body) {
  return new NextRequest(new URL("http://localhost:3000/api/payments/create-intent"), {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function fakeService() {
  const calls = [];
  return {
    calls,
    createPaymentIntent: async (params, requester) => {
      calls.push({ params, requester });
      return { paymentId: "pay-1", bookingId: params.bookingId, clientSecret: "secret", isReused: false };
    },
  };
}

const CLIENT = { user: { id: "user-1", role: "CLIENT" } };

describe("POST /api/payments/create-intent: autenticación y propiedad", () => {
  it("401 sin sesión y no llama al servicio", async () => {
    const service = fakeService();
    const res = await POST(postRequest({ bookingId: BOOKING_ID }), {
      sessionOverride: null,
      serviceOverride: service,
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, "UNAUTHORIZED");
    assert.equal(service.calls.length, 0);
  });

  it("403 si el rol no puede pagar", async () => {
    const service = fakeService();
    const res = await POST(postRequest({ bookingId: BOOKING_ID }), {
      sessionOverride: { user: { id: "u2", role: "QR_VALIDATOR" } },
      serviceOverride: service,
    });
    assert.equal(res.status, 403);
    assert.equal(service.calls.length, 0);
  });

  it("400 si el cuerpo no es JSON válido (antes devolvía 500)", async () => {
    const res = await POST(postRequest("{no-es-json"), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "MALFORMED_JSON");
  });

  it("400 si el bookingId no es un UUID", async () => {
    const res = await POST(postRequest({ bookingId: "123" }), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 400);
  });

  it("200 y pasa la identidad de la sesión al servicio", async () => {
    const service = fakeService();
    const res = await POST(postRequest({ bookingId: BOOKING_ID }), {
      sessionOverride: CLIENT,
      serviceOverride: service,
    });
    assert.equal(res.status, 200);
    assert.deepEqual(service.calls[0].requester, { id: "user-1", role: "CLIENT" });
  });

  it("403 si la reserva pertenece a otro usuario", async () => {
    const service = {
      createPaymentIntent: async () => {
        throw new ForbiddenBookingAccessError();
      },
    };
    const res = await POST(postRequest({ bookingId: BOOKING_ID }), {
      sessionOverride: CLIENT,
      serviceOverride: service,
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, "FORBIDDEN_BOOKING_ACCESS");
  });
});
