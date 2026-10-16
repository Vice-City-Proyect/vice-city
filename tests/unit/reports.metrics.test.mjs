/**
 * FT-08 / HU27: Pruebas Unitarias para Métricas de Ventas y Ocupación
 *
 * Criterios de Aceptación evaluados:
 * [x] CA01 - Las cifras coinciden con las reservas y pagos registrados (Total, Web vs POS).
 * [x] CA02 - Cada filtro de período ('day', 'week', 'month', 'year') devuelve el rango correcto en America/Bogota.
 * [x] CA03 - Caso de error: un usuario sin rol ADMIN recibe 403 (y 401 si no está autenticado).
 * [x] CA04 - Caso límite: un período sin ventas devuelve ceros limpios, no error.
 */

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-key-vice-city-auth-123456";
process.env.ENABLE_MOCK_AUTH_HEADERS = "true";

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  MetricsService,
  getDateRangeInBogota,
} from "../../src/features/reports/index.ts";
import { NextRequest } from "next/server";

const { GET } = await import("../../src/app/api/reports/metrics/route.ts");

describe("FT-08 / HU27: Métricas de Ventas y Ocupación (Criterios de Aceptación)", () => {
  let mockServices;
  let mockPayments;
  let mockBookings;
  let metricsService;

  beforeEach(() => {
    // 1. Mock de Servicios Deportivos
    mockServices = [
      {
        id: "srv-futbol-1",
        name: "Cancha de Fútbol Grande",
        slug: "cancha-futbol-grande",
        capacity: 11,
        price: 140000,
        currency: "COP",
        is_active: true,
        categories: { name: "Canchas" },
      },
      {
        id: "srv-piscina-1",
        name: "Piscina Adultos 1",
        slug: "piscina-adultos-1",
        capacity: 50,
        price: 2000,
        currency: "COP",
        is_active: true,
        categories: { name: "Piscinas" },
      },
      {
        id: "srv-gym-1",
        name: "Gimnasio",
        slug: "gimnasio",
        capacity: 20,
        price: 2000,
        currency: "COP",
        is_active: true,
        categories: { name: "Gimnasio" },
      },
    ];

    // 2. Mock de Pagos en el período (Octubre 2026 en Bogotá)
    // - Venta 1: Web (Stripe) por $140.000 (Cancha de Fútbol) el 2026-10-10 10:00 Bogotá
    // - Venta 2: POS (Taquilla) por $20.000 (Piscina x 10 personas) el 2026-10-10 14:00 Bogotá
    // - Venta 3: POS (Taquilla) por $6.000 (Gimnasio x 3 personas) el 2026-10-12 09:00 Bogotá
    mockPayments = [
      {
        id: "pay-web-1",
        booking_id: "book-1",
        amount: 140000,
        currency: "COP",
        method: "card",
        status: "approved",
        provider: "stripe",
        paid_at: new Date("2026-10-10T15:00:00.000Z"), // 10:00 AM Bogotá (UTC-5)
        created_at: new Date("2026-10-10T15:00:00.000Z"),
        bookings: {
          id: "book-1",
          service_id: "srv-futbol-1",
          quantity: 1,
          total_amount: 140000,
          status: "confirmed",
          metadata: { payment_intent_id: "pi_test_123" },
          services: mockServices[0],
        },
      },
      {
        id: "pay-pos-1",
        booking_id: "book-2",
        amount: 20000,
        currency: "COP",
        method: "cash",
        status: "approved",
        provider: "pos_terminal",
        paid_at: new Date("2026-10-10T19:00:00.000Z"), // 14:00 Bogotá
        created_at: new Date("2026-10-10T19:00:00.000Z"),
        bookings: {
          id: "book-2",
          service_id: "srv-piscina-1",
          quantity: 10,
          total_amount: 20000,
          status: "confirmed",
          metadata: { pos_sale: true, seller_id: "seller-uuid" },
          services: mockServices[1],
        },
      },
      {
        id: "pay-pos-2",
        booking_id: "book-3",
        amount: 6000,
        currency: "COP",
        method: "card",
        status: "approved",
        provider: "pos_terminal",
        paid_at: new Date("2026-10-12T14:00:00.000Z"), // 09:00 Bogotá
        created_at: new Date("2026-10-12T14:00:00.000Z"),
        bookings: {
          id: "book-3",
          service_id: "srv-gym-1",
          quantity: 3,
          total_amount: 6000,
          status: "confirmed",
          metadata: { pos_sale: true },
          services: mockServices[2],
        },
      },
    ];

    mockBookings = mockPayments.map((p) => p.bookings);

    metricsService = new MetricsService({
      findAllServicesFn: async () => mockServices,
      findPaymentsFn: async () => mockPayments,
      findBookingsFn: async () => mockBookings,
    });
  });

  // ---------------------------------------------------------------------------
  // CA01: Las cifras coinciden con las reservas y pagos registrados
  // ---------------------------------------------------------------------------
  test("CA01 — Las cifras de ingresos y reservas coinciden con la BD y separan Web vs POS", async () => {
    const referenceDate = new Date("2026-10-12T17:00:00.000Z"); // Octubre 2026
    const result = await metricsService.getMetrics("month", referenceDate);

    // Verificación de ingresos
    assert.equal(result.summary.totalRevenue, 166000); // 140.000 + 20.000 + 6.000
    assert.equal(result.summary.webRevenue, 140000);   // Stripe
    assert.equal(result.summary.posRevenue, 26000);    // 20.000 + 6.000 POS

    // Verificación de reservas
    assert.equal(result.summary.totalReservations, 3);
    assert.equal(result.summary.webReservations, 1);
    assert.equal(result.summary.posReservations, 2);

    // Servicio Top en facturación
    assert.equal(result.summary.topService, "Cancha de Fútbol Grande");

    // Top Day (Sábado 2026-10-10 tuvo $160.000 facturados vs Lunes 2026-10-12 con $6.000)
    assert.equal(result.summary.topDay, "Sábado");
    assert.equal(result.topSalesDays[0].date, "2026-10-10");
    assert.equal(result.topSalesDays[0].totalRevenue, 160000);
    assert.equal(result.topSalesDays[0].reservationsCount, 2);

    // Ocupación por servicio
    const futbolMetric = result.occupancyByService.find((s) => s.serviceId === "srv-futbol-1");
    assert.ok(futbolMetric);
    assert.equal(futbolMetric.revenue, 140000);
    assert.equal(futbolMetric.bookedCount, 1);
    assert.equal(futbolMetric.webBookings, 1);
    assert.equal(futbolMetric.posBookings, 0);

    const piscinaMetric = result.occupancyByService.find((s) => s.serviceId === "srv-piscina-1");
    assert.ok(piscinaMetric);
    assert.equal(piscinaMetric.revenue, 20000);
    assert.equal(piscinaMetric.bookedCount, 10);
    assert.equal(piscinaMetric.posBookings, 1);
  });

  // ---------------------------------------------------------------------------
  // CA02: Cada filtro de período devuelve el rango correcto en America/Bogota
  // ---------------------------------------------------------------------------
  test("CA02 — Cada filtro de período ('day', 'week', 'month', 'year') calcula el rango correcto en America/Bogota", () => {
    // Referencia: Lunes 12 de Octubre de 2026 a las 12:00 UTC (07:00 AM Bogotá)
    const refDate = new Date("2026-10-12T12:00:00.000Z");

    // 1. Período: DAY
    const dayRange = getDateRangeInBogota("day", refDate);
    assert.equal(dayRange.metricsRange.timezone, "America/Bogota");
    assert.equal(dayRange.metricsRange.start, "2026-10-12T00:00:00.000-05:00");
    assert.equal(dayRange.metricsRange.end, "2026-10-12T23:59:59.999-05:00");
    assert.equal(dayRange.startDate.toISOString(), "2026-10-12T05:00:00.000Z");
    assert.equal(dayRange.endDate.toISOString(), "2026-10-13T04:59:59.999Z");

    // 2. Período: WEEK (Lunes 12 a Domingo 18 de Octubre)
    const weekRange = getDateRangeInBogota("week", refDate);
    assert.equal(weekRange.metricsRange.start, "2026-10-12T00:00:00.000-05:00");
    assert.equal(weekRange.metricsRange.end, "2026-10-18T23:59:59.999-05:00");
    assert.equal(weekRange.startDate.toISOString(), "2026-10-12T05:00:00.000Z");
    assert.equal(weekRange.endDate.toISOString(), "2026-10-19T04:59:59.999Z");

    // 3. Período: MONTH (Octubre 1 al 31)
    const monthRange = getDateRangeInBogota("month", refDate);
    assert.equal(monthRange.metricsRange.start, "2026-10-01T00:00:00.000-05:00");
    assert.equal(monthRange.metricsRange.end, "2026-10-31T23:59:59.999-05:00");
    assert.equal(monthRange.startDate.toISOString(), "2026-10-01T05:00:00.000Z");
    assert.equal(monthRange.endDate.toISOString(), "2026-11-01T04:59:59.999Z");

    // 4. Período: YEAR (Enero 1 a Diciembre 31)
    const yearRange = getDateRangeInBogota("year", refDate);
    assert.equal(yearRange.metricsRange.start, "2026-01-01T00:00:00.000-05:00");
    assert.equal(yearRange.metricsRange.end, "2026-12-31T23:59:59.999-05:00");
    assert.equal(yearRange.startDate.toISOString(), "2026-01-01T05:00:00.000Z");
    assert.equal(yearRange.endDate.toISOString(), "2027-01-01T04:59:59.999Z");
  });

  // ---------------------------------------------------------------------------
  // CA03: Caso de error: usuario sin rol ADMIN recibe 403 (o 401 sin sesión)
  // ---------------------------------------------------------------------------
  test("CA03 — Endpoint rechaza con 403 a usuarios con rol no ADMIN y 401 si no hay credenciales", async () => {
    // a. Usuario con rol CLIENT -> 403 Forbidden
    const reqClient = new NextRequest("http://localhost:3000/api/reports/metrics?period=month", {
      headers: { "x-user-role": "CLIENT" },
    });
    const resClient = await GET(reqClient);
    assert.equal(resClient.status, 403);
    const bodyClient = await resClient.json();
    assert.equal(bodyClient.error, "Forbidden");

    // b. Usuario con rol TICKET_SELLER -> 403 Forbidden
    const reqSeller = new NextRequest("http://localhost:3000/api/reports/metrics?period=month", {
      headers: { "x-user-role": "TICKET_SELLER" },
    });
    const resSeller = await GET(reqSeller);
    assert.equal(resSeller.status, 403);

    // c. Sin credenciales de autenticación -> 401 Unauthorized
    const reqNoAuth = new NextRequest("http://localhost:3000/api/reports/metrics?period=month");
    const resNoAuth = await GET(reqNoAuth);
    assert.equal(resNoAuth.status, 401);

    // d. Con rol ADMIN -> 200 OK
    const reqAdmin = new NextRequest("http://localhost:3000/api/reports/metrics?period=month", {
      headers: { "x-user-role": "ADMIN" },
    });
    const resAdmin = await GET(reqAdmin, { metricsServiceOverride: metricsService });
    assert.equal(resAdmin.status, 200);
    const bodyAdmin = await resAdmin.json();
    assert.equal(bodyAdmin.success, true);
    assert.ok(bodyAdmin.data);
  });

  // ---------------------------------------------------------------------------
  // CA04: Caso límite: un período sin ventas devuelve ceros, no error
  // ---------------------------------------------------------------------------
  test("CA04 — Período sin ventas devuelve ceros limpios ('0' y 'N/A') sin arrojar error", async () => {
    const emptyMetricsService = new MetricsService({
      findAllServicesFn: async () => mockServices,
      findPaymentsFn: async () => [],
      findBookingsFn: async () => [],
    });

    const result = await emptyMetricsService.getMetrics("month", new Date("2026-10-12T12:00:00Z"));

    // Comprobación de que no lanza error y retorna ceros
    assert.equal(result.summary.totalRevenue, 0);
    assert.equal(result.summary.webRevenue, 0);
    assert.equal(result.summary.posRevenue, 0);
    assert.equal(result.summary.totalReservations, 0);
    assert.equal(result.summary.webReservations, 0);
    assert.equal(result.summary.posReservations, 0);
    assert.equal(result.summary.averageOccupancy, 0);
    assert.equal(result.summary.topService, "N/A");
    assert.equal(result.summary.topDay, "N/A");

    // Listas vacías o con valores en cero
    assert.equal(result.topSalesDays.length, 0);
    assert.ok(result.revenueFlow.every((p) => p.value === 0 && p.webValue === 0 && p.posValue === 0));

    // Los servicios se reportan con aforo pero 0 reservas
    assert.equal(result.occupancyByService.length, mockServices.length);
    for (const item of result.occupancyByService) {
      assert.equal(item.bookedCount, 0);
      assert.equal(item.occupancyRate, 0);
      assert.equal(item.revenue, 0);
    }
  });
});

