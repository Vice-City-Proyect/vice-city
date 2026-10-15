import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-key-vice-city-auth-123456";
process.env.ENABLE_MOCK_AUTH_HEADERS = "true";

const { GET: adminSummaryHandler } = await import(
  "../../src/app/api/reports/dashboard-summary/route.ts"
);
const { GET: employeeSummaryHandler } = await import("../../src/app/api/employee/summary/route.ts");
const { DashboardSummaryService, UPCOMING_RESERVATIONS_LIMIT } = await import(
  "../../src/features/reservations/services/dashboard-summary.service.ts"
);

function createRequest(path, role) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: "GET",
    headers: role ? { "x-user-role": role } : {},
  });
}

const SERVICE = {
  id: "srv-cancha-5",
  name: "Cancha Fútbol 5 Sintética",
  slug: "cancha-futbol-5",
  category: "SOCCER_MICRO",
  price: 80000,
  is_active: true,
};

function booking(id, startAt, { guests = 10, status = "confirmed", entered = false, ticketStatus = "valid" } = {}) {
  const start = new Date(startAt);
  return {
    id,
    user_id: "11111111-1111-4111-8111-111111111111",
    service_id: SERVICE.id,
    start_at: start,
    end_at: new Date(start.getTime() + 3600_000),
    status,
    quantity: guests,
    total_amount: 80000,
    cancelled_at: null,
    cancellation_reason: "motivo interno",
    notes: "nota interna",
    expires_at: null,
    created_at: new Date("2026-10-18T10:00:00.000Z"),
    updated_at: new Date("2026-10-18T10:00:00.000Z"),
    metadata: { code: `TK-${id.slice(-4)}`, channel: "WEB" },
    users: { id: "11111111-1111-4111-8111-111111111111", full_name: "Carlos Valderrama", email: "pibe@vicecity.com", phone: "+57 300 111 2233" },
    services: SERVICE,
    tickets: [
      {
        id: `t-${id}`,
        ticket_code: `TK-${id.slice(-4)}`,
        status: ticketStatus,
        created_at: new Date("2026-10-18T10:05:00.000Z"),
        used_at: null,
        access_logs: entered ? [{ id: "l1", result: "GRANTED", reason: null, access_point: "A", created_at: new Date() }] : [],
      },
    ],
    payments: [],
  };
}

