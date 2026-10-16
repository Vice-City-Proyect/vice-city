import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/api/reservations/route.ts";
import { AdminReservationsService } from "../../src/features/reservations/services/admin-reservations.service.ts";
import { listReservationsQuerySchema } from "../../src/features/reservations/schemas/list-reservations.schema.ts";

function createRequest(path) {
  return new NextRequest(new URL(path, "http://localhost:3000"), { method: "GET" });
}

const CLIENT_A = { id: "11111111-1111-4111-8111-111111111111", role: "CLIENT", email: "a@vicecity.com" };
const CLIENT_B = { id: "22222222-2222-4222-8222-222222222222", role: "CLIENT", email: "b@vicecity.com" };
const ADMIN = { id: "33333333-3333-4333-8333-333333333333", role: "ADMIN", email: "admin@vicecity.com" };
const SELLER = { id: "44444444-4444-4444-8444-444444444444", role: "TICKET_SELLER", email: "t@vicecity.com" };

const SERVICE = {
  id: "srv-cancha-5",
  name: "Cancha Fútbol 5 Sintética",
  slug: "cancha-futbol-5",
  category: "SOCCER_MICRO",
  price: 80000,
  max_capacity: 10,
  is_active: true,
  duration_hours: 1,
};

function booking(id, user, startAt, status = "confirmed") {
  const start = new Date(startAt);
  return {
    id,
    user_id: user.id,
    service_id: SERVICE.id,
    start_at: start,
    end_at: new Date(start.getTime() + 3600_000),
    status,
    total_amount: 80000,
    guests_count: 10,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: new Date("2026-10-18T10:00:00.000Z"),
    updated_at: new Date("2026-10-18T10:00:00.000Z"),
    metadata: { code: `TK-${id.slice(-4)}`, discountType: "NONE", discountPercent: 0, channel: "WEB" },
    users: { id: user.id, full_name: `Cliente ${user.email}`, email: user.email, phone: null },
    services: SERVICE,
    tickets: [],
    payments: [],
  };
}

describe("VCP-93: GET /api/reservations - listado por usuario", () => {
  let calls;
  let listService;

  beforeEach(() => {
    calls = [];
    listService = {
      listReservations: async (filters, scope) => {
        calls.push({ filters, scope });
        return {
          reservations: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        };
      },
    };
  });

  const call = (path, session) =>
    GET(createRequest(path), { sessionOverride: session, listServiceOverride: listService });

  test("Sin sesión responde 401 y no consulta nada", async () => {
    const res = await GET(createRequest("/api/reservations"), {
      sessionOverride: null,
      listServiceOverride: listService,
    });
    // Sin override ni cookie, getServerSession no encuentra sesión
    assert.equal(res.status, 401);
    assert.equal(calls.length, 0);
  });

  test("Rol sin permiso (TICKET_SELLER) responde 403 y no consulta nada", async () => {
    const res = await call("/api/reservations", SELLER);
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.error, "FORBIDDEN");
    assert.equal(calls.length, 0);
  });

  test("CLIENT: el alcance sale de la sesión", async () => {
    const res = await call("/api/reservations", CLIENT_A);
    assert.equal(res.status, 200);
    assert.equal(calls[0].scope.userId, CLIENT_A.id);
  });

  test("CLIENT no puede pedir reservas ajenas con userId ni clientId en la URL", async () => {
    await call(`/api/reservations?userId=${CLIENT_B.id}&clientId=${CLIENT_B.id}`, CLIENT_A);
    assert.equal(calls[0].scope.userId, CLIENT_A.id);
    assert.equal("userId" in calls[0].filters, false);
  });

  test("ADMIN ve todas: sin filtro de usuario", async () => {
    await call("/api/reservations", ADMIN);
    assert.equal(calls[0].scope.userId, undefined);
  });

  test("Reenvía estado, servicio, rango de fechas, orden y paginación", async () => {
    const serviceId = "e2a4b860-9114-41d7-b35a-40a256191f4d";
    const res = await call(
      `/api/reservations?status=confirmed&serviceId=${serviceId}&dateFrom=2026-10-01&dateTo=2026-10-31&order=asc&page=2&limit=5`,
      CLIENT_A
    );
    assert.equal(res.status, 200);
    assert.deepEqual(calls[0].filters, { page: 2, limit: 5, status: "CONFIRMED", serviceId });
    assert.equal(calls[0].scope.dateFrom, "2026-10-01");
    assert.equal(calls[0].scope.dateTo, "2026-10-31");
    assert.equal(calls[0].scope.order, "asc");
  });

  test("Valores por defecto: página 1, 10 por página, orden descendente", async () => {
    await call("/api/reservations", CLIENT_A);
    assert.equal(calls[0].filters.page, 1);
    assert.equal(calls[0].filters.limit, 10);
    assert.equal(calls[0].scope.order, "desc");
  });

  test("Parámetros inválidos responden 400 con detalle", async () => {
    for (const query of [
      "status=NOPE",
      "dateFrom=15-10-2026",
      "dateFrom=2026-10-31&dateTo=2026-10-01",
      "limit=1000",
      "page=0",
      "order=sideways",
      "serviceId=no-es-uuid",
    ]) {
      const res = await call(`/api/reservations?${query}`, CLIENT_A);
      const body = await res.json();
      assert.equal(res.status, 400, query);
      assert.equal(body.error, "VALIDATION_ERROR", query);
      assert.ok(Array.isArray(body.details), query);
    }
    assert.equal(calls.length, 0);
  });

  test("Usuario sin reservas: 200 con lista vacía (estado vacío, no error)", async () => {
    const res = await call("/api/reservations", CLIENT_A);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(body.data, []);
    assert.equal(body.pagination.total, 0);
  });

  test("Un fallo del servicio responde 500 sin filtrar el detalle interno", async () => {
    const failing = {
      listReservations: async () => {
        throw new Error("password=secreto");
      },
    };
    const res = await GET(createRequest("/api/reservations"), {
      sessionOverride: CLIENT_A,
      listServiceOverride: failing,
    });
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(body.error, "INTERNAL_SERVER_ERROR");
    assert.equal(JSON.stringify(body).includes("secreto"), false);
  });

  test("Esquema: ignora search, slot y date (no aplican al cliente)", () => {
    const parsed = listReservationsQuerySchema.parse({ search: "x", slot: "10:00", date: "2026-10-10" });
    assert.equal("search" in parsed, false);
    assert.equal("slot" in parsed, false);
    assert.equal("date" in parsed, false);
  });
});

