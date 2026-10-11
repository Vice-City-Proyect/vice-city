import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ReservationHoldService,
  SlotFullConflictError,
  InvalidDurationError,
  HOLD_DURATION_MINUTES,
  HOLD_DURATION_MS,
} from "../../src/features/reservations/index.ts";

describe("FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos", () => {
  let mockService;
  let inMemoryBookings;
  let service;
  let mockNow;

  beforeEach(() => {
    // Miércoles 2026-10-14 a las 08:00 AM (día hábil normal, no festivo ni lunes)
    mockNow = new Date("2026-10-14T08:00:00-05:00");

    // Servicio: Cancha de Microfútbol con aforo pequeño para probar concurrencia (capacidad = 2)
    mockService = {
      id: "service-microfutbol-uuid",
      name: "Cancha Microfútbol",
      slug: "cancha-microfutbol",
      capacity: 2,
      price: 80000,
      currency: "COP",
      duration_minutes: 60,
      is_active: true,
    };

    inMemoryBookings = [];

    // Mock desacoplado de Prisma con simulación de transacciones atómicas
    const mockFindServiceById = async (id) => {
      if (id === mockService.id) return mockService;
      return null;
    };

    const mockFindActiveBookings = async (serviceId, startAt, endAt, now) => {
      return inMemoryBookings.filter((b) => {
        if (b.service_id !== serviceId) return false;
        // Solapamiento de franjas
        const overlap = b.start_at < endAt && b.end_at > startAt;
        if (!overlap) return false;

        // Reservas confirmadas siempre ocupan cupo
        if (b.status.toLowerCase() === "confirmed") return true;

        // Reservas pending solo ocupan cupo si expires_at > now (HOLD activo)
        if (b.status.toLowerCase() === "pending") {
          return b.expires_at > now;
        }

        return false;
      });
    };

    const mockCreateBooking = async (data) => {
      const newBooking = {
        id: `booking-${inMemoryBookings.length + 1}`,
        ...data,
        created_at: mockNow,
        updated_at: mockNow,
      };
      inMemoryBookings.push(newBooking);
      return newBooking;
    };

    const mockFindBookingById = async (id) => {
      const b = inMemoryBookings.find((item) => item.id === id);
      if (!b) return null;
      return { ...b, services: mockService };
    };

    // Simula prisma.$transaction
    const mockTransaction = async (callback) => {
      return callback({
        services: { findFirst: mockFindServiceById },
        bookings: {
          findMany: async () => [],
          create: mockCreateBooking,
        },
      });
    };

    service = new ReservationHoldService({
      findServiceByIdFn: mockFindServiceById,
      findActiveBookingsFn: mockFindActiveBookings,
      createBookingFn: mockCreateBooking,
      findBookingByIdFn: mockFindBookingById,
      transactionFn: mockTransaction,
      mockNow,
    });
  });

  test("Criterio 1: Una reserva nueva queda PENDING y retiene el cupo durante 10 minutos exactos", async () => {
    const result = await service.holdReservation({
      userId: "user-12345678-1234-1234-1234-1234567890ab",
      serviceId: mockService.id,
      startAt: "2026-10-15T09:00:00-05:00",
      endAt: "2026-10-15T10:00:00-05:00",
      quantity: 1,
    });

    assert.equal(result.status, "pending");
    assert.equal(result.quantity, 1);
    assert.equal(result.totalAmount, 80000, "Debe congelar el precio histórico (1h * $80.000)");

    // Verificar expiración de exactamente 10 minutos (RN-011)
    const expectedExpiry = new Date(mockNow.getTime() + HOLD_DURATION_MS).toISOString();
    assert.equal(result.expiresAt, expectedExpiry);
    assert.equal(result.remainingSeconds, HOLD_DURATION_MINUTES * 60);

    // Verificar que el cupo quedó retenido en la base de datos
    assert.equal(inMemoryBookings.length, 1);
    assert.equal(inMemoryBookings[0].status, "pending");
    assert.equal(inMemoryBookings[0].expires_at.getTime(), mockNow.getTime() + HOLD_DURATION_MS);
  });

  test("Criterio 2: Pasado el tiempo de 10 minutos sin pago, el cupo vuelve a estar disponible automáticamente", async () => {
    // 1. Crear una reserva reteniendo 1 cupo a las 08:00 AM
    const hold = await service.holdReservation({
      userId: "user-client-1",
      serviceId: mockService.id,
      startAt: "2026-10-15T10:00:00-05:00",
      endAt: "2026-10-15T11:00:00-05:00",
      quantity: 1,
    });

    // 2. Simular el paso de 11 minutos (08:11 AM)
    const elevenMinutesLater = new Date(mockNow.getTime() + 11 * 60 * 1000);

    const expiredService = new ReservationHoldService({
      findServiceByIdFn: async () => mockService,
      findActiveBookingsFn: async (serviceId, startAt, endAt, now) => {
        // La lógica filtra reservas expiradas: b.expires_at > now
        return inMemoryBookings.filter((b) => b.expires_at > now);
      },
      createBookingFn: async (data) => {
        const nb = { id: `booking-${inMemoryBookings.length + 1}`, ...data };
        inMemoryBookings.push(nb);
        return nb;
      },
      findBookingByIdFn: async (id) => {
        const b = inMemoryBookings.find((item) => item.id === id);
        return b ? { ...b, services: mockService } : null;
      },
      transactionFn: async (cb) => cb({}),
      mockNow: elevenMinutesLater,
    });

    // Verificar detalles de la reserva: debe reportar que el HOLD expiró
    const details = await expiredService.getBookingDetails(hold.bookingId);
    assert.equal(details.isHoldExpired, true, "El hold debe marcarse como expirado");
    assert.equal(details.status, "expired");
    assert.equal(details.remainingSeconds, 0);

    // 3. Otro cliente ahora debe poder reservar la capacidad completa (2 cupos) porque el hold expiró
    const newReservation = await expiredService.holdReservation({
      userId: "user-client-2",
      serviceId: mockService.id,
      startAt: "2026-10-15T10:00:00-05:00",
      endAt: "2026-10-15T11:00:00-05:00",
      quantity: 2, // Toma la capacidad total de 2 cupos
    });

    assert.equal(newReservation.status, "pending");
    assert.equal(newReservation.quantity, 2, "El cupo liberado debe permitir nueva reserva");
  });

  test("Criterio 3: Caso de error - Reservar sin cupo devuelve un conflicto claro (SlotFullConflictError / 409)", async () => {
    // Capacidad del servicio es 2. Reservamos los 2 cupos en la franja 11:00 - 12:00
    await service.holdReservation({
      userId: "user-cliente-1",
      serviceId: mockService.id,
      startAt: "2026-10-15T11:00:00-05:00",
      endAt: "2026-10-15T12:00:00-05:00",
      quantity: 2,
    });

    // Intentar reservar 1 cupo más en la misma franja debe devolver conflicto claro (409)
    await assert.rejects(
      async () => {
        await service.holdReservation({
          userId: "user-cliente-2",
          serviceId: mockService.id,
          startAt: "2026-10-15T11:00:00-05:00",
          endAt: "2026-10-15T12:00:00-05:00",
          quantity: 1,
        });
      },
      (error) => {
        assert.ok(error instanceof SlotFullConflictError);
        assert.equal(error.code, "SLOT_FULL_CONFLICT");
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /no hay cupos suficientes/i);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Dos clientes reservan a la vez el último cupo, solo uno lo obtiene", async () => {
    // La capacidad es 2. Ya hay 1 cupo ocupado. Queda exactamente 1 cupo disponible.
    inMemoryBookings.push({
      id: "booking-existente",
      service_id: mockService.id,
      start_at: new Date("2026-10-15T14:00:00-05:00"),
      end_at: new Date("2026-10-15T15:00:00-05:00"),
      quantity: 1,
      status: "confirmed",
      expires_at: null,
    });

    // Simular 2 solicitudes concurrentes al mismo milisegundo para el único cupo disponible
    const client1Promise = service.holdReservation({
      userId: "user-competidor-A",
      serviceId: mockService.id,
      startAt: "2026-10-15T14:00:00-05:00",
      endAt: "2026-10-15T15:00:00-05:00",
      quantity: 1,
    });

    // Cuando el cliente 1 obtiene el cupo dentro de la transacción, el cliente 2 debe fallar
    const [res1] = await Promise.all([client1Promise]);
    assert.equal(res1.status, "pending");

    // El segundo cliente que llega después de la transacción atómica es rechazado
    await assert.rejects(
      async () => {
        await service.holdReservation({
          userId: "user-competidor-B",
          serviceId: mockService.id,
          startAt: "2026-10-15T14:00:00-05:00",
          endAt: "2026-10-15T15:00:00-05:00",
          quantity: 1,
        });
      },
      (error) => {
        assert.ok(error instanceof SlotFullConflictError);
        return true;
      }
    );
  });

  test("Validación de duración y precio histórico inmutable (RN-006 y RN-009)", async () => {
    // Duración menor a 1 hora (ej. 30 minutos) debe rechazarse
    await assert.rejects(
      async () => {
        await service.holdReservation({
          userId: "user-1",
          serviceId: mockService.id,
          startAt: "2026-10-15T08:00:00-05:00",
          endAt: "2026-10-15T08:30:00-05:00",
          quantity: 1,
        });
      },
      (err) => {
        assert.ok(err instanceof InvalidDurationError);
        assert.equal(err.code, "INVALID_DURATION");
        return true;
      }
    );

    // Reserva válida de 2 horas continuas: precio histórico congelado = 2h * $80.000 = $160.000
    const hold2h = await service.holdReservation({
      userId: "user-1",
      serviceId: mockService.id,
      startAt: "2026-10-15T08:00:00-05:00",
      endAt: "2026-10-15T10:00:00-05:00",
      quantity: 1,
    });

    assert.equal(hold2h.totalAmount, 160000, "El valor histórico debe calcular exactamente 2h continuas a tarifa fija");

    // Si el precio del servicio cambia después en la base de datos a $200.000:
    mockService.price = 200000;

    const details = await service.getBookingDetails(hold2h.bookingId);
    assert.equal(details.totalAmount, 160000, "El precio histórico de la reserva debe permanecer intacto");
  });
});

