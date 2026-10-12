import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CheckoutService } from "../../src/features/payments/services/checkout.service.ts";
import {
  BookingNotFoundError,
  BookingNotPayableError,
  ForbiddenBookingAccessError,
} from "../../src/features/payments/errors/payments.errors.ts";

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
    assert.equal(params.line_items[0].price_data.unit_amount, 4000);
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
      ForbiddenBookingAccessError
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
      BookingNotPayableError
    );
  });

  it("rechaza el pago cuando el HOLD de 10 minutos ya venció", async () => {
    const { service } = build(
      baseBooking({ expires_at: new Date(NOW.getTime() - 1000) })
    );
    await assert.rejects(
      () => service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" }),
      BookingNotPayableError
    );
  });

  it("lanza BookingNotFoundError si la reserva no existe", async () => {
    const { service } = build(null);
    await assert.rejects(
      () => service.createCheckoutSession("bk-1", { id: "user-1", role: "CLIENT" }),
      BookingNotFoundError
    );
  });
});