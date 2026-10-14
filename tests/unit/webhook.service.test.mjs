import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { StripeWebhookService } from "../../src/features/payments/services/webhook.service.ts";
import { InvalidStripeSignatureError } from "../../src/features/payments/errors/payments.errors.ts";

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
    users: { email: "cliente@vicecity.com", full_name: "Lucia Caminos" },
    ...overrides,
  };
}

function createMockDb({ booking, existingPayments = [], existingTickets = [] }) {
  const state = {
    booking: booking ? { ...booking } : null,
    payments: [...existingPayments],
    tickets: [...existingTickets],
    refundCalls: [],
  };

  const tx = {
    bookings: {
      findUnique: async () => state.booking,
      update: async ({ data }) => {
        state.booking = { ...state.booking, ...data };
        return state.booking;
      },
    },
    payments: {
      findFirst: async ({ where }) =>
        state.payments.find(
          (p) => p.booking_id === where.booking_id && (!where.status || p.status === where.status)
        ) || null,
      create: async ({ data }) => {
        const payment = { id: `pay-${state.payments.length + 1}`, ...data };
        state.payments.push(payment);
        return payment;
      },
    },
    tickets: {
      create: async ({ data }) => {
        const ticket = { id: `tkt-${state.tickets.length + 1}`, ...data };
        state.tickets.push(ticket);
        return ticket;
      },
      findFirst: async ({ where }) =>
        state.tickets.find((t) => t.booking_id === where.booking_id) || null,
    },
  };

  const client = { ...tx, $transaction: async (cb) => cb(tx) };
  return { client, state };
}

function makeStripe({ constructEvent } = {}) {
  return {
    webhooks: { constructEvent: constructEvent ?? (() => { throw new Error("firma inválida"); }) },
    refunds: {
      create: async (args) => {
        return { id: "re_1", ...args };
      },
    },
  };
}

function completedEvent(bookingId = "bk-1") {
  return {
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        payment_status: "paid",
        amount_total: 4000,
        mode: "payment",
        metadata: { booking_id: bookingId },
        payment_intent: "pi_123",
      },
    },
  };
}

function buildService(overrides = {}) {
  const emails = [];
  const db = overrides.db;
  const service = new StripeWebhookService({
    db: db.client,
    stripe: overrides.stripe,
    nowFn: () => NOW,
    sendEmailFn: async (params) => {
      emails.push(params);
      return true;
    },
  });
  return { service, emails, state: db.state };
}