describe("VCP-93: GET /api/reports/dashboard-summary (ADMIN)", () => {
  const summary = { pendingReservations: 3, activeUsers: 12, upcomingReservations: [] };
  let calls;
  const service = {
    getAdminSummary: async () => {
      calls += 1;
      return summary;
    },
  };

  beforeEach(() => {
    calls = 0;
  });

  test("Sin sesión responde 401 y no consulta nada", async () => {
    const res = await adminSummaryHandler(createRequest("/api/reports/dashboard-summary"), {
      summaryServiceOverride: service,
    });
    assert.equal(res.status, 401);
    assert.equal(calls, 0);
  });

  test("CLIENT, TICKET_SELLER y QR_VALIDATOR reciben 403", async () => {
    for (const role of ["CLIENT", "TICKET_SELLER", "QR_VALIDATOR"]) {
      const res = await adminSummaryHandler(createRequest("/api/reports/dashboard-summary", role), {
        summaryServiceOverride: service,
      });
      assert.equal(res.status, 403, role);
    }
    assert.equal(calls, 0);
  });

  test("ADMIN recibe 200 con el resumen", async () => {
    const res = await adminSummaryHandler(createRequest("/api/reports/dashboard-summary", "ADMIN"), {
      summaryServiceOverride: service,
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, summary);
  });

  test("Un fallo interno responde 500 sin filtrar el detalle", async () => {
    const res = await adminSummaryHandler(createRequest("/api/reports/dashboard-summary", "ADMIN"), {
      summaryServiceOverride: {
        getAdminSummary: async () => {
          throw new Error("password=secreto");
        },
      },
    });
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(JSON.stringify(body).includes("secreto"), false);
  });
});

describe("VCP-93: GET /api/employee/summary (empleados y admin)", () => {
  const summary = { date: "2026-10-20", todayReservations: 0, expectedVisitors: 0, pendingEntry: 0, activeServices: 5, reservations: [] };
  let calls;
  const service = {
    getEmployeeSummary: async () => {
      calls += 1;
      return summary;
    },
  };
  const call = (session) =>
    employeeSummaryHandler(createRequest("/api/employee/summary"), {
      sessionOverride: session,
      summaryServiceOverride: service,
    });

  beforeEach(() => {
    calls = 0;
  });

  test("Sin sesión responde 401", async () => {
    const res = await call(null);
    assert.equal(res.status, 401);
    assert.equal(calls, 0);
  });

  test("CLIENT recibe 403", async () => {
    const res = await call({ id: "c-1", role: "CLIENT" });
    assert.equal(res.status, 403);
    assert.equal(calls, 0);
  });

  test("TICKET_SELLER, QR_VALIDATOR y ADMIN reciben 200", async () => {
    for (const role of ["TICKET_SELLER", "QR_VALIDATOR", "ADMIN"]) {
      const res = await call({ id: "u-1", role });
      const body = await res.json();
      assert.equal(res.status, 200, role);
      assert.deepEqual(body.data, summary, role);
    }
  });

  test("Un fallo interno responde 500 sin filtrar el detalle", async () => {
    const res = await employeeSummaryHandler(createRequest("/api/employee/summary"), {
      sessionOverride: { id: "u-1", role: "ADMIN" },
      summaryServiceOverride: {
        getEmployeeSummary: async () => {
          throw new Error("password=secreto");
        },
      },
    });
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(JSON.stringify(body).includes("secreto"), false);
  });
});

describe("VCP-93: DashboardSummaryService", () => {
  // 20/oct/2026 10:00 en Bogotá
  const NOW = new Date("2026-10-20T15:00:00.000Z");
  let queries;
  let db;
  let service;
  let findManyResult;
  let counts;

  beforeEach(() => {
    queries = [];
    findManyResult = [];
    counts = { pending: 0, users: 0, services: 0 };
    db = {
      bookings: {
        count: async (args) => {
          queries.push({ op: "bookings.count", args });
          return counts.pending;
        },
        findMany: async (args) => {
          queries.push({ op: "bookings.findMany", args });
          return findManyResult;
        },
      },
      users: {
        count: async (args) => {
          queries.push({ op: "users.count", args });
          return counts.users;
        },
      },
      services: {
        count: async (args) => {
          queries.push({ op: "services.count", args });
          return counts.services;
        },
      },
    };
    service = new DashboardSummaryService({ db, nowFn: () => NOW });
  });

  test("Admin: pendientes cuentan solo reservas pending con HOLD vigente", async () => {
    counts.pending = 4;
    const result = await service.getAdminSummary();
    const q = queries.find((x) => x.op === "bookings.count");
    assert.equal(result.pendingReservations, 4);
    assert.equal(q.args.where.status, "pending");
    assert.deepEqual(q.args.where.expires_at, { gt: NOW });
  });

  test("Admin: usuarios activos cuentan solo cuentas con is_active", async () => {
    counts.users = 17;
    const result = await service.getAdminSummary();
    assert.equal(result.activeUsers, 17);
    assert.deepEqual(queries.find((x) => x.op === "users.count").args.where, { is_active: true });
  });

  test("Admin: próximas reservas confirmadas, ordenadas por inicio y limitadas", async () => {
    findManyResult = [booking("b0000000-0000-4000-8000-00000000a001", "2026-10-20T16:00:00.000Z")];
    const result = await service.getAdminSummary();
    const q = queries.find((x) => x.op === "bookings.findMany");
    assert.equal(q.args.where.status, "confirmed");
    assert.deepEqual(q.args.where.end_at, { gte: NOW });
    assert.deepEqual(q.args.orderBy, { start_at: "asc" });
    assert.equal(q.args.take, UPCOMING_RESERVATIONS_LIMIT);
    assert.equal(result.upcomingReservations.length, 1);
    assert.equal(result.upcomingReservations[0].serviceName, SERVICE.name);
  });

  test("Admin: sin datos devuelve ceros y lista vacía, no error", async () => {
    const result = await service.getAdminSummary();
    assert.deepEqual(result, { pendingReservations: 0, activeUsers: 0, upcomingReservations: [] });
  });

  test("Empleado: el día se acota en hora de Bogotá (UTC-5)", async () => {
    await service.getEmployeeSummary();
    const q = queries.find((x) => x.op === "bookings.findMany");
    assert.equal(q.args.where.start_at.gte.toISOString(), "2026-10-20T05:00:00.000Z");
    assert.equal(q.args.where.start_at.lte.toISOString(), "2026-10-21T04:59:59.999Z");
    assert.deepEqual(q.args.where.status, { in: ["confirmed", "completed"] });
  });

  test("Empleado: la medianoche de Bogotá no cambia de día por UTC", async () => {
    // 21/oct 03:30 UTC = 20/oct 22:30 en Bogotá
    const late = new DashboardSummaryService({ db, nowFn: () => new Date("2026-10-21T03:30:00.000Z") });
    const result = await late.getEmployeeSummary();
    assert.equal(result.date, "2026-10-20");
  });

  test("Empleado: cuenta reservas, visitantes esperados, por atender y servicios activos", async () => {
    counts.services = 5;
    findManyResult = [
      booking("b0000000-0000-4000-8000-00000000a001", "2026-10-20T15:00:00.000Z", { guests: 10 }),
      booking("b0000000-0000-4000-8000-00000000a002", "2026-10-20T17:00:00.000Z", { guests: 4, entered: true }),
      booking("b0000000-0000-4000-8000-00000000a003", "2026-10-20T19:00:00.000Z", { guests: 6 }),
    ];
    const result = await service.getEmployeeSummary();
    assert.equal(result.todayReservations, 3);
    assert.equal(result.expectedVisitors, 20);
    assert.equal(result.pendingEntry, 2);
    assert.equal(result.activeServices, 5);
    assert.deepEqual(queries.find((x) => x.op === "services.count").args.where, { is_active: true });
  });

  test("Empleado: no expone contacto del cliente ni notas internas", async () => {
    findManyResult = [booking("b0000000-0000-4000-8000-00000000a001", "2026-10-20T15:00:00.000Z")];
    const result = await service.getEmployeeSummary();
    const r = result.reservations[0];
    for (const field of ["clientEmail", "clientPhone", "notes", "cancellationReason", "cancelledAt", "createdAt", "updatedAt"]) {
      assert.equal(field in r, false, field);
    }
    assert.equal(r.clientName, "Carlos Valderrama");
    const raw = JSON.stringify(result);
    assert.equal(raw.includes("pibe@vicecity.com"), false);
    assert.equal(raw.includes("nota interna"), false);
  });

  test("Empleado: un QR cancelado no cuenta como por atender", async () => {
    findManyResult = [
      booking("b0000000-0000-4000-8000-00000000a001", "2026-10-20T15:00:00.000Z", { ticketStatus: "cancelled" }),
    ];
    const result = await service.getEmployeeSummary();
    assert.equal(result.todayReservations, 1);
    assert.equal(result.pendingEntry, 0);
  });

  test("Empleado: día sin reservas devuelve ceros y lista vacía", async () => {
    counts.services = 3;
    const result = await service.getEmployeeSummary();
    assert.deepEqual(result, {
      date: "2026-10-20",
      todayReservations: 0,
      expectedVisitors: 0,
      pendingEntry: 0,
      activeServices: 3,
      reservations: [],
    });
  });
});
