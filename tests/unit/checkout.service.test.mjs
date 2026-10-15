import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CheckoutService } from "../../src/features/payments/services/checkout.service";
import {
  BookingNotFoundError,
  BookingNotPayableError,
  ForbiddenBookingAccessError,
} from "../../src/features/payments/errors/payments.errors";

const NOW = new Date("2099-06-02T14:00:00.000Z");

function baseBooking(overrides = {}) {
  return {
    id: "bk-1",
    user_id: "user-1",
    status: "pending",
    total_amount: 4000,
    quantity: 2,
    start_at: new Date("2099-06-02T15:00:00.000Z"),
    end_at: new Date("2099-06-02T16:00:00.000Z"),
    expires_at: new Date(NOW.getTime() + 5 * 60 * 1000),
    metadata: {},
    services: { name: "Piscina Adultos 1" },
    users: { email: "cliente@vicecity.com" },
    ...overrides,
  };
}

function createMockDb(booking) {
  const state = { booking: booking ? { ...booking } : null, updates: [] };
  return {
    state,
    bookings: {
      findUnique: async () => state.booking,
      update: async ({ data }) => {
        state.updates.push(data);
        state.booking = { ...state.booking, ...data };
        return state.booking;
      },
    },
  };
}

function createFakeStripe() {
  const created = [];
  return {
    created,
    checkout: {
      sessions: {
        create: async (params) => {
          created.push(params);
          return { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1", ...params };
        },
      },
    },
  };
}

function build(booking, stripe = createFakeStripe()) {
  const db = createMockDb(booking);
  const service = new CheckoutService({
    db,
    stripe,
    nowFn: () => NOW,
    appBaseUrlFn: () => "https://vicecity.example",
  });
  return { service, db, stripe };
}

describe("CheckoutService: creación de la sesión de pago", () => {
  it("crea la sesión con el monto del servidor y persiste la referencia", async () => {
    const { service, db, stripe } = build(baseBooking());

    const result = await service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" });

    assert.equal(result.amount, 4000);
    assert.equal(result.currency, "COP");
    assert.equal(result.checkoutUrl, "https://checkout.stripe.com/c/pay/cs_test_1");

    const params = stripe.created[0];
    // Stripe trata el COP con dos decimales: 4.000 pesos se envían como 400.000 centavos.
    assert.equal(params.line_items[0].price_data.unit_amount, 400000);
    assert.equal(params.line_items[0].price_data.currency, "cop");
    assert.equal(params.metadata.booking_id, "bk-1");
    assert.equal(params.mode, "payment");

    assert.equal(db.state.booking.metadata.stripe_session_id, "cs_test_1");
    assert.equal(db.state.booking.metadata.stripe_amount, 4000);
  });

  it("rechaza el pago si la reserva no pertenece al usuario (403)", async () => {
    const { service } = build(baseBooking({ user_id: "otro-user" }));
    await assert.rejects(
      () => service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" }),
      { name: "ForbiddenBookingAccessError" }
    );
  });

  it("permite a un ADMIN pagar la reserva de otro usuario", async () => {
    const { service } = build(baseBooking({ user_id: "otro-user" }));
    const result = await service.createCheckoutSession("bk-1", { id: "admin-1", role: "ADMIN" });
    assert.equal(result.bookingId, "bk-1");
  });

  it("rechaza reservas que no están pendientes (409)", async () => {
    const { service } = build(baseBooking({ status: "confirmed" }));
    await assert.rejects(
      () => service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" }),
      { name: "BookingNotPayableError" }
    );
  });

  it("rechaza el pago cuando el HOLD de 10 minutos ya venció", async () => {
    const { service } = build(
      baseBooking({ expires_at: new Date(NOW.getTime() - 1000) })
    );
    await assert.rejects(
      () => service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" }),
      { name: "BookingNotPayableError" }
    );
  });

  it("el monto enviado a Stripe es pesos × 100 también con valores no redondos", async () => {
    const { service, stripe } = build(baseBooking({ total_amount: 140000 }));
    await service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" });
    assert.equal(stripe.created[0].line_items[0].price_data.unit_amount, 14000000);
  });

  it("si Stripe falla, devuelve un error claro (502) y no guarda la sesión en la reserva", async () => {
    const stripe = createFakeStripe();
    stripe.checkout.sessions.create = async () => {
      throw new Error("The Checkout Session's total amount must convert to at least 50 cents.");
    };
    const db = createMockDb(baseBooking());
    const service = new CheckoutService({ db, stripe, nowFn: () => NOW });

    await assert.rejects(
      () => service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" }),
      (error) => {
        assert.equal(error.name, "StripeOperationError");
        assert.equal(error.code, "STRIPE_OPERATION_FAILED");
        assert.equal(error.statusCode, 502);
        // el detalle interno de Stripe no se filtra al cliente
        assert.doesNotMatch(error.message, /50 cents/);
        return true;
      }
    );
    assert.equal(db.state.updates.length, 0);
    assert.equal(db.state.booking.metadata.stripe_session_id, undefined);
  });

  it("lanza BookingNotFoundError si la reserva no existe", async () => {
    const { service } = build(null);
    await assert.rejects(
      () => service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" }),
      { name: "BookingNotFoundError" }
    );
  });
});