describe("Webhook de Stripe: confirmación de reservas", () => {
  it("confirma la reserva, registra el pago, emite el ticket y envía el correo con QR", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service, emails, state } = buildService({ db });

    const result = await service.handleEvent(completedEvent());

    assert.equal(result.handled, true);
    assert.equal(result.confirmed, true);
    assert.equal(state.booking.status, "confirmed");
    assert.equal(state.booking.expires_at, null);
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].status, "SUCCEEDED");
    assert.equal(state.payments[0].provider_reference, "pi_123");
    assert.equal(state.tickets.length, 1);
    assert.match(state.tickets[0].code, /^[0-9a-f]{32}$/);
    assert.equal(emails.length, 1);
    assert.equal(emails[0].to, "cliente@vicecity.com");
    assert.equal(emails[0].ticketCode, state.tickets[0].code);
    assert.equal(state.booking.metadata.confirmation_email_sent, true);
  });

  it("es idempotente: un reintento de Stripe no duplica pago, ticket ni correo", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service, emails, state } = buildService({ db });

    await service.handleEvent(completedEvent());
    const second = await service.handleEvent(completedEvent());

    assert.equal(second.confirmed, true);
    assert.equal(second.reason, "ALREADY_CONFIRMED");
    assert.equal(state.payments.length, 1);
    assert.equal(state.tickets.length, 1);
    assert.equal(emails.length, 1);
  });

  it("si el HOLD venció, NO confirma y reembolsa el pago recibido", async () => {
    const db = createMockDb({
      booking: baseBooking({ expires_at: new Date(NOW.getTime() - 60 * 1000) }),
    });
    const refunded = [];
    const stripe = makeStripe({
      constructEvent: () => completedEvent(),
    });
    stripe.refunds.create = async (args) => {
      refunded.push(args);
      return { id: "re_1" };
    };
    const service = new StripeWebhookService({
      db: db.client,
      stripe,
      nowFn: () => NOW,
      sendEmailFn: async () => true,
    });

    const result = await service.handleEvent(completedEvent());

    assert.equal(result.confirmed, false);
    assert.equal(result.reason, "HOLD_EXPIRED");
    assert.equal(db.state.booking.status, "pending");
    assert.equal(db.state.payments.length, 1);
    assert.equal(db.state.payments[0].status, "REFUNDED");
    assert.equal(db.state.tickets.length, 0);
    assert.equal(refunded.length, 1);
    assert.equal(refunded[0].payment_intent, "pi_123");
  });

  it("ignora el evento si no hay booking_id en el metadata", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service } = buildService({ db });

    const result = await service.handleEvent({
      type: "checkout.session.completed",
      data: { object: { id: "cs_x", metadata: {}, payment_intent: "pi_x" } },
    });

    assert.equal(result.handled, false);
    assert.equal(result.reason, "MISSING_BOOKING_ID");
  });

  it("no confirma si el pago asíncrono aún no está completado (payment_status != paid)", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service, state } = buildService({ db });

    const result = await service.handleEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_async",
          payment_status: "unpaid",
          metadata: { booking_id: "bk-1" },
          payment_intent: "pi_async",
        },
      },
    });

    assert.equal(result.handled, false);
    assert.equal(result.reason, "PAYMENT_NOT_COMPLETED");
    assert.equal(state.booking.status, "pending");
    assert.equal(state.payments.length, 0);
    assert.equal(state.tickets.length, 0);
  });

  it("confirma cuando llega checkout.session.async_payment_succeeded ya pagado", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service, state } = buildService({ db });

    const result = await service.handleEvent({
      type: "checkout.session.async_payment_succeeded",
      data: {
        object: {
          id: "cs_async_ok",
          payment_status: "paid",
          metadata: { booking_id: "bk-1" },
          payment_intent: "pi_async_ok",
        },
      },
    });

    assert.equal(result.confirmed, true);
    assert.equal(state.booking.status, "confirmed");
    assert.equal(state.tickets.length, 1);
  });

  it("reserva inexistente: no rompe y responde handled=false", async () => {
    const db = createMockDb({ booking: null });
    const { service } = buildService({ db });
    const result = await service.handleEvent(completedEvent("bk-inexistente"));
    assert.equal(result.handled, false);
    assert.equal(result.reason, "BOOKING_NOT_FOUND");
  });

  it("checkout.session.expired marca el pago como FAILED y la reserva como expired", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service, state } = buildService({ db });

    const result = await service.handleEvent({
      type: "checkout.session.expired",
      data: { object: { id: "cs_exp", metadata: { booking_id: "bk-1" }, payment_intent: "pi_exp" } },
    });

    assert.equal(result.confirmed, false);
    assert.equal(result.reason, "PAYMENT_FAILED");
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].status, "FAILED");
    assert.equal(state.booking.status, "expired");
  });

  it("nunca degrada un pago exitoso ante un evento de fallo tardío", async () => {
    const db = createMockDb({
      booking: baseBooking({ status: "confirmed" }),
      existingPayments: [
        { id: "pay-ok", booking_id: "bk-1", status: "SUCCEEDED", amount: 4000 },
      ],
    });
    const { service, state } = buildService({ db });

    await service.handleEvent({
      type: "checkout.session.async_payment_failed",
      data: { object: { id: "cs_late", metadata: { booking_id: "bk-1" }, payment_intent: "pi_late" } },
    });

    assert.equal(state.payments.length, 1);
    assert.equal(state.booking.status, "confirmed");
  });
});

describe("Webhook de Stripe: verificación de firma", () => {
  let originalSecret;

  before(() => {
    originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
  });

  after(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it("handleRaw rechaza una firma inválida con InvalidStripeSignatureError", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const service = new StripeWebhookService({
      db: db.client,
      stripe: makeStripe({ constructEvent: () => { throw new Error("bad signature"); } }),
      nowFn: () => NOW,
      sendEmailFn: async () => true,
    });

    await assert.rejects(
      () => service.handleRaw("{}", "t=1,v1=bad"),
      InvalidStripeSignatureError
    );
  });

  it("handleRaw procesa el evento cuando la firma es válida", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const event = completedEvent();
    const service = new StripeWebhookService({
      db: db.client,
      stripe: makeStripe({ constructEvent: () => event }),
      nowFn: () => NOW,
      sendEmailFn: async () => true,
    });

    const result = await service.handleRaw(JSON.stringify(event), "t=1,v1=good");
    assert.equal(result.confirmed, true);
  });
});