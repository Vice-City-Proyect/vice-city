import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/payments/checkout/route.ts";
import { BookingNotPayableError } from "../../src/features/payments/errors/payments.errors.ts";

function createRequest(body, contentType = "application/json") {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  return new NextRequest("http://localhost:3000/api/payments/checkout", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const CLIENT = { id: "user-1", role: "CLIENT" };

function fakeService(result) {
  const calls = [];
  return {
    calls,
    createCheckoutSession: async (bookingId, user) => {
      calls.push({ bookingId, user });
      if (result instanceof Error) throw result;
      return (
        result ?? {
          bookingId,
          sessionId: "cs_test_1",
          checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
          amount: 4000,
          currency: "COP",
        }
      );
    },
  };
}

describe("API POST /api/payments/checkout", () => {
  it("401 si no hay sesión", async () => {
    const res = await POST(createRequest({ bookingId: "bk-1" }), { serviceOverride: fakeService() });
    assert.equal(res.status, 401);
  });

  it("403 si el rol no puede pagar", async () => {
    const res = await POST(createRequest({ bookingId: "bk-1" }), {
      sessionOverride: { id: "u", role: "TICKET_SELLER" },
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, "FORBIDDEN");
  });

  it("400 si el Content-Type es incorrecto", async () => {
    const res = await POST(createRequest({ bookingId: "bk-1" }, "text/plain"), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_CONTENT_TYPE");
  });

  it("400 si faltan campos o hay extras (.strict())", async () => {
    const missing = await POST(createRequest({}), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, "VALIDATION_ERROR");

    const extra = await POST(createRequest({ bookingId: "bk-1", amount: 1 }), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(extra.status, 400);
    assert.equal((await extra.json()).error, "VALIDATION_ERROR");
  });

  it("200 y delega con el id de sesión y el rol", async () => {
    const service = fakeService();
    const res = await POST(createRequest({ bookingId: "bk-1" }), {
      sessionOverride: CLIENT,
      serviceOverride: service,
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.checkoutUrl, "https://checkout.stripe.com/c/pay/cs_test_1");
    assert.deepEqual(service.calls[0], {
      bookingId: "bk-1",
      user: { id: "user-1", role: "CLIENT" },
    });
  });

  it("mapea los errores de pago a su statusCode (409 reserva no pagable)", async () => {
    const res = await POST(createRequest({ bookingId: "bk-1" }), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(new BookingNotPayableError()),
    });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, "BOOKING_NOT_PAYABLE");
  });
});