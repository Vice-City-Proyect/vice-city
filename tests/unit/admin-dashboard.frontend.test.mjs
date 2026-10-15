import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fetchAdminDashboardSummary } from "../../src/features/reservations/api/reservations.api.ts";
import { describeReservationsError } from "../../src/features/reservations/hooks/use-my-reservations.ts";
import { ApiError } from "../../src/lib/api-client.ts";
import { DashboardStats } from "../../src/features/administration/components/DashboardStats.tsx";
import { UpcomingReservations } from "../../src/features/administration/components/UpcomingReservations.tsx";

const SUMMARY = { totalReservations: 4, totalRevenue: 160000, averageOccupancy: 35 };

const RESERVATION = {
  id: "r1",
  code: "TK-0001",
  clientId: "c1",
  clientName: "Carlos Valderrama",
  serviceId: "s1",
  serviceName: "Cancha Fútbol 5 Sintética",
  category: "SOCCER_MICRO",
  resource: "Cancha Principal A",
  date: "2026-10-20",
  startTime: "10:00",
  endTime: "11:00",
  guests: 10,
  hours: 1,
  basePrice: 80000,
  discountType: "NONE",
  discountPercent: 0,
  total: 80000,
  status: "CONFIRMED",
  paymentStatus: "CONFIRMED",
  holdState: "NONE",
  holdExpiresAt: null,
  type: "NORMAL",
  accessStatus: "NOT_ENTERED",
  qrStatus: "VALID",
  wristbandColor: "GREEN",
  createdBy: "WEB",
};

describe("VCP-93 (admin): fetchAdminDashboardSummary", () => {
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

  test("Consulta /api/reports/dashboard-summary y entrega el contenido de data", async () => {
    const data = { pendingReservations: 3, activeUsers: 12, upcomingReservations: [RESERVATION] };
    stubFetch(200, { success: true, data });
    const result = await fetchAdminDashboardSummary();
    assert.equal(requested, "/api/reports/dashboard-summary");
    assert.deepEqual(result, data);
  });

  test("401 y 403 lanzan ApiError con el código HTTP", async () => {
    for (const status of [401, 403]) {
      stubFetch(status, { success: false, error: "FORBIDDEN", message: "no" });
      await assert.rejects(fetchAdminDashboardSummary(), (err) => err instanceof ApiError && err.status === status);
    }
  });

  test("Un error de red lanza ApiError con status 0", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    await assert.rejects(fetchAdminDashboardSummary(), (err) => err instanceof ApiError && err.status === 0);
  });

  test("El mensaje de error del resumen nombra lo que no se pudo ver", () => {
    assert.match(describeReservationsError(new ApiError("x", 401), "ver el resumen"), /ver el resumen/);
    assert.match(describeReservationsError(new ApiError("x", 401)), /ver tus reservas/);
  });
});

describe("VCP-93 (admin): tarjetas del dashboard", () => {
  test("Con los datos del resumen muestra Pendientes y Usuarios con sus cifras", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardStats, { summary: SUMMARY, pendingReservations: 3, activeUsers: 12 })
    );
    assert.match(html, /Pendientes/);
    assert.match(html, /Usuarios/);
    assert.match(html, />3</);
    assert.match(html, />12</);
  });

  test("Cero es un dato válido: se muestra 0 y no se oculta la tarjeta", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardStats, { summary: SUMMARY, pendingReservations: 0, activeUsers: 0 })
    );
    assert.match(html, /Pendientes/);
    assert.match(html, /Usuarios/);
  });

  test("Sin datos del resumen no inventa cifras: las tarjetas no aparecen", () => {
    const html = renderToStaticMarkup(createElement(DashboardStats, { summary: SUMMARY }));
    assert.doesNotMatch(html, /Pendientes/);
    assert.doesNotMatch(html, /Usuarios/);
    assert.match(html, /Reservas de hoy/);
  });
});

describe("VCP-93 (admin): próximas reservas", () => {
  test("Muestra las reservas recibidas del backend, en el orden recibido", () => {
    const second = { ...RESERVATION, id: "r2", clientName: "Falcao García", date: "2026-10-21" };
    const html = renderToStaticMarkup(
      createElement(UpcomingReservations, { reservations: [RESERVATION, second] })
    );
    assert.match(html, /Carlos Valderrama/);
    assert.match(html, /Falcao García/);
    assert.ok(html.indexOf("Carlos Valderrama") < html.indexOf("Falcao García"));
  });

  test("Sin reservas muestra el estado vacío", () => {
    const html = renderToStaticMarkup(createElement(UpcomingReservations, { reservations: [] }));
    assert.match(html, /Sin reservas próximas/);
  });

  test("No contiene datos de ejemplo: solo aparece lo que recibe", () => {
    const html = renderToStaticMarkup(createElement(UpcomingReservations, { reservations: [] }));
    assert.doesNotMatch(html, /Valderrama/);
  });
});
