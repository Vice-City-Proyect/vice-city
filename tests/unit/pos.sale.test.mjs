/**
 * FT-06 / HU25: Pruebas Unitarias del Módulo POS de Empleado (RN-017)
 * Node Test Runner (node:test y node:assert)
 *
 * Criterios de Aceptación Evaluados:
 * 1. Una venta completa genera la reserva pagada y el ticket (RN-017).
 * 2. Caso de error: Faltan datos obligatorios, no hay cupo o es lunes de mantenimiento.
 * 3. Caso de error: Un usuario sin rol TICKET_SELLER recibe 403 (ForbiddenPosAccessError).
 * 4. Caso límite: Venta en una franja ya iniciada cobra la hora completa y el QR vence al final de la franja (RN-010).
 *
 * NOTA: Las fechas se generan dinámicamente para evitar PosPastSlotError cuando los tests
 * se ejecutan en fechas posteriores a las hardcodeadas en la versión original.
 */

/**
 * Devuelve el próximo jueves laborable a las horas indicadas, en formato ISO -05:00.
 * Usa UTC puro con offset fijo de Bogotá (UTC-5) para funcionar sin importar la TZ del sistema.
 */
function nextThursdaySlot(startHour = 10, endHour = 11) {
  const bogotaOffsetMs = -5 * 60 * 60 * 1000;
  const bogotaNowMs = Date.now() + bogotaOffsetMs;
  const bogotaNow = new Date(bogotaNowMs);

  const dayOfWeek = bogotaNow.getUTCDay(); // 0=dom, 4=jue
  const currentHour = bogotaNow.getUTCHours();

  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  // Si hoy es jueves pero el slot ya finalizó, saltar a la próxima semana
  if (daysUntilThursday === 0 && currentHour >= endHour) {
    daysUntilThursday = 7;
  }

  const targetMs = bogotaNowMs + daysUntilThursday * 24 * 60 * 60 * 1000;
  const target = new Date(targetMs);
  const y = target.getUTCFullYear();
  const mo = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  const hS = String(startHour).padStart(2, "0");
  const hE = String(endHour).padStart(2, "0");

  return {
    startAt: `${y}-${mo}-${d}T${hS}:00:00-05:00`,
    endAt: `${y}-${mo}-${d}T${hE}:00:00-05:00`,
  };
}

/**
 * Devuelve el próximo lunes (día de mantenimiento) a las horas indicadas, en formato ISO -05:00.
 * Usa UTC puro con offset fijo de Bogotá (UTC-5).
 */
function nextMondaySlot(startHour = 10, endHour = 11) {
  const bogotaOffsetMs = -5 * 60 * 60 * 1000;
  const bogotaNowMs = Date.now() + bogotaOffsetMs;
  const bogotaNow = new Date(bogotaNowMs);

  const dayOfWeek = bogotaNow.getUTCDay(); // 0=dom, 1=lun
  const currentHour = bogotaNow.getUTCHours();

  let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  // Si hoy es lunes pero el slot ya finalizó, saltar a la próxima semana
  if (daysUntilMonday === 0 && currentHour >= endHour) {
    daysUntilMonday = 7;
  }
  // Si hoy es domingo (dayOfWeek=0), daysUntilMonday=1 → mañana lunes
  // Si hoy es lunes (dayOfWeek=1), daysUntilMonday=0 → mismo día

  const targetMs = bogotaNowMs + daysUntilMonday * 24 * 60 * 60 * 1000;
  const target = new Date(targetMs);
  const y = target.getUTCFullYear();
  const mo = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  const hS = String(startHour).padStart(2, "0");
  const hE = String(endHour).padStart(2, "0");

  return {
    startAt: `${y}-${mo}-${d}T${hS}:00:00-05:00`,
    endAt: `${y}-${mo}-${d}T${hE}:00:00-05:00`,
  };
}

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  PosSaleService,
  ForbiddenPosAccessError,
  PosCapacityExceededError,
  PosMaintenanceDayError,
  posSaleSchema,
} from "../../src/features/pos/index.ts";

