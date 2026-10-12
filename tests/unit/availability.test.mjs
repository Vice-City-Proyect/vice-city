import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AvailabilityService } from "../../src/features/reservations/services/availability.service.ts";
import {
  OperatingHoursError,
  MaintenanceDayClosedError,
  AdvanceWindowExceededError,
  CapacityExceededError,
} from "../../src/features/reservations/errors/reservations.errors.ts";

const POOL = {
  id: "srv-pool",
  name: "Piscina Adultos 1",
  capacity: 50,
  isActive: true,
  is_active: true,
  price: 2000,
  metadata: { modality: "PER_PERSON_HOUR" },
};

const CANCHA = {
  id: "srv-cancha",
  name: "Cancha de Fútbol Grande",
  capacity: 11,
  is_active: true,
  price: 140000,
  metadata: { modality: "EXCLUSIVE_RESERVATION" },
};

function futureSlot(hour = 10, daysAhead = 2) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Día futuro que no sea lunes (mantenimiento) para pruebas de negocio. */
function futureNonMonday(hour = 10) {
  for (let i = 1; ; i++) {
    const d = futureSlot(hour, i);
    if (d.getDay() !== 1) return d;
  }
}

/** Día futuro que SÍ sea lunes. */
function futureMonday(hour = 10) {
  for (let i = 1; ; i++) {
    const d = futureSlot(hour, i);
    if (d.getDay() === 1) return d;
  }
}

function buildService({ overlapping = [] } = {}) {
  return new AvailabilityService({
    findOverlappingBookings: async () => overlapping,
  });
}

describe("Disponibilidad de reservas (aforo, franjas, reglas de operación)", () => {
  it("Franja fuera del horario de operación es rechazada (antes de 8:00 AM)", async () => {
    const start = futureNonMonday(7); // 07:00
    const end = new Date(start.getTime() + 3600 * 1000);
    const svc = buildService();
    await assert.rejects(
      () => svc.assertAvailable({ service: POOL, startAt: start, endAt: end, quantity: 1 }),
      OperatingHoursError
    );
  });

  it("Día de mantenimiento (lunes) es rechazado", async () => {
    const start = futureMonday(10);
    const end = new Date(start.getTime() + 3600 * 1000);
    const svc = buildService();
    await assert.rejects(
      () => svc.assertAvailable({ service: POOL, startAt: start, endAt: end, quantity: 1 }),
      MaintenanceDayClosedError
    );
  });

  it("Anticipación mayor a 15 días es rechazada", async () => {
    const start = futureSlot(10, 16);
    const end = new Date(start.getTime() + 3600 * 1000);
    const svc = buildService();
    await assert.rejects(
      () => svc.assertAvailable({ service: POOL, startAt: start, endAt: end, quantity: 1 }),
      AdvanceWindowExceededError
    );
  });

  it("EXCLUSIVE_RESERVATION: un solapamiento impide co-reservar (aforo efectivo 1)", async () => {
    const start = futureNonMonday(10);
    const end = new Date(start.getTime() + 3600 * 1000);
    const existing = {
      id: "bk-1",
      status: "confirmed",
      quantity: 1,
      expires_at: null,
      start_at: new Date(start.getTime() - 60000),
      end_at: new Date(end.getTime() + 60000),
    };
    const svc = buildService({ overlapping: [existing] });
    const result = await svc.checkAvailability({ service: CANCHA, startAt: start, endAt: end, quantity: 1 });
    assert.equal(result.available, false);
    assert.equal(result.effectiveCapacity, 1);
    assert.equal(result.occupiedCapacity, 1);
    assert.equal(result.remainingCapacity, 0);

    await assert.rejects(
      () => svc.assertAvailable({ service: CANCHA, startAt: start, endAt: end, quantity: 1 }),
      CapacityExceededError
    );
  });

  it("PER_PERSON_HOUR: cupos disponibles respetan diferencia aforo - ocupados", async () => {
    const start = futureNonMonday(10);
    const end = new Date(start.getTime() + 3600 * 1000);
    const existing = {
      id: "bk-2",
      status: "confirmed",
      quantity: 30,
      expires_at: null,
    };
    const svc = buildService({ overlapping: [existing] });
    const ok = await svc.checkAvailability({ service: POOL, startAt: start, endAt: end, quantity: 20 });
    assert.equal(ok.available, true);
    assert.equal(ok.occupiedCapacity, 30);
    assert.equal(ok.remainingCapacity, 20);

    await assert.rejects(
      () => svc.assertAvailable({ service: POOL, startAt: start, endAt: end, quantity: 21 }),
      CapacityExceededError
    );
  });

  it("PENDING con HOLD vencido no ocupa la franja (expira a los 10 min)", async () => {
    const start = futureNonMonday(10);
    const end = new Date(start.getTime() + 3600 * 1000);
    const expiredHold = {
      id: "bk-3",
      status: "pending",
      quantity: 50,
      expires_at: new Date(Date.now() - 60 * 1000), // vencido hace 1 min
    };
    const svc = buildService({ overlapping: [expiredHold] });
    const result = await svc.checkAvailability({ service: POOL, startAt: start, endAt: end, quantity: 50 });
    assert.equal(result.available, true);
    assert.equal(result.occupiedCapacity, 0);
  });

  it("PENDING con HOLD vigente SÍ ocupa la franja", async () => {
    const start = futureNonMonday(10);
    const end = new Date(start.getTime() + 3600 * 1000);
    const activeHold = {
      id: "bk-4",
      status: "pending",
      quantity: 50,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // vigente
    };
    const svc = buildService({ overlapping: [activeHold] });
    const result = await svc.checkAvailability({ service: POOL, startAt: start, endAt: end, quantity: 50 });
    assert.equal(result.available, false);
    assert.equal(result.occupiedCapacity, 50);
  });
});