describe("VCP-93: AdminReservationsService.listReservations con alcance", () => {
  const bookings = [
    booking("b0000000-0000-4000-8000-00000000a001", CLIENT_A, "2026-10-20T15:00:00.000Z"),
    booking("b0000000-0000-4000-8000-00000000a002", CLIENT_A, "2026-10-25T15:00:00.000Z", "pending"),
    booking("b0000000-0000-4000-8000-00000000b001", CLIENT_B, "2026-10-21T15:00:00.000Z"),
  ];
  let captured;
  let service;

  beforeEach(() => {
    captured = null;
    const db = {
      bookings: {
        count: async ({ where }) => bookings.filter((b) => !where.user_id || b.user_id === where.user_id).length,
        findMany: async (args) => {
          captured = args;
          return bookings.filter((b) => !args.where.user_id || b.user_id === args.where.user_id);
        },
      },
    };
    service = new AdminReservationsService({ db, nowFn: () => new Date("2026-10-19T12:00:00.000Z") });
  });

  test("Con userId solo devuelve las reservas de ese usuario; dos clientes ven datos distintos", async () => {
    const a = await service.listReservations({ page: 1, limit: 10 }, { userId: CLIENT_A.id });
    const b = await service.listReservations({ page: 1, limit: 10 }, { userId: CLIENT_B.id });

    assert.equal(captured.where.user_id, CLIENT_B.id);
    assert.deepEqual(a.reservations.map((r) => r.clientId), [CLIENT_A.id, CLIENT_A.id]);
    assert.deepEqual(b.reservations.map((r) => r.clientId), [CLIENT_B.id]);
    assert.equal(a.pagination.total, 2);
    assert.equal(b.pagination.total, 1);
  });

  test("Sin alcance (ADMIN) no filtra por usuario", async () => {
    const all = await service.listReservations({ page: 1, limit: 10 });
    assert.equal("user_id" in captured.where, false);
    assert.equal(all.reservations.length, 3);
  });

  test("Rango de fechas en hora de Bogotá (UTC-5), inclusivo en ambos extremos", async () => {
    await service.listReservations({ page: 1, limit: 10 }, { dateFrom: "2026-10-20", dateTo: "2026-10-22" });
    assert.equal(captured.where.start_at.gte.toISOString(), "2026-10-20T05:00:00.000Z");
    assert.equal(captured.where.start_at.lte.toISOString(), "2026-10-23T04:59:59.999Z");
  });

  test("Solo dateFrom o solo dateTo funcionan por separado", async () => {
    await service.listReservations({ page: 1, limit: 10 }, { dateFrom: "2026-10-20" });
    assert.ok(captured.where.start_at.gte);
    assert.equal("lte" in captured.where.start_at, false);

    await service.listReservations({ page: 1, limit: 10 }, { dateTo: "2026-10-20" });
    assert.ok(captured.where.start_at.lte);
    assert.equal("gte" in captured.where.start_at, false);
  });

  test("Orden por fecha de inicio: desc por defecto y asc a pedido", async () => {
    await service.listReservations({ page: 1, limit: 10 });
    assert.deepEqual(captured.orderBy, { start_at: "desc" });
    await service.listReservations({ page: 1, limit: 10 }, { order: "asc" });
    assert.deepEqual(captured.orderBy, { start_at: "asc" });
  });

  test("Paginación: salta y toma según página y límite", async () => {
    await service.listReservations({ page: 3, limit: 5 }, { userId: CLIENT_A.id });
    assert.equal(captured.skip, 10);
    assert.equal(captured.take, 5);
  });

  test("El filtro de estado sigue funcionando junto al alcance de usuario", async () => {
    await service.listReservations({ page: 1, limit: 10, status: "PENDING" }, { userId: CLIENT_A.id });
    assert.equal(captured.where.status, "pending");
    assert.equal(captured.where.user_id, CLIENT_A.id);
  });
});
