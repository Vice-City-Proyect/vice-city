import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/payments/webhook/route.ts";
import {
  InvalidStripeSignatureError,
  StripeNotConfiguredError,
} from "../../src/features/payments/errors/payments.errors.ts";

function createRequest(body, signature) {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  if (signature) headers.set("stripe-signature", signature);
  return new NextRequest("http://localhost:3000/api/payments/webhook", {
    method: "POST",
    headers,
    body,
  });
}

function fakeService(impl) {
  return { handleRaw: impl };
}

describe("API POST /api/payments/webhook", () => {
  it("400 si falta el encabezado stripe-signature", async () => {
    const res = await POST(createRequest("{}"), { serviceOverride: fakeService(async () => ({})) });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "MISSING_SIGNATURE");
  });

  it("400 si el cuerpo está vacío", async () => {
    const res = await POST(createRequest("", "t=1,v1=x"), {
      serviceOverride: fakeService(async () => ({})),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "EMPTY_BODY");
  });

  it("200 y entrega el resultado del servicio", async () => {
    const res = await POST(createRequest('{"id":"evt_1"}', "t=1,v1=x"), {
      serviceOverride: fakeService(async () => ({
        received: true,
        handled: true,
        type: "checkout.session.completed",
        confirmed: true,
      })),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.received, true);
    assert.equal(data.confirmed, true);
  });

  it("400 si la firma es inválida", async () => {
    const res = await POST(createRequest("{}", "t=1,v1=bad"), {
      serviceOverride: fakeService(async () => {
        throw new InvalidStripeSignatureError();
      }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_STRIPE_SIGNATURE");
  });

  it("503 si Stripe no está configurado", async () => {
    const res = await POST(createRequest("{}", "t=1,v1=x"), {
      serviceOverride: fakeService(async () => {
        throw new StripeNotConfiguredError();
      }),
    });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, "STRIPE_NOT_CONFIGURED");
  });
});