/**
 * FT-05 / HU23: Pruebas Unitarias de Pasarela de Pagos (Stripe Test)
 * Node Test Runner (node:test y node:assert)
 *
 * Criterios de Aceptación Evaluados:
 * 1. Se crea el pago con el monto correcto, con descuentos incluidos (RN-016).
 * 2. Caso de error: Pagar una reserva con el HOLD vencido es rechazado (HoldExpiredPaymentError / 410).
 * 3. Caso de error: Pagar una reserva ya confirmada/pagada o cancelada es rechazada.
 * 4. Caso límite: Un doble clic o reintento del pago no genera dos cobros (idempotencia y reutilización).
 * 5. Validación de contrato Zod con .strict().
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  StripePaymentService,
  HoldExpiredPaymentError,
  BookingAlreadyPaidError,
  BookingCancelledError,
  BookingNotFoundError,
  createPaymentIntentSchema,
} from "../../src/features/payments/index.ts";

describe("FT-05 / HU23: Checkout con Tarjeta (Stripe Test)", () => {
  const mockServiceId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
  const mockBookingId = "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e";

  test("Criterio 1: Se crea el pago con el monto correcto, con descuentos incluidos (RN-016)", async () => {
    // Tarifa con descuento ya aplicado de HU22: $112.000 COP (Original $140.000 - 20%)
    const discountedTotalAmount = 112000;

    let stripeCreatedParams = null;
    let paymentRecordCreated = null;

    const mockStripeClient = {
      paymentIntents: {
        create: async (params, options) => {
          stripeCreatedParams = { params, options };
          return {
            id: "pi_test_123456789",
            client_secret: "pi_test_123456789_secret_abc123",
            created: Math.floor(Date.now() / 1000),
            status: "requires_payment_method",
          };
        },
        retrieve: async () => null,
      },
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 1000); // Faltan 8 minutos de HOLD

    const service = new StripePaymentService({
      stripeClient: mockStripeClient,
      findBookingByIdFn: async (id) => ({
        id,
        service_id: mockServiceId,
        quantity: 1,
        total_amount: discountedTotalAmount,
        status: "pending",
        expires_at: expiresAt,
        services: {
          id: mockServiceId,
          name: "Cancha Fútbol 11",
          currency: "COP",
        },
        payments: [],
      }),
      createPaymentFn: async (data) => {
        paymentRecordCreated = { id: "pay_uuid_999", ...data };
        return paymentRecordCreated;
      },
    });

    const result = await service.createPaymentIntent({
      bookingId: mockBookingId,
    });

    // 1. Verifica respuesta del servicio
    assert.equal(result.bookingId, mockBookingId);
    assert.equal(result.amount, discountedTotalAmount);
    assert.equal(result.currency, "COP");
    assert.equal(result.provider, "stripe");
    assert.equal(result.providerReference, "pi_test_123456789");
    assert.equal(result.clientSecret, "pi_test_123456789_secret_abc123");
    assert.equal(result.isReused, false);
    assert.equal(result.bookingStatus, "pending");

    // 2. Verifica que Stripe recibió el monto en centavos (112.000 * 100 = 11.200.000)
    assert.ok(stripeCreatedParams);
    assert.equal(stripeCreatedParams.params.amount, discountedTotalAmount * 100);
    assert.equal(stripeCreatedParams.params.currency, "cop");
    assert.deepEqual(stripeCreatedParams.params.payment_method_types, ["card"]);
    assert.equal(stripeCreatedParams.params.metadata.bookingId, mockBookingId);

    // 3. Verifica registro en la base de datos
    assert.ok(paymentRecordCreated);
    assert.equal(paymentRecordCreated.status, "pending");
    assert.equal(paymentRecordCreated.method, "card");
    assert.equal(paymentRecordCreated.provider_reference, "pi_test_123456789");
    assert.equal(paymentRecordCreated.amount, discountedTotalAmount);
  });

  test("Criterio 2: Caso de error - Pagar una reserva con el HOLD vencido es rechazado (RN-011 / RN-016)", async () => {
    const pastExpiresAt = new Date(Date.now() - 30 * 1000); // Expiró hace 30 segundos

    let stripeCalled = false;

    const service = new StripePaymentService({
      stripeClient: {
        paymentIntents: {
          create: async () => {
            stripeCalled = true;
            return {};
          },
          retrieve: async () => null,
        },
      },
      findBookingByIdFn: async (id) => ({
        id,
        total_amount: 100000,
        status: "pending",
        expires_at: pastExpiresAt,
        services: { name: "Piscina Adultos", currency: "COP" },
        payments: [],
      }),
    });

    await assert.rejects(
      async () => {
        await service.createPaymentIntent({ bookingId: mockBookingId });
      },
      (err) => {
        assert.ok(err instanceof HoldExpiredPaymentError);
        assert.equal(err.code, "HOLD_EXPIRED_PAYMENT");
        assert.equal(err.statusCode, 410);
        assert.match(err.message, /HOLD/i);
        return true;
      }
    );

    // Garantizar que no se llamó a Stripe
    assert.equal(stripeCalled, false);
  });

  test("Criterio 3: Caso de error - Pagar una reserva ya pagada o cancelada es rechazada", async () => {
    // 1. Reserva ya pagada / confirmada
    const servicePaid = new StripePaymentService({
      findBookingByIdFn: async (id) => ({
        id,
        status: "confirmed",
        expires_at: new Date(Date.now() + 600000),
      }),
    });

    await assert.rejects(
      async () => {
        await servicePaid.createPaymentIntent({ bookingId: mockBookingId });
      },
      (err) => {
        assert.ok(err instanceof BookingAlreadyPaidError);
        assert.equal(err.code, "BOOKING_ALREADY_PAID");
        assert.equal(err.statusCode, 409);
        return true;
      }
    );

    // 2. Reserva cancelada
    const serviceCancelled = new StripePaymentService({
      findBookingByIdFn: async (id) => ({
        id,
        status: "cancelled",
        expires_at: new Date(Date.now() + 600000),
      }),
    });

    await assert.rejects(
      async () => {
        await serviceCancelled.createPaymentIntent({ bookingId: mockBookingId });
      },
      (err) => {
        assert.ok(err instanceof BookingCancelledError);
        assert.equal(err.code, "BOOKING_CANCELLED");
        assert.equal(err.statusCode, 400);
        return true;
      }
    );

    // 3. Reserva inexistente
    const serviceNotFound = new StripePaymentService({
      findBookingByIdFn: async () => null,
    });

    await assert.rejects(
      async () => {
        await serviceNotFound.createPaymentIntent({ bookingId: mockBookingId });
      },
      (err) => {
        assert.ok(err instanceof BookingNotFoundError);
        assert.equal(err.code, "BOOKING_NOT_FOUND");
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Doble clic o reintento de pago no genera dos cobros (Idempotencia)", async () => {
    let stripeCreateCallsCount = 0;
    let stripeRetrieveCallsCount = 0;

    const existingPaymentIntentId = "pi_existing_987654";
    const existingClientSecret = "pi_existing_987654_secret_xyz789";

    const mockStripeClient = {
      paymentIntents: {
        create: async () => {
          stripeCreateCallsCount++;
          return {
            id: "pi_should_not_be_created",
            client_secret: "secret_should_not_be_created",
          };
        },
        retrieve: async (id) => {
          stripeRetrieveCallsCount++;
          assert.equal(id, existingPaymentIntentId);
          return {
            id: existingPaymentIntentId,
            client_secret: existingClientSecret,
            status: "requires_payment_method",
          };
        },
      },
    };

    // La reserva ya tiene un intento previo pendiente (ej: usuario presionó pagar dos veces)
    const service = new StripePaymentService({
      stripeClient: mockStripeClient,
      findBookingByIdFn: async (id) => ({
        id,
        total_amount: 80000,
        status: "pending",
        expires_at: new Date(Date.now() + 500000),
        services: { name: "Cancha Microfútbol", currency: "COP" },
        payments: [
          {
            id: "pay_existing_001",
            status: "pending",
            provider: "stripe",
            provider_reference: existingPaymentIntentId,
          },
        ],
      }),
    });

    const result = await service.createPaymentIntent({
      bookingId: mockBookingId,
    });

    // Debe reutilizar el intento previo
    assert.equal(result.isReused, true, "El intento debe marcarse como reutilizado");
    assert.equal(result.providerReference, existingPaymentIntentId);
    assert.equal(result.clientSecret, existingClientSecret);
    assert.equal(result.paymentId, "pay_existing_001");

    // Garantizar que no se creó un nuevo PaymentIntent en Stripe
    assert.equal(stripeCreateCallsCount, 0, "No debe llamar a stripe.paymentIntents.create");
    assert.equal(stripeRetrieveCallsCount, 1, "Debe consultar el intento existente");
  });

  test("Criterio 5: Validación de contrato Zod con .strict()", () => {
    // 1. Payload válido
    const valid = createPaymentIntentSchema.safeParse({
      bookingId: "d3b07384-d113-4c91-9c60-8f9f6885dfb2",
    });
    assert.ok(valid.success);

    // 2. Campo adicional rechazado por .strict()
    const withExtra = createPaymentIntentSchema.safeParse({
      bookingId: "d3b07384-d113-4c91-9c60-8f9f6885dfb2",
      unauthorizedField: "hacker",
    });
    assert.equal(withExtra.success, false);

    // 3. UUID inválido rechazado
    const invalidUuid = createPaymentIntentSchema.safeParse({
      bookingId: "not-a-valid-uuid",
    });
    assert.equal(invalidUuid.success, false);
  });
});
