import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/reservations/route.ts";
import { SlotUnavailableError } from "../../src/features/reservations/errors/reservations.errors.ts";

function createRequest(body, contentType = "application/json") {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  return new NextRequest("http://localhost:3000/api/reservations", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID_BODY = {
  serviceId: "srv-1",
  startAt: "2099-06-02T15:00:00.000Z",
  endAt: "2099-06-02T16:00:00.000Z",
  quantity: 2,
};

const CLIENT = { id: "user-1", role: "CLIENT" };

function fakeService(result) {
  const calls = [];
  return {
    calls,
    createPendingReservation: async (input) => {
      calls.push(input);
      if (result instanceof Error) throw result;
      return result ?? { id: "bk-1", status: "pending", totalAmount: 4000, expiresAt: new Date() };
    },
  };
}

describe("API POST /api/reservations", () => {
  it("401 si no hay sesión", async () => {
    const res = await POST(createRequest(VALID_BODY), { serviceOverride: fakeService() });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error, "UNAUTHORIZED");
  });

  it("403 si el rol no puede reservar (QR_VALIDATOR)", async () => {
    const res = await POST(createRequest(VALID_BODY), {
      sessionOverride: { id: "u", role: "QR_VALIDATOR" },
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, "FORBIDDEN");
  });

  it("400 si el Content-Type no es application/json", async () => {
    const res = await POST(createRequest(VALID_BODY, "text/plain"), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_CONTENT_TYPE");
  });

  it("400 si el JSON está malformado", async () => {
    const res = await POST(createRequest("", "application/json"), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "MALFORMED_JSON");
  });

  it("400 si hay campos extra (.strict())", async () => {
    const res = await POST(
      createRequest({ ...VALID_BODY, price: 1, role: "ADMIN" }),
      { sessionOverride: CLIENT, serviceOverride: fakeService() }
    );
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "VALIDATION_ERROR");
  });

  it("400 si faltan campos obligatorios", async () => {
    const res = await POST(createRequest({ serviceId: "srv-1" }), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "VALIDATION_ERROR");
  });

  it("201 y crea la reserva en el servidor usando el id de sesión", async () => {
    const service = fakeService();
    const res = await POST(createRequest(VALID_BODY), {
      sessionOverride: CLIENT,
      serviceOverride: service,
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.status, "pending");
    assert.equal(service.calls.length, 1);
    assert.equal(service.calls[0].userId, "user-1");
    assert.equal(service.calls[0].serviceId, "srv-1");
    assert.ok(service.calls[0].startAt instanceof Date);
  });

  it("mapea los errores de dominio de reservas a su statusCode", async () => {
    const res = await POST(createRequest(VALID_BODY), {
      sessionOverride: CLIENT,
      serviceOverride: fakeService(new SlotUnavailableError()),
    });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, "SLOT_UNAVAILABLE");
  });
});