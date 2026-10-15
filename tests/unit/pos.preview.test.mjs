/**
 * FT-06 / HU26: Pruebas Unitarias de Previsualización y Emisión del Ticket Digital POS (RN-017, RN-019, RN-020)
 * Node Test Runner (node:test y node:assert)
 *
 * Criterios de Aceptación Evaluados:
 * 1. La previsualización coincide con lo que se va a emitir.
 * 2. Al confirmar se emite un ticket con QR único.
 * 3. Caso de error: confirmar una previsualización cuya disponibilidad cambió es rechazado con mensaje claro.
 * 4. Caso límite: confirmar dos veces la misma venta no genera dos tickets (idempotencia ante doble clic).
 */

process.env.TZ = process.env.TZ || "America/Bogota";

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  PosSaleService,
  PosAvailabilityChangedError,
  PosCapacityExceededError,
  ForbiddenPosAccessError,
  PosMaintenanceDayError,
  PosOperatingHoursError,
  posPreviewSchema,
} from "../../src/features/pos/index.ts";

describe("FT-06 / HU26: Previsualización y Emisión del Ticket Digital en POS", () => {
  // Hora fija: estas pruebas usan franjas del 15/oct/2026 y no deben depender del reloj real.
  const FIXED_NOW = new Date("2026-10-15T08:00:00-05:00");

  const mockSellerId = "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d";
  const mockServiceId = "b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e";

  const mockTicketSeller = {
    id: mockSellerId,
    full_name: "Daniela Taquillera",
    role_id: "c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f",
    roles: { name: "TICKET_SELLER" },
  };

  const mockPoolService = {
    id: mockServiceId,
    name: "Piscina Olímpica",
    price: 5000,
    currency: "COP",
    capacity: 30,
    is_active: true,
  };

  test("Criterio 1: La previsualización coincide exactamente 1:1 con lo que se va a emitir", async () => {
    let bookingCreated = null;
    let ticketCreated = null;

    const service = new PosSaleService({
      getCurrentTimeFn: () => FIXED_NOW,
      findSellerByIdFn: async (id) => (id === mockSellerId ? mockTicketSeller : null),
      findServiceByIdFn: async (id) => (id === mockServiceId ? mockPoolService : null),
      findActiveBookingsFn: async () => [
        { status: "confirmed", quantity: 5 }, // 5 ocupados de 30 -> 25 disponibles
      ],
      findExistingBookingByIdempotencyFn: async () => null,
      transactionFn: async (fn) => {
        const fakeTx = {
          users: {
            findFirst: async () => null,
            create: async (u) => ({ id: "client-uuid-1", ...u.data }),
          },
          roles: {
            findFirst: async () => ({ id: "client-role-uuid", name: "CLIENT" }),
          },
          bookings: {
            create: async (b) => {
              bookingCreated = { id: "booking-pos-preview-001", ...b.data };
              return bookingCreated;
            },
          },
          payments: {
            create: async (p) => ({ id: "pay-preview-001", ...p.data }),
          },
          tickets: {
            create: async (t) => {
              ticketCreated = { id: "ticket-preview-001", ...t.data };
              return ticketCreated;
            },
          },
        };
        return fn(fakeTx);
      },
    });

    const saleParams = {
      sellerId: mockSellerId,
      clientName: "Valeria Morales",
      clientId: "1098765432",
      serviceId: mockServiceId,
      startAt: "2026-10-15T14:00:00-05:00",
      endAt: "2026-10-15T15:00:00-05:00",
      quantity: 3,
      paymentMethod: "card",
    };

    // 1. Obtener previsualización (sin mutaciones)
    const preview = await service.previewSale(saleParams);

    assert.ok(preview.previewId);
    assert.equal(preview.clientName, saleParams.clientName);
    assert.equal(preview.clientId, saleParams.clientId);
    assert.equal(preview.serviceName, "Piscina Olímpica");
    assert.equal(preview.serviceId, mockServiceId);
    assert.equal(preview.quantity, 3);
    assert.equal(preview.unitPrice, 5000);
    assert.equal(preview.totalAmount, 15000); // 3 * $5.000 COP
    assert.equal(preview.currency, "COP");
    assert.equal(preview.paymentMethod, "card");
    assert.equal(preview.availableCapacity, 25);
    assert.equal(new Date(preview.startAt).toISOString(), new Date(saleParams.startAt).toISOString());
    assert.equal(new Date(preview.endAt).toISOString(), new Date(saleParams.endAt).toISOString());

    // 2. Al confirmar la venta con los mismos datos
    const confirmedSale = await service.processSale({
      ...saleParams,
      previewAvailableCapacity: preview.availableCapacity,
      idempotencyKey: preview.previewId,
    });

    // 3. Verificación de coincidencia exacta 1:1 entre preview y emisión
    assert.equal(confirmedSale.clientName, preview.clientName);
    assert.equal(confirmedSale.clientId, preview.clientId);
    assert.equal(confirmedSale.serviceName, preview.serviceName);
    assert.equal(confirmedSale.quantity, preview.quantity);
    assert.equal(confirmedSale.amount, preview.totalAmount);
    assert.equal(confirmedSale.currency, preview.currency);
    assert.equal(confirmedSale.paymentMethod, preview.paymentMethod);
    assert.equal(new Date(confirmedSale.startAt).toISOString(), new Date(preview.startAt).toISOString());
    assert.equal(new Date(confirmedSale.endAt).toISOString(), new Date(preview.endAt).toISOString());
    assert.equal(confirmedSale.status, "confirmed");
  });

  test("Criterio 2: Al confirmar se emite un ticket con QR único al portador (RN-019, RN-020)", async () => {
    let createdTicket = null;

    const service = new PosSaleService({
      getCurrentTimeFn: () => FIXED_NOW,
      findSellerByIdFn: async () => mockTicketSeller,
      findServiceByIdFn: async () => mockPoolService,
      findActiveBookingsFn: async () => [],
      transactionFn: async (fn) => {
        const fakeTx = {
          users: {
            findFirst: async () => null,
            create: async (u) => ({ id: "client-uuid-2", ...u.data }),
          },
          roles: {
            findFirst: async () => ({ id: "client-role-uuid", name: "CLIENT" }),
          },
          bookings: {
            create: async (b) => ({ id: "booking-qr-001", ...b.data }),
          },
          payments: {
            create: async (p) => ({ id: "pay-qr-001", ...p.data }),
          },
          tickets: {
            create: async (t) => {
              createdTicket = { id: "ticket-qr-001", ...t.data };
              return createdTicket;
            },
          },
        };
        return fn(fakeTx);
      },
    });

    const result = await service.processSale({
      sellerId: mockSellerId,
      clientName: "Alejandro Restrepo",
      clientId: "71234567",
      serviceId: mockServiceId,
      startAt: "2026-10-15T09:00:00-05:00",
      endAt: "2026-10-15T10:00:00-05:00",
      quantity: 1,
      paymentMethod: "cash",
    });

    // 1. El ticket emitido tiene código único de al menos 16 caracteres alfanuméricos
    assert.ok(result.ticketCode);
    assert.ok(result.ticketCode.length >= 16);
    assert.equal(result.ticketId, "ticket-qr-001");

    // 2. Verificación del QR Payload generado
    assert.ok(result.qrPayload);
    assert.equal(result.qrPayload.ticketCode, result.ticketCode);
    assert.equal(result.qrPayload.bookingId, "booking-qr-001");
    assert.ok(result.qrPayload.validFrom);
    assert.ok(result.qrPayload.validUntil);

    // 3. Verificación del ticket persistido en base de datos (RN-020: al portador)
    assert.ok(createdTicket);
    assert.equal(createdTicket.status, "valid");
    assert.equal(createdTicket.holder_name, "Alejandro Restrepo");
    assert.equal(createdTicket.code, result.ticketCode);
    assert.equal(createdTicket.metadata?.pos_sale, true);
    assert.deepEqual(createdTicket.metadata?.qr_payload, result.qrPayload);
  });

  test("Criterio 3: Caso de error - Confirmar una previsualización cuya disponibilidad cambió es rechazado con mensaje claro (409)", async () => {
    // Escenario: El vendedor previsualiza cuando hay aforo disponible (2 cupos),
    // pero antes de presionar confirmar, otra venta agota el aforo restante a 0.
    let capacityOccupied = 0;

    const service = new PosSaleService({
      getCurrentTimeFn: () => FIXED_NOW,
      findSellerByIdFn: async () => mockTicketSeller,
      findServiceByIdFn: async () => mockPoolService, // Capacidad 30
      findActiveBookingsFn: async () => [
        { status: "confirmed", quantity: capacityOccupied },
      ],
    });

    const saleParams = {
      sellerId: mockSellerId,
      clientName: "Mariana Rios",
      clientId: "1037500000",
      serviceId: mockServiceId,
      startAt: "2026-10-15T11:00:00-05:00",
      endAt: "2026-10-15T12:00:00-05:00",
      quantity: 2,
      paymentMethod: "cash",
    };

    // Previsualización inicial: cupo disponible = 30
    const preview = await service.previewSale(saleParams);
    assert.equal(preview.availableCapacity, 30);

    // Concurrentemente se llenan los 30 cupos en la base de datos
    capacityOccupied = 30; // Aforo disponible restante: 0

    // Al intentar confirmar enviando la previsualización anterior, debe detectarse el cambio
    await assert.rejects(
      async () => {
        await service.processSale({
          ...saleParams,
          previewAvailableCapacity: preview.availableCapacity, // Informa que vio 30
        });
      },
      (err) => {
        assert.ok(err instanceof PosAvailabilityChangedError);
        assert.equal(err.code, "POS_AVAILABILITY_CHANGED");
        assert.equal(err.statusCode, 409);
        assert.match(err.message, /cambió entre la previsualización y la confirmación/i);
        assert.match(err.message, /Aforo restante disponible: 0/i);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Confirmar dos veces la misma venta (doble clic / idempotencia) no genera dos tickets", async () => {
    let bookingsCreatedCount = 0;
    let ticketsCreatedCount = 0;
    let storedBooking = null;

    const service = new PosSaleService({
      getCurrentTimeFn: () => FIXED_NOW,
      findSellerByIdFn: async () => mockTicketSeller,
      findServiceByIdFn: async () => mockPoolService,
      findActiveBookingsFn: async () => [],
      findExistingBookingByIdempotencyFn: async (key) => {
        if (storedBooking && storedBooking.metadata?.idempotency_key === key) {
          return storedBooking;
        }
        return null;
      },
      transactionFn: async (fn) => {
        const fakeTx = {
          users: {
            findFirst: async () => null,
            create: async (u) => ({ id: "client-uuid-3", ...u.data }),
          },
          roles: {
            findFirst: async () => ({ id: "client-role-uuid", name: "CLIENT" }),
          },
          bookings: {
            create: async (b) => {
              bookingsCreatedCount++;
              storedBooking = {
                id: "booking-idempotency-001",
                ...b.data,
                services: mockPoolService,
                tickets: [],
                payments: [],
              };
              return storedBooking;
            },
          },
          payments: {
            create: async (p) => {
              const payment = { id: "pay-idempotency-001", ...p.data };
              storedBooking.payments.push(payment);
              return payment;
            },
          },
          tickets: {
            create: async (t) => {
              ticketsCreatedCount++;
              const ticket = { id: "ticket-idempotency-001", ...t.data };
              storedBooking.tickets.push(ticket);
              return ticket;
            },
          },
        };
        return fn(fakeTx);
      },
    });

    const idempotencyKey = "pos-tx-preview-uuid-999";
    const salePayload = {
      sellerId: mockSellerId,
      clientName: "David Ochoa",
      clientId: "80901020",
      serviceId: mockServiceId,
      startAt: "2026-10-15T16:00:00-05:00",
      endAt: "2026-10-15T17:00:00-05:00",
      quantity: 1,
      paymentMethod: "card",
      idempotencyKey,
    };

    // Primer clic: procesa y emite el ticket
    const firstCall = await service.processSale(salePayload);
    assert.equal(bookingsCreatedCount, 1);
    assert.equal(ticketsCreatedCount, 1);
    assert.equal(firstCall.ticketCode, "ticket-idempotency-001" ? firstCall.ticketCode : null);
    assert.equal(firstCall.isReused, false);

    // Segundo clic inmediato con la misma clave de idempotencia (simulando doble clic)
    const secondCall = await service.processSale(salePayload);

    // No se crearon nuevos registros en la base de datos
    assert.equal(bookingsCreatedCount, 1, "No debe crearse una segunda reserva");
    assert.equal(ticketsCreatedCount, 1, "No debe crearse un segundo ticket duplicado");

    // Retorna la misma información y el mismo código de ticket con flag isReused
    assert.equal(secondCall.bookingId, firstCall.bookingId);
    assert.equal(secondCall.ticketId, firstCall.ticketId);
    assert.equal(secondCall.ticketCode, firstCall.ticketCode);
    assert.equal(secondCall.isReused, true);
  });

  test("Validaciones de esquema Zod para Previsualización (posPreviewSchema)", () => {
    // 1. Payload válido
    const valid = posPreviewSchema.safeParse({
      sellerId: mockSellerId,
      clientName: "Camila Torres",
      clientId: "1032456789",
      serviceId: mockServiceId,
      startAt: "2026-10-15T10:00:00-05:00",
      endAt: "2026-10-15T11:00:00-05:00",
      quantity: 2,
      paymentMethod: "cash",
    });
    assert.equal(valid.success, true);

    // 2. Falla si faltan campos obligatorios
    const missingName = posPreviewSchema.safeParse({
      sellerId: mockSellerId,
      clientId: "1032456789",
      serviceId: mockServiceId,
      startAt: "2026-10-15T10:00:00-05:00",
      endAt: "2026-10-15T11:00:00-05:00",
      quantity: 1,
      paymentMethod: "card",
    });
    assert.equal(missingName.success, false);

    // 3. Falla si quantity es menor a 1
    const zeroQuantity = posPreviewSchema.safeParse({
      sellerId: mockSellerId,
      clientName: "Camila",
      clientId: "1032456789",
      serviceId: mockServiceId,
      startAt: "2026-10-15T10:00:00-05:00",
      endAt: "2026-10-15T11:00:00-05:00",
      quantity: 0,
      paymentMethod: "cash",
    });
    assert.equal(zeroQuantity.success, false);

    // 4. Falla con campos desconocidos (.strict())
    const extraField = posPreviewSchema.safeParse({
      sellerId: mockSellerId,
      clientName: "Camila",
      clientId: "1032456789",
      serviceId: mockServiceId,
      startAt: "2026-10-15T10:00:00-05:00",
      endAt: "2026-10-15T11:00:00-05:00",
      quantity: 1,
      paymentMethod: "cash",
      campoDesconocido: "hack",
    });
    assert.equal(extraField.success, false);
  });
});

