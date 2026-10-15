import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchMyReservations } from "../../src/features/reservations/api/reservations.api.ts";
import { describeReservationsError } from "../../src/features/reservations/hooks/use-my-reservations.ts";
import { ApiError } from "../../src/lib/api-client.ts";
import { toBogotaISODate } from "../../src/lib/format.ts";
import { clientSection } from "../../src/features/reservations/data/reservation-filters.ts";
import { computeOperationalStatus } from "../../src/features/reservations/dto/admin-reservation.dto.ts";

const PAGINATION = { page: 1, limit: 10, total: 1, totalPages: 1 };

describe("VCP-93 (frontend cliente): fetchMyReservations", () => {
  const realFetch = globalThis.fetch;
  let requested;

  function stubFetch(status, body) {
    globalThis.fetch = async (url) => {
      requested = url;
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    };
  }

  beforeEach(() => {
    requested = null;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("Sin parámetros consulta /api/reservations", async () => {
    stubFetch(200, { success: true, data: [], pagination: PAGINATION });
    await fetchMyReservations();
    assert.equal(requested, "/api/reservations");
  });

  test("Envía límite, orden y rango de fechas; omite el estado ALL", async () => {
    stubFetch(200, { success: true, data: [], pagination: PAGINATION });
    await fetchMyReservations({ limit: 20, order: "asc", dateFrom: "2026-10-20", status: "ALL" });
    const url = new URL(requested, "http://localhost");
    assert.equal(url.pathname, "/api/reservations");
    assert.equal(url.searchParams.get("limit"), "20");
    assert.equal(url.searchParams.get("order"), "asc");
    assert.equal(url.searchParams.get("dateFrom"), "2026-10-20");
    assert.equal(url.searchParams.has("status"), false);
  });

  test("Devuelve las reservas y la paginación del backend", async () => {
    stubFetch(200, { success: true, data: [{ id: "r1" }], pagination: { ...PAGINATION, total: 7 } });
    const page = await fetchMyReservations();
    assert.deepEqual(page.items, [{ id: "r1" }]);
    assert.equal(page.pagination.total, 7);
  });

  test("Usuario sin reservas: lista vacía, no error", async () => {
    stubFetch(200, { success: true, data: [], pagination: { ...PAGINATION, total: 0 } });
    const page = await fetchMyReservations();
    assert.deepEqual(page.items, []);
  });

  test("401 y 403 lanzan ApiError con el código HTTP", async () => {
    for (const status of [401, 403]) {
      stubFetch(status, { success: false, error: "UNAUTHORIZED", message: "sin sesión" });
      await assert.rejects(fetchMyReservations(), (err) => err instanceof ApiError && err.status === status);
    }
  });

  test("Un error de red lanza ApiError con status 0", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    await assert.rejects(fetchMyReservations(), (err) => err instanceof ApiError && err.status === 0);
  });

  test("Una respuesta con forma inesperada se rechaza en vez de mostrar datos corruptos", async () => {
    stubFetch(200, { success: true, data: "no-es-lista" });
    await assert.rejects(fetchMyReservations(), (err) => err instanceof ApiError && err.code === "INVALID_RESPONSE");
  });
});

describe("VCP-93 (frontend cliente): mensajes de error", () => {
  test("401, 403, red y error genérico tienen mensajes claros y distintos", () => {
    const messages = [
      describeReservationsError(new ApiError("x", 401)),
      describeReservationsError(new ApiError("x", 403)),
      describeReservationsError(new ApiError("x", 0)),
      describeReservationsError(new ApiError("x", 500)),
      describeReservationsError(new Error("boom")),
    ];
    assert.match(messages[0], /sesión/);
    assert.match(messages[1], /permiso/);
    assert.match(messages[2], /conectar/);
    assert.equal(new Set(messages.slice(0, 4)).size, 4);
    assert.equal(messages[3], messages[4]);
  });

  test("Nunca expone el mensaje técnico del servidor", () => {
    assert.equal(describeReservationsError(new ApiError("password=secreto", 500)).includes("secreto"), false);
  });
});

describe("VCP-93 (frontend cliente): fecha y estados", () => {
  test("toBogotaISODate usa la hora de Bogotá, no la del navegador", () => {
    assert.equal(toBogotaISODate(new Date("2026-10-21T03:30:00.000Z")), "2026-10-20");
    assert.equal(toBogotaISODate(new Date("2026-10-21T05:00:00.000Z")), "2026-10-21");
  });

  test("Estados reales de la base: expired → cancelada, completed y no_show → finalizada", () => {
    const start = new Date("2026-10-20T15:00:00.000Z");
    const end = new Date("2026-10-20T16:00:00.000Z");
    const now = new Date("2026-10-21T12:00:00.000Z");
    assert.equal(computeOperationalStatus("expired", start, end, null, now), "CANCELLED");
    assert.equal(computeOperationalStatus("completed", start, end, null, now), "FINISHED");
    assert.equal(computeOperationalStatus("no_show", start, end, null, now), "FINISHED");
  });

  test("Los estados que ya funcionaban no cambian", () => {
    const start = new Date("2026-10-20T15:00:00.000Z");
    const end = new Date("2026-10-20T16:00:00.000Z");
    const before = new Date("2026-10-19T12:00:00.000Z");
    assert.equal(computeOperationalStatus("confirmed", start, end, null, before), "CONFIRMED");
    assert.equal(computeOperationalStatus("cancelled", start, end, null, before), "CANCELLED");
    assert.equal(computeOperationalStatus("pending", start, end, new Date(before.getTime() + 600000), before), "PENDING");
    assert.equal(computeOperationalStatus("pending", start, end, new Date(before.getTime() - 1), before), "CANCELLED");
  });

  test("Secciones del cliente: canceladas, completadas y próximas", () => {
    assert.equal(clientSection({ status: "CANCELLED" }), "CANCELLED");
    assert.equal(clientSection({ status: "FINISHED" }), "COMPLETED");
    for (const status of ["PENDING", "CONFIRMED", "IN_PROGRESS"]) {
      assert.equal(clientSection({ status }), "UPCOMING", status);
    }
  });
});
