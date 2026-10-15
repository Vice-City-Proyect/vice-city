import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  AdminReservationsService,
} from "../../src/features/reservations/services/admin-reservations.service.ts";
import {
  BookingNotFoundError,
  InvalidDurationError,
} from "../../src/features/reservations/errors/reservation.errors.ts";
import {
  SlotUnavailableError,
  CapacityExceededError,
} from "../../src/features/reservations/errors/reservations.errors.ts";

describe("MR1: AdminReservationsService - Lógica de Negocio", () => {
  let mockBookings;
  let mockServices;
  let mockDb;
  let mockAvailability;
  let service;

  const FIXED_NOW = new Date("2026-10-20T15:00:00.000Z"); // 10:00 Bogota

  beforeEach(() => {
    mockServices = [
      {
        id: "srv-cancha-5",
        name: "Cancha Fútbol 5 Sintética",
        description: "Cancha sintética profesional",
        category: "SOCCER_MICRO",
        price: 80000,
        court_type: "MICRO_FUTBOL",
        max_capacity: 10,
        is_active: true,
        duration_hours: 1,
      },
      {
        id: "srv-piscina",
        name: "Piscina Olímpica",
        description: "Piscina climatizada",
        category: "POOL",
        price: 25000,
        court_type: "SWIMMING_POOL",
        max_capacity: 50,
        is_active: true,
        duration_hours: 1,
      },
    ];

    mockBookings = [
      {
        id: "b0000000-0000-0000-0000-000000000001",
        user_id: "u0000000-0000-0000-0000-000000000001",
        service_id: "srv-cancha-5",
        // 10:00 to 11:00 Bogota (15:00 to 16:00 UTC) -> IN_PROGRESS at FIXED_NOW
        start_at: new Date("2026-10-20T15:00:00.000Z"),
        end_at: new Date("2026-10-20T16:00:00.000Z"),
        status: "confirmed",
        total_amount: 80000,
        guests_count: 10,
        cancelled_at: null,
        cancellation_reason: null,
        created_at: new Date("2026-10-18T10:00:00.000Z"),
        updated_at: new Date("2026-10-18T10:00:00.000Z"),
        metadata: {
          code: "TK-CONF-001",
          discountType: "NONE",
          discountPercent: 0,
          notes: "Reserva confirmada en cancha 5",
          channel: "WEB",
        },
        users: {
          id: "u0000000-0000-0000-0000-000000000001",
          full_name: "Carlos Valderrama",
          email: "pibe@vicecity.com",
          phone: "+57 300 111 2233",
        },
        services: mockServices[0],
        tickets: [
          {
            id: "t0000000-0000-0000-0000-000000000001",
            ticket_code: "TK-CONF-001",
            status: "valid",
            created_at: new Date("2026-10-18T10:05:00.000Z"),
            access_logs: [],
          },
        ],
        payments: [
          {
            id: "p0000000-0000-0000-0000-000000000001",
            amount: 80000,
            status: "completed",
            payment_method: "stripe",
            transaction_id: "pi_test_12345",
            created_at: new Date("2026-10-18T10:05:00.000Z"),
          },
        ],
      },
      {
        id: "b0000000-0000-0000-0000-000000000002",
        user_id: "u0000000-0000-0000-0000-000000000002",
        service_id: "srv-piscina",
        // 14:00 to 15:00 Bogota (19:00 to 20:00 UTC) -> CONFIRMED (in future)
        start_at: new Date("2026-10-20T19:00:00.000Z"),
        end_at: new Date("2026-10-20T20:00:00.000Z"),
        status: "confirmed",
        total_amount: 50000,
        guests_count: 2,
        cancelled_at: null,
        cancellation_reason: null,
        created_at: new Date("2026-10-19T08:00:00.000Z"),
        updated_at: new Date("2026-10-19T08:00:00.000Z"),
        metadata: {
          code: "TK-POOL-002",
          notes: "Entrenamiento libre",
        },
        users: {
          id: "u0000000-0000-0000-0000-000000000002",
          full_name: "Mariana Pajón",
          email: "mariana@vicecity.com",
          phone: "+57 301 999 8877",
        },
        services: mockServices[1],
        tickets: [],
        payments: [],
      },
      {
        id: "b0000000-0000-0000-0000-000000000003",
        user_id: "u0000000-0000-0000-0000-000000000003",
        service_id: "srv-cancha-5",
        // Past booking -> FINISHED
        start_at: new Date("2026-10-19T13:00:00.000Z"),
        end_at: new Date("2026-10-19T14:00:00.000Z"),
        status: "confirmed",
        total_amount: 80000,
        guests_count: 10,
        cancelled_at: null,
        cancellation_reason: null,
        created_at: new Date("2026-10-17T12:00:00.000Z"),
        updated_at: new Date("2026-10-17T12:00:00.000Z"),
        metadata: null,
        users: {
          id: "u0000000-0000-0000-0000-000000000003",
          full_name: "Radamel Falcao",
          email: "falcao@vicecity.com",
          phone: null,
        },
        services: mockServices[0],
        tickets: [],
        payments: [],
      },
    ];

    mockDb = {
      bookings: {
        findMany: async (args) => {
          let results = [...mockBookings];
          if (args?.where?.status) {
            results = results.filter((b) => b.status === args.where.status);
          }
          if (args?.where?.service_id) {
            results = results.filter((b) => b.service_id === args.where.service_id);
          }
          if (args?.where?.start_at) {
            if (args.where.start_at.gte) {
              results = results.filter((b) => b.start_at >= args.where.start_at.gte);
            }
            if (args.where.start_at.lte) {
              results = results.filter((b) => b.start_at <= args.where.start_at.lte);
            }
          }
          if (args?.where?.OR) {
            const searchTerms = args.where.OR;
            results = results.filter((b) => {
              return searchTerms.some((condition) => {
                if (condition["users.full_name"]?.contains) {
                  return b.users?.full_name?.toLowerCase().includes(condition["users.full_name"].contains.toLowerCase());
                }
                if (condition["users.email"]?.contains) {
                  return b.users?.email?.toLowerCase().includes(condition["users.email"].contains.toLowerCase());
                }
                return false;
              });
            });
          }
          const skip = args?.skip || 0;
          const take = args?.take || results.length;
          return results.slice(skip, skip + take);
        },
        count: async (args) => {
          let results = [...mockBookings];
          if (args?.where?.status) {
            results = results.filter((b) => b.status === args.where.status);
          }
          if (args?.where?.service_id) {
            results = results.filter((b) => b.service_id === args.where.service_id);
          }
          return results.length;
        },
        findUnique: async ({ where }) => {
          const found = mockBookings.find((b) => b.id === where.id);
          return found || null;
        },
        update: async ({ where, data }) => {
          const idx = mockBookings.findIndex((b) => b.id === where.id);
          if (idx === -1) throw new Error("Booking not found");
          const target = mockBookings[idx];
          const updated = {
            ...target,
            ...data,
            metadata: data.metadata ? { ...(target.metadata || {}), ...data.metadata } : target.metadata,
            updated_at: FIXED_NOW,
          };
          mockBookings[idx] = updated;
          return updated;
        },
      },
      services: {
        findUnique: async ({ where }) => {
          return mockServices.find((s) => s.id === where.id) || null;
        },
      },
      tickets: {
        updateMany: async ({ where, data }) => {
          let updatedCount = 0;
          mockBookings.forEach((b) => {
            if (b.id === where.booking_id && b.tickets) {
              b.tickets.forEach((t) => {
                if (!where.status || t.status === where.status) {
                  Object.assign(t, data);
                  updatedCount++;
                }
              });
            }
          });
          return { count: updatedCount };
        },
      },
      audit_logs: {
        create: async () => ({ id: "audit-mock" }),
      },
    };

    mockAvailability = {
      assertAvailable: async ({ service, startAt, endAt: _endAt, quantity, excludeBookingId: _excludeBookingId }) => {
        // Simular validación: rechaza si startAt es 2026-10-25T15:00:00Z
        if (startAt.toISOString() === "2026-10-25T15:00:00.000Z") {
          throw new SlotUnavailableError("Horario ocupado por otra reserva");
        }
        if (quantity > service.max_capacity) {
          throw new CapacityExceededError(quantity, service.max_capacity);
        }
      },
    };

    service = new AdminReservationsService({
      db: mockDb,
      availability: mockAvailability,
      nowFn: () => FIXED_NOW,
    });
  });

  // ---------------------------------------------------------------------------
  // LISTADO
  // ---------------------------------------------------------------------------
  test("listReservations: retorna listado con paginación y mapeo a DTO", async () => {
    const result = await service.listReservations({ page: 1, limit: 10 });
    assert.equal(result.reservations.length, 3);
    assert.equal(result.pagination.total, 3);
    assert.equal(result.pagination.page, 1);
    assert.equal(result.pagination.limit, 10);
    assert.equal(result.pagination.totalPages, 1);

    const first = result.reservations.find((b) => b.id === "b0000000-0000-0000-0000-000000000001");
    assert.ok(first);
    assert.equal(first.clientName, "Carlos Valderrama");
    assert.equal(first.serviceName, "Cancha Fútbol 5 Sintética");
    assert.equal(first.paymentStatus, "CONFIRMED");
    // At FIXED_NOW, start_at <= FIXED_NOW < end_at -> IN_PROGRESS
    assert.equal(first.status, "IN_PROGRESS");
    assert.equal(first.code, "TK-CONF-001");
  });

  test("listReservations: filtra por status dinámico IN_PROGRESS", async () => {
    const result = await service.listReservations({ status: "IN_PROGRESS" });
    assert.equal(result.reservations.length, 1);
    assert.equal(result.reservations[0].id, "b0000000-0000-0000-0000-000000000001");
    assert.equal(result.reservations[0].status, "IN_PROGRESS");
  });

  test("listReservations: filtra por serviceId", async () => {
    const result = await service.listReservations({ serviceId: "srv-piscina" });
    assert.equal(result.reservations.length, 1);
    assert.equal(result.reservations[0].serviceId, "srv-piscina");
    assert.equal(result.reservations[0].clientName, "Mariana Pajón");
  });

  // ---------------------------------------------------------------------------
  // DETALLE
  // ---------------------------------------------------------------------------
  test("getReservationById: devuelve detalle completo con pagos y tickets", async () => {
    const result = await service.getReservationById("b0000000-0000-0000-0000-000000000001");
    assert.equal(result.id, "b0000000-0000-0000-0000-000000000001");
    assert.ok(result.payment);
    assert.equal(result.payment.amount, 80000);
    assert.equal(result.payment.status, "COMPLETED");
    assert.equal(result.tickets.length, 1);
    assert.equal(result.tickets[0].ticketCode, "TK-CONF-001");
  });

  test("getReservationById: lanza BookingNotFoundError si la reserva no existe", async () => {
    await assert.rejects(
      async () => service.getReservationById("b0000000-0000-0000-0000-999999999999"),
      BookingNotFoundError
    );
  });

  // ---------------------------------------------------------------------------
  // ACTUALIZACIÓN / CANCELACIÓN
  // ---------------------------------------------------------------------------
  test("updateReservation: cancelación lógica preserva registro e invalida tickets", async () => {
    const result = await service.updateReservation(
      "b0000000-0000-0000-0000-000000000001",
      {
        status: "CANCELLED",
        cancellationReason: "Tormenta eléctrica en el complejo deportivo",
      },
      "admin-usr-id"
    );

    assert.equal(result.status, "CANCELLED");
    assert.equal(result.cancellationReason, "Tormenta eléctrica en el complejo deportivo");
    assert.ok(result.cancelledAt);

    // Verificar que los tickets fueron cancelados
    const updatedBooking = mockBookings.find((b) => b.id === "b0000000-0000-0000-0000-000000000001");
    assert.equal(updatedBooking.tickets[0].status, "cancelled");
  });

  test("updateReservation: reprogramación de horario exitosa", async () => {
    const result = await service.updateReservation(
      "b0000000-0000-0000-0000-000000000002",
      {
        date: "2026-10-22",
        startTime: "16:00",
        endTime: "17:00",
      },
      "admin-usr-id"
    );

    assert.equal(result.date, "2026-10-22");
    assert.equal(result.startTime, "16:00");
    assert.equal(result.endTime, "17:00");
  });

  test("updateReservation: rechaza reprogramación si el horario entra en conflicto (409)", async () => {
    await assert.rejects(
      async () => {
        await service.updateReservation(
          "b0000000-0000-0000-0000-000000000002",
          {
            date: "2026-10-25",
            startTime: "10:00", // Maps to 15:00 UTC, configured to throw SlotUnavailableError
            endTime: "11:00",
          },
          "admin-usr-id"
        );
      },
      SlotUnavailableError
    );
  });

  test("updateReservation: rechaza reprogramación con duración inválida (> 9 horas)", async () => {
    await assert.rejects(
      async () => {
        await service.updateReservation(
          "b0000000-0000-0000-0000-000000000002",
          {
            date: "2026-10-22",
            startTime: "08:00",
            endTime: "18:00", // 10 hours -> InvalidDurationError
          },
          "admin-usr-id"
        );
      },
      InvalidDurationError
    );
  });
});
