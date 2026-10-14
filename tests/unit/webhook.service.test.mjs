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

// Valores que la base real acepta (restricciones CHECK de Supabase). Si el servicio escribe otro
// valor, el mock falla igual que fallaría Postgres: así una prueba con base simulada no oculta el error.
const VALID_PAYMENT_METHODS = ["card", "pse", "cash", "transfer", "wallet", "other"];
const VALID_PAYMENT_STATUSES = [
  "pending", "processing", "approved", "rejected", "failed", "cancelled", "refunded",
];
const VALID_BOOKING_STATUSES = [
  "pending", "confirmed", "cancelled", "completed", "expired", "no_show",
];

function assertDbContract(table, data) {
  if (table === "payments") {
    if (!VALID_PAYMENT_METHODS.includes(data.method)) {
      throw new Error(`violates check constraint "payments_method_valid": ${data.method}`);
    }
    if (!VALID_PAYMENT_STATUSES.includes(data.status)) {
      throw new Error(`violates check constraint "payments_status_valid": ${data.status}`);
    }
  }
  if (table === "bookings" && data.status && !VALID_BOOKING_STATUSES.includes(data.status)) {
    throw new Error(`violates check constraint "bookings_status_valid": ${data.status}`);
  }
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
        assertDbContract("bookings", data);
        state.booking = { ...state.booking, ...data };
        return state.booking;
      },
      // Emula el UPDATE ... WHERE status = 'pending' de la base: solo una escritura gana.
      updateMany: async ({ where, data }) => {
        if (!state.booking || state.booking.id !== where.id || state.booking.status !== where.status) {
          return { count: 0 };
        }
        assertDbContract("bookings", data);
        state.booking = { ...state.booking, ...data };
        return { count: 1 };
      },
    },
    payments: {
      findFirst: async ({ where }) =>
        state.payments.find((p) => {
          if (p.booking_id !== where.booking_id) return false;
          if (where.provider_reference && p.provider_reference !== where.provider_reference) {
            return false;
          }
          if (!where.status) return true;
          return where.status.in ? where.status.in.includes(p.status) : p.status === where.status;
        }) || null,
      create: async ({ data }) => {
        assertDbContract("payments", data);
        if (
          data.provider_reference &&
          state.payments.some(
            (p) => p.provider === data.provider && p.provider_reference === data.provider_reference
          )
        ) {
          throw new Error("Unique constraint failed on the fields: (`provider`,`provider_reference`)");
        }
        const payment = { id: `pay-${state.payments.length + 1}`, ...data };
        state.payments.push(payment);
        return payment;
      },
      update: async ({ where, data }) => {
        assertDbContract("payments", data);
        const payment = state.payments.find((p) => p.id === where.id);
        Object.assign(payment, data);
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
        amount_total: 400000,
        currency: "cop",
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
    assert.equal(state.payments[0].status, "approved");
    assert.equal(state.payments[0].method, "card");
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

  it("si el HOLD venció, NO confirma, NO reembolsa y deja el cobro en revisión manual", async () => {
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
    assert.equal(db.state.payments[0].status, "processing");
    assert.equal(db.state.payments[0].raw_response.review_reason, "HOLD_EXPIRED");
    assert.equal(db.state.tickets.length, 0);
    // El MVP no reembolsa (RN-018): Stripe nunca recibe una orden de devolución.
    assert.equal(refunded.length, 0);
  });

  describe("monto cobrado distinto al de la reserva", () => {
    function buildWithRefundSpy(db) {
      const refunded = [];
      const stripe = makeStripe();
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
      return { service, refunded };
    }

    function eventWith(sessionOverrides) {
      const event = completedEvent();
      event.data.object = { ...event.data.object, ...sessionOverrides };
      return event;
    }

    it("NO confirma si Stripe cobró menos que el total de la reserva (queda en revisión, sin reembolso)", async () => {
      const db = createMockDb({ booking: baseBooking() });
      const { service, refunded } = buildWithRefundSpy(db);

      // Error de unidades: 4.000 pesos enviados como 4.000 centavos (= $40 COP)
      const result = await service.handleEvent(eventWith({ amount_total: 4000 }));

      assert.equal(result.confirmed, false);
      assert.equal(result.reason, "AMOUNT_MISMATCH");
      assert.equal(db.state.booking.status, "pending");
      assert.equal(db.state.tickets.length, 0);
      assert.equal(db.state.payments.length, 1);
      assert.equal(db.state.payments[0].status, "processing");
      assert.equal(db.state.payments[0].raw_response.review_reason, "AMOUNT_MISMATCH");
      assert.equal(refunded.length, 0);
    });

    it("NO confirma si Stripe cobró de más", async () => {
      const db = createMockDb({ booking: baseBooking() });
      const { service } = buildWithRefundSpy(db);
      const result = await service.handleEvent(eventWith({ amount_total: 800000 }));
      assert.equal(result.reason, "AMOUNT_MISMATCH");
      assert.equal(db.state.booking.status, "pending");
    });

    it("NO confirma si la moneda no es COP", async () => {
      const db = createMockDb({ booking: baseBooking() });
      const { service } = buildWithRefundSpy(db);
      const result = await service.handleEvent(eventWith({ currency: "usd" }));
      assert.equal(result.reason, "AMOUNT_MISMATCH");
      assert.equal(db.state.tickets.length, 0);
    });

    it("NO confirma si el evento no informa el monto cobrado", async () => {
      const db = createMockDb({ booking: baseBooking() });
      const { service } = buildWithRefundSpy(db);
      const result = await service.handleEvent(
        eventWith({ amount_total: undefined, currency: undefined })
      );
      assert.equal(result.confirmed, false);
      assert.equal(result.reason, "AMOUNT_MISMATCH");
      assert.equal(db.state.booking.status, "pending");
    });

    it("el reintento de un cobro ya registrado para revisión no lo duplica", async () => {
      const db = createMockDb({
        booking: baseBooking({ expires_at: new Date(NOW.getTime() - 60 * 1000) }),
      });
      const { service, refunded } = buildWithRefundSpy(db);

      await service.handleEvent(completedEvent());
      const second = await service.handleEvent(completedEvent());

      assert.equal(second.reason, "ALREADY_RECORDED");
      assert.equal(second.confirmed, false);
      assert.equal(db.state.payments.length, 1);
      assert.equal(refunded.length, 0);
    });
  });

  it("si el correo falla, el pago sigue confirmado, el webhook no devuelve error y el correo se reintenta", async () => {
    const db = createMockDb({ booking: baseBooking() });
    let failEmail = true;
    const sent = [];
    const service = new StripeWebhookService({
      db: db.client,
      stripe: makeStripe(),
      nowFn: () => NOW,
      sendEmailFn: async (params) => {
        if (failEmail) throw new Error("Resend 403: dominio no verificado");
        sent.push(params);
        return true;
      },
    });

    // 1ª entrega: confirma y el correo falla, pero NO se propaga el error (Stripe no debe reintentar sin fin)
    const first = await service.handleEvent(completedEvent());
    assert.equal(first.confirmed, true);
    assert.equal(db.state.booking.status, "confirmed");
    assert.equal(db.state.payments.length, 1);
    assert.equal(db.state.tickets.length, 1);
    assert.notEqual(db.state.booking.metadata.confirmation_email_sent, true);

    // 2ª entrega (reintento): el proveedor ya funciona, el correo sale una sola vez y nada se duplica
    failEmail = false;
    const second = await service.handleEvent(completedEvent());
    assert.equal(second.reason, "ALREADY_CONFIRMED");
    assert.equal(sent.length, 1);
    assert.equal(db.state.booking.metadata.confirmation_email_sent, true);
    assert.equal(db.state.payments.length, 1);
    assert.equal(db.state.tickets.length, 1);
  });

  it("dos entregas simultáneas del mismo evento no duplican pago, ticket ni correo", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service, emails, state } = buildService({ db });

    const [first, second] = await Promise.all([
      service.handleEvent(completedEvent()),
      service.handleEvent(completedEvent()),
    ]);

    assert.equal(first.confirmed, true);
    assert.equal(second.confirmed, true);
    assert.equal(state.booking.status, "confirmed");
    assert.equal(state.payments.filter((p) => p.status === "approved").length, 1);
    assert.equal(state.tickets.length, 1);
    assert.equal(emails.length, 1);
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
          amount_total: 400000,
          currency: "cop",
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
    assert.equal(state.payments[0].status, "failed");
    assert.equal(state.booking.status, "expired");
  });

  it("reenviar checkout.session.expired no duplica el pago ni responde con error", async () => {
    const db = createMockDb({ booking: baseBooking() });
    const { service, state } = buildService({ db });
    const expired = {
      type: "checkout.session.expired",
      data: { object: { id: "cs_exp_dup", metadata: { booking_id: "bk-1" }, payment_intent: null } },
    };

    const first = await service.handleEvent(expired);
    const second = await service.handleEvent(expired);

    assert.equal(first.reason, "PAYMENT_FAILED");
    assert.equal(second.reason, "PAYMENT_FAILED");
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].status, "failed");
    assert.equal(state.booking.status, "expired");
  });

  it("nunca degrada un pago exitoso ante un evento de fallo tardío", async () => {
    const db = createMockDb({
      booking: baseBooking({ status: "confirmed" }),
      existingPayments: [
        { id: "pay-ok", booking_id: "bk-1", status: "approved", amount: 4000 },
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
      { name: "InvalidStripeSignatureError" }
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