describe("FT-06 / HU25: Venta Presencial en el POS (Módulo Empleado)", () => {
  const mockSellerId = "11111111-2222-3333-4444-555555555555";
  const mockServiceId = "22222222-3333-4444-5555-666666666666";

  const mockTicketSeller = {
    id: mockSellerId,
    full_name: "Daniela Taquillera",
    role_id: "role-seller-uuid",
    roles: { name: "TICKET_SELLER" },
  };

  const mockPoolService = {
    id: mockServiceId,
    name: "Piscina Adultos",
    price: 2000,
    currency: "COP",
    capacity: 50,
    is_active: true,
  };

  test("Criterio 1: Una venta completa genera la reserva pagada y el ticket (RN-017)", async () => {
    let bookingCreated = null;
    let paymentCreated = null;
    let ticketCreated = null;

    const service = new PosSaleService({
      findSellerByIdFn: async (id) => (id === mockSellerId ? mockTicketSeller : null),
      findServiceByIdFn: async (id) => (id === mockServiceId ? mockPoolService : null),
      findActiveBookingsFn: async () => [], // Aforo totalmente disponible
      transactionFn: async (fn) => {
        const fakeTx = {
          users: {
            findFirst: async () => null,
            create: async (u) => ({ id: "client-uuid-999", ...u.data }),
          },
          roles: {
            findFirst: async () => ({ id: "client-role-uuid", name: "CLIENT" }),
          },
          bookings: {
            create: async (b) => {
              bookingCreated = { id: "booking-pos-001", ...b.data };
              return bookingCreated;
            },
          },
          payments: {
            create: async (p) => {
              paymentCreated = { id: "pay-pos-001", ...p.data };
              return paymentCreated;
            },
          },
          tickets: {
            create: async (t) => {
              ticketCreated = { id: "ticket-pos-001", ...t.data };
              return ticketCreated;
            },
          },
        };
        return fn(fakeTx);
      },
    });

    // Venta en día jueves (permitido)
    const { startAt: saleStart1, endAt: saleEnd1 } = nextThursdaySlot(10, 11);
    const result = await service.processSale({
      sellerId: mockSellerId,
      clientName: "Carlos Gómez",
      clientId: "1020304050",
      serviceId: mockServiceId,
      startAt: saleStart1,
      endAt: saleEnd1,
      quantity: 2,
      paymentMethod: "cash",
      notes: "Venta presencial en taquilla",
    });

    // 1. Verificación del resultado devuelto
    assert.equal(result.clientName, "Carlos Gómez");
    assert.equal(result.clientId, "1020304050");
    assert.equal(result.status, "confirmed");
    assert.equal(result.paymentMethod, "cash");
    assert.equal(result.quantity, 2);
    assert.equal(result.amount, 4000); // 2 cupos * $2.000 COP
    assert.ok(result.ticketCode);

    // 2. Reserva creada directamente confirmada
    assert.ok(bookingCreated);
    assert.equal(bookingCreated.status, "confirmed");
    assert.equal(bookingCreated.total_amount, 4000);

    // 3. Pago registrado como approved (estado válido en la base)
    assert.ok(paymentCreated);
    assert.equal(paymentCreated.status, "approved");
    assert.equal(paymentCreated.method, "cash");
    assert.equal(paymentCreated.amount, 4000);

    // 4. Ticket creado con QR seguro
    assert.ok(ticketCreated);
    assert.equal(ticketCreated.status, "valid");
    assert.equal(ticketCreated.holder_name, "Carlos Gómez");
    assert.equal(ticketCreated.code, result.ticketCode);
  });

  test("Criterio 2: Caso de error - Faltan datos obligatorios, no hay cupo o es lunes de mantenimiento", async () => {
    const service = new PosSaleService({
      findSellerByIdFn: async () => mockTicketSeller,
      findServiceByIdFn: async () => mockPoolService,
      // Simulamos que ya hay 49 cupos ocupados de 50
      findActiveBookingsFn: async () => [
        { status: "confirmed", quantity: 49 },
      ],
    });

    // 1. Error de validación Zod: faltan datos obligatorios
    const invalidPayload = posSaleSchema.safeParse({
      sellerId: mockSellerId,
      // Faltan clientName y clientId
      serviceId: mockServiceId,
      quantity: 1,
    });
    assert.equal(invalidPayload.success, false);

    // 2. Error de aforo insuficiente (solicita 3 cupos cuando solo queda 1)
    const { startAt: saleStart2, endAt: saleEnd2 } = nextThursdaySlot(10, 11);
    await assert.rejects(
      async () => {
        await service.processSale({
          sellerId: mockSellerId,
          clientName: "Laura Pérez",
          clientId: "987654321",
          serviceId: mockServiceId,
          startAt: saleStart2,
          endAt: saleEnd2,
          quantity: 3,
          paymentMethod: "card",
        });
      },
      (err) => {
        assert.ok(err instanceof PosCapacityExceededError);
        assert.equal(err.code, "POS_CAPACITY_EXCEEDED");
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // 3. Error por mantenimiento semanal (próximo lunes)
    const { startAt: mondayStart, endAt: mondayEnd } = nextMondaySlot(10, 11);
    await assert.rejects(
      async () => {
        await service.processSale({
          sellerId: mockSellerId,
          clientName: "Laura Pérez",
          clientId: "987654321",
          serviceId: mockServiceId,
          startAt: mondayStart, // Lunes de mantenimiento
          endAt: mondayEnd,
          quantity: 1,
          paymentMethod: "cash",
        });
      },
      (err) => {
        assert.ok(err instanceof PosMaintenanceDayError);
        assert.equal(err.code, "POS_MAINTENANCE_DAY_CLOSED");
        assert.equal(err.statusCode, 422);
        assert.match(err.message, /mantenimiento/i);
        return true;
      }
    );
  });

  test("Criterio 3: Caso de error - Un usuario sin rol TICKET_SELLER recibe 403 (RN-017)", async () => {
    // Usuario con rol 'CLIENT' o 'QR_VALIDATOR'
    const nonSellerUser = {
      id: "non-seller-uuid-999",
      full_name: "Usuario Cliente",
      roles: { name: "CLIENT" },
    };

    const service = new PosSaleService({
      findSellerByIdFn: async () => nonSellerUser,
      findServiceByIdFn: async () => mockPoolService,
    });

    await assert.rejects(
      async () => {
        const { startAt: roleCheckStart, endAt: roleCheckEnd } = nextThursdaySlot(10, 11);
        await service.processSale({
          sellerId: "non-seller-uuid-999",
          clientName: "Cliente X",
          clientId: "5555555",
          serviceId: mockServiceId,
          startAt: roleCheckStart,
          endAt: roleCheckEnd,
          quantity: 1,
          paymentMethod: "cash",
        });
      },
      (err) => {
        assert.ok(err instanceof ForbiddenPosAccessError);
        assert.equal(err.code, "FORBIDDEN_POS_ACCESS");
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /TICKET_SELLER/i);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Venta en una franja ya iniciada cobra la hora completa y el QR vence al final de la franja (RN-010)", async () => {
    // Franja: próximo jueves 10:00 AM a 11:00 AM
    // Hora actual simulada: 10:25 AM (ya iniciada, pero aún no ha terminado)
    const { startAt: slotStart, endAt: slotEnd } = nextThursdaySlot(10, 11);
    // Simulamos que estamos 25 minutos después del inicio de la franja
    const slotStartDate = new Date(slotStart);
    const simulatedCurrentTime = new Date(slotStartDate.getTime() + 25 * 60 * 1000);

    let ticketCreated = null;

    const service = new PosSaleService({
      findSellerByIdFn: async () => mockTicketSeller,
      findServiceByIdFn: async () => mockPoolService,
      findActiveBookingsFn: async () => [],
      getCurrentTimeFn: () => simulatedCurrentTime,
      transactionFn: async (fn) => {
        const fakeTx = {
          users: {
            findFirst: async () => null,
            create: async (u) => ({ id: "client-id", ...u.data }),
          },
          roles: { findFirst: async () => ({ id: "role-id" }) },
          bookings: { create: async (b) => ({ id: "b-id", ...b.data }) },
          payments: { create: async (p) => ({ id: "p-id", ...p.data }) },
          tickets: {
            create: async (t) => {
              ticketCreated = { id: "t-id", ...t.data };
              return ticketCreated;
            },
          },
        };
        return fn(fakeTx);
      },
    });

    const result = await service.processSale({
      sellerId: mockSellerId,
      clientName: "Marcos Latorre",
      clientId: "71234567",
      serviceId: mockServiceId,
      startAt: slotStart,
      endAt: slotEnd,
      quantity: 1,
      paymentMethod: "card",
    });

    // 1. Marca que se vendió una franja ya iniciada
    assert.equal(result.isStartedSlotPurchased, true);

    // 2. Cobra la tarifa completa de la hora ($2.000 COP) según RN-010
    assert.equal(result.amount, 2000);

    // 3. El QR vence exactamente al final de la franja horaria (11:00 AM)
    assert.ok(ticketCreated);
    assert.equal(
      new Date(ticketCreated.valid_until).toISOString(),
      new Date(slotEnd).toISOString(),
      "El QR debe vencer exactamente al final de la franja (11:00 AM)"
    );
  });
});
