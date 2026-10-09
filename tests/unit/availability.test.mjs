import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  AvailabilityService,
  CatalogService,
  AdvanceBookingLimitError,
  PastDateError,
  ServiceNotFoundError,
  isColombianHoliday,
  checkMaintenanceDay,
} from "../../src/features/services/index.ts";

describe("FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios", () => {
  let mockService;
  let mockFullPoolService;
  let mockBookings;
  let availabilityService;
  let catalogService;

  beforeEach(() => {
    // Servicio estándar: Cancha Fútbol Grande (Aforo: 11, Precio: $140.000)
    mockService = {
      id: "service-futbol-uuid",
      name: "Cancha Fútbol Grande",
      slug: "cancha-futbol-grande",
      capacity: 11,
      price: 140000,
      currency: "COP",
      duration_minutes: 60,
      is_active: true,
    };

    // Servicio especial: Reserva Completa Piscina (Aforo: 50, Anticipación máx: 20 días)
    mockFullPoolService = {
      id: "service-pool-full-uuid",
      name: "Reserva Completa Piscina",
      slug: "piscina-reserva-completa",
      capacity: 50,
      price: 1500000,
      currency: "COP",
      duration_minutes: 540,
      is_active: true,
    };

    mockBookings = [];

    const mockFindServiceById = async (id) => {
      if (id === mockService.id) return mockService;
      if (id === mockFullPoolService.id) return mockFullPoolService;
      return null;
    };

    const mockFindBookings = async (serviceId, dateStr) => {
      return mockBookings.filter(
        (b) => b.service_id === serviceId && b.date === dateStr
      );
    };

    // Fijar fecha base de prueba: Miércoles 2026-10-14 (día hábil normal, no festivo ni lunes)
    availabilityService = new AvailabilityService({
      findServiceByIdFn: mockFindServiceById,
      findBookingsForServiceDateFn: mockFindBookings,
      mockNowBogota: {
        hours: 7,
        minutes: 0,
        dateStr: "2026-10-14", // Miércoles
      },
    });

    catalogService = new CatalogService({
      findCategoriesFn: async () => [
        {
          id: "cat-canchas",
          name: "Canchas",
          slug: "canchas",
          sort_order: 1,
          is_active: true,
          services: [mockService],
        },
      ],
      findServicesFn: async () => [mockService],
    });
  });

  test("Criterio 1: La disponibilidad refleja el aforo restante de cada franja", async () => {
    // Agregar 3 cupos ocupados en la franja 08:00 - 09:00
    mockBookings.push({
      service_id: mockService.id,
      date: "2026-10-15", // Jueves (dentro de anticipación)
      start_at: "2026-10-15T08:00:00-05:00",
      end_at: "2026-10-15T09:00:00-05:00",
      quantity: 3,
      status: "confirmed",
    });

    // Llenar por completo la franja 09:00 - 10:00 (11 cupos ocupados)
    mockBookings.push({
      service_id: mockService.id,
      date: "2026-10-15",
      start_at: "2026-10-15T09:00:00-05:00",
      end_at: "2026-10-15T10:00:00-05:00",
      quantity: 11,
      status: "confirmed",
    });

    const result = await availabilityService.getServiceAvailability(
      mockService.id,
      "2026-10-15"
    );

    assert.equal(result.isMaintenanceDay, false);
    assert.equal(result.slots.length, 9, "Debe tener 9 franjas horarias de 8:00 AM a 5:00 PM");

    // Franja 1 (08:00 - 09:00): 11 total - 3 ocupados = 8 restantes
    const slot1 = result.slots[0];
    assert.equal(slot1.startTime, "08:00");
    assert.equal(slot1.endTime, "09:00");
    assert.equal(slot1.totalCapacity, 11);
    assert.equal(slot1.occupiedCapacity, 3);
    assert.equal(slot1.remainingCapacity, 8);
    assert.equal(slot1.status, "AVAILABLE");
    assert.equal(slot1.canBePurchased, true);

    // Franja 2 (09:00 - 10:00): 11 total - 11 ocupados = 0 restantes (FULL)
    const slot2 = result.slots[1];
    assert.equal(slot2.startTime, "09:00");
    assert.equal(slot2.endTime, "10:00");
    assert.equal(slot2.totalCapacity, 11);
    assert.equal(slot2.occupiedCapacity, 11);
    assert.equal(slot2.remainingCapacity, 0);
    assert.equal(slot2.status, "FULL");
    assert.equal(slot2.canBePurchased, false);

    // Franja 3 (10:00 - 11:00): Sin reservas = 11 restantes
    const slot3 = result.slots[2];
    assert.equal(slot3.occupiedCapacity, 0);
    assert.equal(slot3.remainingCapacity, 11);
    assert.equal(slot3.status, "AVAILABLE");
  });

  test("Criterio 2: Los lunes (o martes posterior a festivo) no hay disponibilidad por mantenimiento semanal", async () => {
    // 1. Lunes normal (2026-10-19): día de mantenimiento semanal
    const resultMonday = await availabilityService.getServiceAvailability(
      mockService.id,
      "2026-10-19"
    );

    assert.equal(resultMonday.isMaintenanceDay, true);
    assert.match(resultMonday.maintenanceReason, /Lunes/i);
    assert.equal(resultMonday.summary.availableSlots, 0, "No debe haber cupos disponibles en mantenimiento");

    for (const slot of resultMonday.slots) {
      assert.equal(slot.status, "MAINTENANCE");
      assert.equal(slot.remainingCapacity, 0);
      assert.equal(slot.canBePurchased, false);
    }

    // 2. Comprobar regla de martes posterior a festivo (RN-003):
    // 2026-10-12 es festivo oficial en Colombia (Día de la Raza, Ley Emiliani)
    assert.equal(isColombianHoliday("2026-10-12"), true, "El 12 de octubre de 2026 debe ser festivo en Colombia");

    // Lunes festivo opera (no es mantenimiento ese día):
    const mondayHolidayCheck = checkMaintenanceDay("2026-10-12");
    assert.equal(mondayHolidayCheck.isMaintenance, false, "El lunes festivo opera normalmente");

    // Martes siguiente (2026-10-13): el mantenimiento pasa al martes
    const tuesdayAfterHolidayCheck = checkMaintenanceDay("2026-10-13");
    assert.equal(tuesdayAfterHolidayCheck.isMaintenance, true, "El martes posterior a festivo es día de mantenimiento");
    assert.match(tuesdayAfterHolidayCheck.reason, /Martes posterior a Lunes festivo/i);
  });

  test("Criterio 3: Caso de error - Fechas fuera de la anticipación o en el pasado son rechazadas", async () => {
    // Fecha en el pasado (ayer respecto al mock de 2026-10-14)
    await assert.rejects(
      async () => {
        await availabilityService.getServiceAvailability(
          mockService.id,
          "2026-10-13" // Pasado
        );
      },
      (err) => {
        assert.ok(err instanceof PastDateError);
        assert.equal(err.code, "PAST_DATE_NOT_ALLOWED");
        return true;
      }
    );

    // Fecha a 16 días (supera los 15 días máximos para reserva normal)
    await assert.rejects(
      async () => {
        await availabilityService.getServiceAvailability(
          mockService.id,
          "2026-10-31" // 17 días después de 2026-10-14
        );
      },
      (err) => {
        assert.ok(err instanceof AdvanceBookingLimitError);
        assert.equal(err.code, "ADVANCE_BOOKING_LIMIT_EXCEEDED");
        assert.match(err.message, /15 días/);
        return true;
      }
    );

    // Servicio de piscina completa permite hasta 20 días:
    // A 18 días es válido para piscina completa
    const resultPoolValid = await availabilityService.getServiceAvailability(
      mockFullPoolService.id,
      "2026-11-01" // 18 días después
    );
    assert.equal(resultPoolValid.service.name, "Reserva Completa Piscina");

    // A 22 días para piscina completa debe fallar (> 20 días)
    await assert.rejects(
      async () => {
        await availabilityService.getServiceAvailability(
          mockFullPoolService.id,
          "2026-11-06" // 23 días después
        );
      },
      (err) => {
        assert.ok(err instanceof AdvanceBookingLimitError);
        assert.match(err.message, /20 días/);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Una franja ya iniciada se puede comprar con tarifa completa de la hora (RN-010)", async () => {
    // Simular que son las 09:25 AM en Bogotá en la fecha actual (2026-10-14)
    const inProgressService = new AvailabilityService({
      findServiceByIdFn: async () => mockService,
      findBookingsForServiceDateFn: async () => [],
      mockNowBogota: {
        hours: 9,
        minutes: 25,
        dateStr: "2026-10-14",
      },
    });

    const result = await inProgressService.getServiceAvailability(
      mockService.id,
      "2026-10-14"
    );

    // Franja 1 (08:00 - 09:00): Ya finalizó (PAST)
    const slot8 = result.slots[0];
    assert.equal(slot8.status, "PAST");
    assert.equal(slot8.canBePurchased, false);
    assert.equal(slot8.isCurrentSlot, false);

    // Franja 2 (09:00 - 10:00): Son las 09:25 -> EN CURSO (IN_PROGRESS)
    // Según RN-010: se puede comprar con tarifa completa de la hora sin extender hora de fin
    const slot9 = result.slots[1];
    assert.equal(slot9.status, "IN_PROGRESS");
    assert.equal(slot9.isCurrentSlot, true);
    assert.equal(slot9.canBePurchased, true, "Franja en curso debe poderse comprar si no ha terminado");
    assert.equal(slot9.price, 140000, "Debe cobrar tarifa completa de la hora");
    assert.equal(slot9.remainingCapacity, 11);

    // Franja 3 (10:00 - 11:00): Franja futura normal
    const slot10 = result.slots[2];
    assert.equal(slot10.status, "AVAILABLE");
    assert.equal(slot10.canBePurchased, true);
    assert.equal(slot10.isCurrentSlot, false);
  });

  test("Catálogo público: Retorna categorías y servicios activos con precio y aforo", async () => {
    const catalog = await catalogService.getPublicCatalog();
    assert.equal(catalog.totalServices, 1);
    assert.equal(catalog.categories.length, 1);
    assert.equal(catalog.categories[0].name, "Canchas");

    const srv = catalog.categories[0].services[0];
    assert.equal(srv.name, "Cancha Fútbol Grande");
    assert.equal(srv.price, 140000);
    assert.equal(srv.capacity, 11);
    assert.equal(srv.currency, "COP");
  });
});

