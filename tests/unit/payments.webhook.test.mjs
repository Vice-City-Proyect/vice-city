/**
 * FT-05 / HU24: Pruebas Unitarias de Webhook de Stripe y Confirmación de Tickets
 * Node Test Runner (node:test y node:assert)
 *
 * Criterios de Aceptación Evaluados:
 * 1. Un evento payment_intent.succeeded válido confirma la reserva y crea el ticket (RN-016 y RN-019).
 * 2. Caso de error: Un evento sin firma válida es rechazado (InvalidWebhookSignatureError / 400).
 * 3. Caso límite: El mismo evento recibido dos veces no duplica el ticket (Idempotencia).
 * 4. Caso límite: Un pago confirmado después de vencido el HOLD se maneja de forma controlada.
 * 5. Sin reembolsos en MVP (RN-018): Eventos de reembolso no alteran ni revocan tickets existentes.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  StripeWebhookService,
  InvalidWebhookSignatureError,
  WebhookBookingNotFoundError,
} from "../../src/features/payments/index.ts";

describe("FT-05 / HU24: Webhook de Stripe y Confirmación de Tickets", () => {
  const mockBookingId = "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f";
  const mockPaymentIntentId = "pi_3MtwBwLkdIwHu7ix28a3tqPa";

  test("Criterio 1: Un evento payment_intent.succeeded válido confirma la reserva y crea el ticket (RN-016 y RN-019)", async () => {
    let bookingUpdatedData = null;
    let paymentUpdatedData = null;
    let ticketCreatedData = null;

    const mockBooking = {
      id: mockBookingId,
      status: "pending",
      total_amount: 140000,
      expires_at: new Date(Date.now() + 500000), // HOLD vigente
      start_at: new Date("2026-10-15T09:00:00-05:00"),
      end_at: new Date("2026-10-15T10:00:00-05:00"),
      tickets: [],
      payments: [
        {
          id: "pay_001",
          status: "pending",
          provider_reference: mockPaymentIntentId,
        },
      ],
      users: { full_name: "Daniela Zapata" },
    };

    const service = new StripeWebhookService({
      transactionFn: async (fn) => fn({}),
      findBookingFn: async (id) => (id === mockBookingId ? mockBooking : null),
      updateBookingFn: async (id, data) => {
        bookingUpdatedData = data;
        mockBooking.status = data.status;
        return { ...mockBooking, ...data };
      },
      updatePaymentFn: async (id, data) => {
        paymentUpdatedData = data;
        return { id, ...data };
      },
      createTicketFn: async (data) => {
        ticketCreatedData = { id: "ticket_uuid_100", ...data };
        mockBooking.tickets.push(ticketCreatedData);
        return ticketCreatedData;
      },
    });

    const mockEvent = {
      id: "evt_test_001",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: mockPaymentIntentId,
          amount: 14000000,
          currency: "cop",
          status: "succeeded",
          metadata: { bookingId: mockBookingId },
        },
      },
    };

    const result = await service.handleWebhookEvent(mockEvent);

    // 1. Verificación del resultado general
    assert.equal(result.processed, true);
    assert.equal(result.bookingId, mockBookingId);
    assert.equal(result.paymentIntentId, mockPaymentIntentId);
    assert.equal(result.isAlreadyProcessed, false);
    assert.ok(result.ticketId);
    assert.ok(result.ticketCode);

    // 2. Verificación de actualización de la reserva
    assert.ok(bookingUpdatedData);
    assert.equal(bookingUpdatedData.status, "confirmed");

    // 3. Verificación de actualización del pago
    assert.ok(paymentUpdatedData);
    assert.equal(paymentUpdatedData.status, "approved");
    assert.ok(paymentUpdatedData.paid_at);

    // 4. Verificación de creación del ticket con QR seguro (RN-019)
    assert.ok(ticketCreatedData);
    assert.equal(ticketCreatedData.booking_id, mockBookingId);
    assert.equal(ticketCreatedData.status, "valid");
    assert.equal(ticketCreatedData.holder_name, "Daniela Zapata");
    assert.ok(ticketCreatedData.code.length >= 16, "El código QR debe ser seguro y único");
    assert.equal(ticketCreatedData.metadata.qr_payload.ticketCode, ticketCreatedData.code);
  });

  test("Criterio 2: Caso de error - Un evento sin firma válida es rechazado (RN-016)", () => {
    const service = new StripeWebhookService({
      constructEventFn: () => {
        throw new Error("No signatures found matching the expected signature for payload");
      },
    });

    // 1. Firma inválida
    assert.throws(
      () => {
        service.verifyWebhookSignature('{"fake":"body"}', "t=123,v1=invalidsig");
      },
      (err) => {
        assert.ok(err instanceof InvalidWebhookSignatureError);
        assert.equal(err.code, "INVALID_WEBHOOK_SIGNATURE");
        assert.equal(err.statusCode, 400);
        return true;
      }
    );

    // 2. Firma ausente
    assert.throws(
      () => {
        service.verifyWebhookSignature('{"fake":"body"}', "");
      },
      (err) => {
        assert.ok(err instanceof InvalidWebhookSignatureError);
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  test("Criterio 3: Caso límite - El mismo evento recibido dos veces no duplica el ticket (Idempotencia)", async () => {
    let createTicketCalls = 0;

    const existingTicket = {
      id: "ticket_existing_999",
      code: "QR_EXISTING_SECURE_CODE_123",
      status: "valid",
    };

    // La reserva ya fue confirmada previamente en el primer intento del webhook
    const mockAlreadyConfirmedBooking = {
      id: mockBookingId,
      status: "confirmed",
      total_amount: 140000,
      tickets: [existingTicket],
      payments: [{ id: "pay_001", status: "approved" }],
    };

    const service = new StripeWebhookService({
      transactionFn: async (fn) => fn({}),
      findBookingFn: async () => mockAlreadyConfirmedBooking,
      createTicketFn: async () => {
        createTicketCalls++;
        return {};
      },
    });

    const mockEvent = {
      id: "evt_duplicate_002",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: mockPaymentIntentId,
          metadata: { bookingId: mockBookingId },
        },
      },
    };

    const result = await service.handleWebhookEvent(mockEvent);

    // Debe ser idempotente: no crear un segundo ticket y devolver el existente
    assert.equal(result.processed, true);
    assert.equal(result.isAlreadyProcessed, true);
    assert.equal(result.ticketId, existingTicket.id);
    assert.equal(result.ticketCode, existingTicket.code);
    assert.equal(createTicketCalls, 0, "No debe crearse un segundo ticket para el mismo evento");
  });

  test("Criterio 4: Caso límite - Un pago confirmado después de vencido el HOLD se maneja de forma controlada", async () => {
    const pastExpiresAt = new Date(Date.now() - 60 * 1000); // El HOLD venció hace 1 minuto

    let rescuedFlagSaved = false;

    const mockOverdueBooking = {
      id: mockBookingId,
      status: "pending",
      expires_at: pastExpiresAt,
      start_at: new Date("2026-10-15T09:00:00-05:00"),
      end_at: new Date("2026-10-15T10:00:00-05:00"),
      tickets: [],
      payments: [{ id: "pay_overdue", status: "pending", provider_reference: mockPaymentIntentId }],
      metadata: {},
    };

    const service = new StripeWebhookService({
      transactionFn: async (fn) => fn({}),
      findBookingFn: async () => mockOverdueBooking,
      updateBookingFn: async (id, data) => {
        if (data.metadata?.overdue_hold_rescued) {
          rescuedFlagSaved = true;
        }
        return { ...mockOverdueBooking, ...data };
      },
      updatePaymentFn: async (id, data) => ({ id, ...data }),
      createTicketFn: async (data) => ({ id: "ticket_rescued_123", ...data }),
    });

    const mockEvent = {
      id: "evt_overdue_003",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: mockPaymentIntentId,
          metadata: { bookingId: mockBookingId },
        },
      },
    };

    const result = await service.handleWebhookEvent(mockEvent);

    // Debe procesar con rescate controlado y generar el ticket para proteger el dinero del usuario
    assert.equal(result.processed, true);
    assert.equal(result.overdueHoldRescued, true);
    assert.ok(result.ticketId);
    assert.equal(rescuedFlagSaved, true, "Debe registrar auditoría de rescate en metadata");
  });

  test("Criterio 5: Sin reembolsos en MVP (RN-018) - Eventos no admitidos se ignoran sin mutar reservas", async () => {
    let updateBookingCalled = false;

    const service = new StripeWebhookService({
      updateBookingFn: async () => {
        updateBookingCalled = true;
      },
    });

    const mockRefundEvent = {
      id: "evt_refund_004",
      type: "charge.refunded",
      data: {
        object: { id: "ch_123" },
      },
    };

    const result = await service.handleWebhookEvent(mockRefundEvent);

    assert.equal(result.processed, false);
    assert.equal(updateBookingCalled, false, "Los eventos de reembolso no deben cancelar reservas en el MVP");
  });
});
