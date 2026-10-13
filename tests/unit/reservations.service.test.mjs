import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ReservationsService } from "../../src/features/reservations/services/reservations.service.ts";
import {
  ServiceNotFoundError,
  ServiceInactiveError,
  CapacityExceededError,
} from "../../src/features/reservations/errors/reservations.errors.ts";

const POOL = {
  id: "srv-pool",
  name: "Piscina Adultos 1",
  capacity: 50,
  is_active: true,
  price: 2000,
  metadata: { modality: "PER_PERSON_HOUR" },
};

function futureDay(hour = 10, skipWeekdays = []) {
  for (let i = 1; i <= 25; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(hour, 0, 0, 0);
    if (!skipWeekdays.includes(d.getDay())) return d;
  }
  throw new Error("No se encontró un día válido");
}

function createMockDb({ service, overlaps = [] } = {}) {
  const bookingsStore = [];
  const tx = {
    $executeRaw: async () => 0,
    bookings: {
      findMany: async () => overlaps,
      create: async ({ data }) => {
        const booking = {
          id: `bk-${bookingsStore.length + 1}`,
          ...data,
          services: service ?? null,
        };
        bookingsStore.push(booking);
        return booking;
      },
    },
  };
  const client = {
    services: { findUnique: async ({ where }) => (service && where.id === service.id ? service : null) },
    bookings: tx.bookings,
    $transaction: async (cb) => cb(tx),
  };
  return { client, bookingsStore, tx };
}

const okAvailability = { assertAvailable: async () => ({ available: true, remainingCapacity: 50 }) };

describe("Reservas: creación de reserva PENDING con HOLD de 10 minutos", () => {
  it("Crea la reserva en pending con hold exacto de 10 minutos y precio aplicado", async () => {
    // Día ni lunes (mantenimiento) ni miércoles (descuento) para total limpio.
    const start = futureDay(10, [1, 3]);
    const end = new Date(start.getTime() + 3600 * 1000);
    const { client, bookingsStore } = createMockDb({ service: POOL });
    const fixedNow = new Date("2026-06-01T12:00:00.000Z");

    const svc = new ReservationsService({
      db: client,
      availability: okAvailability,
      nowFn: () => fixedNow,
    });

    const result = await svc.createPendingReservation({
      userId: "user-1",
      serviceId: POOL.id,
      startAt: start,
      endAt: end,
      quantity: 2,
    });

    assert.equal(result.status, "pending");
    assert.equal(result.totalAmount, 4000);
    assert.equal(result.discountPercent, 0);
    assert.equal(result.expiresAt.getTime() - fixedNow.getTime(), 10 * 60 * 1000);

    assert.equal(bookingsStore.length, 1);
    assert.equal(bookingsStore[0].status, "pending");
    assert.equal(bookingsStore[0].metadata.modality, "PER_PERSON_HOUR");
    assert.equal(bookingsStore[0].metadata.discount_percent, 0);
  });

  it("Aplica el descuento de miércoles del lado del servidor", async () => {
    const start = futureDay(10, [1, 2, 4, 5, 6, 0]); // solo miércoles (3)
    assert.equal(start.getDay(), 3);
    const end = new Date(start.getTime() + 3600 * 1000);
    const { client } = createMockDb({ service: POOL });
    const svc = new ReservationsService({ db: client, availability: okAvailability });

    const result = await svc.createPendingReservation({
      userId: "user-1",
      serviceId: POOL.id,
      startAt: start,
      endAt: end,
      quantity: 1,
    });

    assert.equal(result.discountPercent, 20);
    assert.equal(result.totalAmount, 1600);
  });

  it("Caso de error: servicio inexistente lanza ServiceNotFoundError", async () => {
    const { client } = createMockDb({ service: null });
    const svc = new ReservationsService({ db: client, availability: okAvailability });
    const start = futureDay(10, [1]);
    await assert.rejects(
      () =>
        svc.createPendingReservation({
          userId: "u",
          serviceId: "no-existe",
          startAt: start,
          endAt: new Date(start.getTime() + 3600 * 1000),
        }),
      ServiceNotFoundError
    );
  });

  it("Caso de error: servicio inactivo lanza ServiceInactiveError", async () => {
    const { client } = createMockDb({ service: { ...POOL, is_active: false } });
    const svc = new ReservationsService({ db: client, availability: okAvailability });
    const start = futureDay(10, [1]);
    await assert.rejects(
      () =>
        svc.createPendingReservation({
          userId: "u",
          serviceId: POOL.id,
          startAt: start,
          endAt: new Date(start.getTime() + 3600 * 1000),
        }),
      ServiceInactiveError
    );
  });

  it("Propaga el rechazo de disponibilidad (sin sobreventa)", async () => {
    const { client, bookingsStore } = createMockDb({ service: POOL });
    const failing = {
      assertAvailable: async () => {
        throw new CapacityExceededError();
      },
    };
    const svc = new ReservationsService({ db: client, availability: failing });
    const start = futureDay(10, [1]);
    await assert.rejects(
      () =>
        svc.createPendingReservation({
          userId: "u",
          serviceId: POOL.id,
          startAt: start,
          endAt: new Date(start.getTime() + 3600 * 1000),
        }),
      CapacityExceededError
    );
    assert.equal(bookingsStore.length, 0);
  });
});