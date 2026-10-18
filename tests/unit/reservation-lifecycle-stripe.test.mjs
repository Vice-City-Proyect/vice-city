/**
 * TAREA 4: Pruebas Exhaustivas del Ciclo de Vida de Reservas, HOLD y Stripe Checkout
 *
 * Cobertura de los 11 escenarios obligatorios:
 * 1. Pago exitoso confirma la reserva y emite ticket/notificación según corresponda.
 * 2. Checkout cancelado o abandonado libera el horario.
 * 3. Pago fallido libera el horario o deja la reserva en el estado fallido correcto sin bloquear la disponibilidad.
 * 4. Sesión de checkout expirada libera el horario.
 * 5. HOLD expirado deja el slot disponible para otro usuario.
 * 6. Webhook duplicado no genera doble confirmación ni duplica tickets.
 * 7. Webhook con firma inválida es rechazado.
 * 8. Pago confirmado que llega tarde:
 *    - Si el slot sigue libre, comportamiento definido (revisión manual, reserva expired).
 *    - Si el slot ya fue ocupado por otra persona, manejo seguro sin sobreasignar la cancha.
 * 9. Reintento de reserva sobre un slot previamente liberado: se completa con éxito.
 * 10. Concurrencia: dos usuarios intentando reservar el mismo último cupo.
 * 11. Protección contra regresión: una reserva confirmada no puede pasar a expirada o cancelada por un evento tardío o erróneo.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  ReservationHoldService,
  SlotFullConflictError,
  expireStaleBookings,
} from "../../src/features/reservations/index.ts";
import { AvailabilityService } from "../../src/features/services/services/availability.service.ts";
import { StripeWebhookService } from "../../src/features/payments/services/webhook.service.ts";
import { InvalidStripeSignatureError } from "../../src/features/payments/errors/payments.errors.ts";

const BASE_NOW = new Date("2026-10-14T08:00:00-05:00"); // Miércoles hábil normal

describe("TAREA 4: Ciclo de Vida de Reservas, HOLD y Stripe Checkout", () => {
  // Servicio estándar: Cancha Microfútbol (capacidad: 1 para probar exclusión)
  const serviceCourt = {
    id: "service-cancha-1",
    name: "Cancha Microfútbol",
    slug: "cancha-microfutbol",
    capacity: 1,
    price: 80000,
    currency: "COP",
    duration_minutes: 60,
    is_active: true,
  };

  function createMockDb({ booking, existingPayments = [], existingTickets = [] }) {
    const state = {
      booking: booking ? { ...booking } : null,
      bookings: booking ? [{ ...booking }] : [],
      payments: [...existingPayments],
      tickets: [...existingTickets],
    };

    const tx = {
      bookings: {
        findUnique: async ({ where }) => {
          return state.bookings.find((b) => b.id === where.id) || null;
        },
        findFirst: async ({ where }) => {
          return (
            state.bookings.find((b) => {
              if (where.id && b.id !== where.id) return false;
              if (where.service_id && b.service_id !== where.service_id) return false;
              return true;
            }) || null
          );
        },
        findMany: async ({ where }) => {
          return state.bookings.filter((b) => {
            if (where.service_id && b.service_id !== where.service_id) return false;
            if (where.status?.in && !where.status.in.includes(b.status)) return false;
            if (where.OR) {
              const matchesOr = where.OR.some((cond) => {
                if (cond.status?.in && !cond.status.in.includes(b.status)) return false;
                if (
                  cond.expires_at?.gt &&
                  (!b.expires_at || new Date(b.expires_at) <= cond.expires_at.gt)
                ) {
                  return false;
                }
                return true;
              });
              if (!matchesOr) return false;
            }
            return true;
          });
        },
        update: async ({ where, data }) => {
          const b = state.bookings.find((item) => item.id === where.id);
          if (b) {
            Object.assign(b, data);
            if (state.booking?.id === where.id) {
              Object.assign(state.booking, data);
            }
          }
          return b;
        },
        updateMany: async ({ where, data }) => {
          let count = 0;
          for (const b of state.bookings) {
            if (where.id && b.id !== where.id) continue;
            if (where.status?.in && !where.status.in.includes(b.status)) continue;
            if (where.status && !where.status.in && b.status !== where.status) continue;
            if (where.expires_at?.lte) {
              if (!b.expires_at || new Date(b.expires_at) > where.expires_at.lte) continue;
            }
            Object.assign(b, data);
            if (state.booking?.id === b.id) Object.assign(state.booking, data);
            count++;
          }
          return { count };
        },
        create: async ({ data }) => {
          const newBooking = {
            id: `booking-${state.bookings.length + 1}`,
            ...data,
            created_at: BASE_NOW,
            updated_at: BASE_NOW,
          };
          state.bookings.push(newBooking);
          state.booking = newBooking;
          return newBooking;
        },
      },
      payments: {
        findFirst: async ({ where }) => {
          return (
            state.payments.find((p) => {
              if (where.booking_id && p.booking_id !== where.booking_id) return false;
              if (where.provider_reference && p.provider_reference !== where.provider_reference)
                return false;
              if (where.status && p.status !== where.status) return false;
              return true;
            }) || null
          );
        },
        create: async ({ data }) => {
          const p = { id: `pay-${state.payments.length + 1}`, ...data };
          state.payments.push(p);
          return p;
        },
        update: async ({ where, data }) => {
          const p = state.payments.find((item) => item.id === where.id);
          if (p) Object.assign(p, data);
          return p;
        },
      },
      tickets: {
        create: async ({ data }) => {
          const t = { id: `ticket-${state.tickets.length + 1}`, ...data };
          state.tickets.push(t);
          return t;
        },
        findFirst: async ({ where }) => {
          return state.tickets.find((t) => t.booking_id === where.booking_id) || null;
        },
      },
      services: {
        findFirst: async () => serviceCourt,
      },
      $transaction: async (fn) => fn(tx),
    };

    return { client: tx, state };
  }

  function completedCheckoutSession(bookingId, amountTotal = 8000000) {
    return {
      id: "cs_test_123",
      payment_status: "paid",
      amount_total: amountTotal,
      currency: "cop",
      mode: "payment",
      payment_intent: "pi_test_123",
      metadata: { booking_id: bookingId },
    };
  }

  // =========================================================================
  // 1. Pago exitoso confirma la reserva y emite ticket/notificación
  // =========================================================================
  it("1. Pago exitoso confirma la reserva y emite ticket y notificación", async () => {
    const booking = {
      id: "bk-1",
      user_id: "user-1",
      service_id: serviceCourt.id,
      status: "pending",
      total_amount: 80000,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: new Date(BASE_NOW.getTime() + 10 * 60 * 1000), // HOLD activo
      quantity: 1,
      metadata: {},
      services: { name: serviceCourt.name },
      users: { email: "cliente@vicecity.com", full_name: "Cliente Uno" },
    };

    const { client, state } = createMockDb({ booking });
    const emailsSent = [];

    const webhookService = new StripeWebhookService({
      db: client,
      nowFn: () => BASE_NOW,
      sendEmailFn: async (params) => {
        emailsSent.push(params);
        return true;
      },
    });

    const result = await webhookService.handleEvent({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: completedCheckoutSession(booking.id) },
    });

    assert.equal(result.handled, true);
    assert.equal(result.confirmed, true);
    assert.equal(state.booking.status, "confirmed");
    assert.equal(state.booking.expires_at, null);
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].status, "approved");
    assert.equal(state.tickets.length, 1);
    assert.ok(state.tickets[0].code);
    assert.equal(emailsSent.length, 1);
    assert.equal(emailsSent[0].to, "cliente@vicecity.com");
  });

  // =========================================================================
  // 2. Checkout cancelado o abandonado libera el horario
  // =========================================================================
  it("2. Checkout cancelado o abandonado libera el horario", async () => {
    const booking = {
      id: "bk-cancel",
      service_id: serviceCourt.id,
      status: "cancelled", // Cancelado / abandonado
      quantity: 1,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: new Date(BASE_NOW.getTime() + 5 * 60 * 1000),
    };

    const availService = new AvailabilityService({
      findServiceByIdFn: async () => serviceCourt,
      findBookingsForServiceDateFn: async () => [booking],
      mockNowBogota: { hours: 8, minutes: 0, dateStr: "2026-10-14" },
    });

    const availability = await availService.getServiceAvailability(
      serviceCourt.id,
      "2026-10-14"
    );

    const slot09to10 = availability.slots.find((s) => s.startTime === "09:00");
    assert.ok(slot09to10);
    assert.equal(slot09to10.status, "AVAILABLE");
    assert.equal(slot09to10.occupiedCapacity, 0);
    assert.equal(slot09to10.remainingCapacity, 1);
  });

  // =========================================================================
  // 3. Pago fallido libera el horario sin bloquear disponibilidad
  // =========================================================================
  it("3. Pago fallido (payment_intent.payment_failed) marca la reserva como expired y libera el slot", async () => {
    const booking = {
      id: "bk-fail",
      user_id: "user-1",
      service_id: serviceCourt.id,
      status: "pending",
      total_amount: 80000,
      quantity: 1,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: new Date(BASE_NOW.getTime() + 5 * 60 * 1000),
      metadata: {},
    };

    const { client, state } = createMockDb({ booking });

    const webhookService = new StripeWebhookService({
      db: client,
      nowFn: () => BASE_NOW,
    });

    const result = await webhookService.handleEvent({
      id: "evt_fail",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_fail_123",
          status: "requires_payment_method",
          currency: "cop",
          amount: 8000000,
          metadata: { booking_id: booking.id },
        },
      },
    });

    assert.equal(result.handled, true);
    assert.equal(result.confirmed, false);
    assert.equal(state.booking.status, "expired");
    assert.equal(state.payments.length, 1);
    assert.equal(state.payments[0].status, "failed");

    // Verificar que el motor de disponibilidad lo considera libre
    const availService = new AvailabilityService({
      findServiceByIdFn: async () => serviceCourt,
      findBookingsForServiceDateFn: async () => [state.booking],
      mockNowBogota: { hours: 8, minutes: 0, dateStr: "2026-10-14" },
    });

    const availability = await availService.getServiceAvailability(
      serviceCourt.id,
      "2026-10-14"
    );
    const slot09to10 = availability.slots.find((s) => s.startTime === "09:00");
    assert.equal(slot09to10.status, "AVAILABLE");
    assert.equal(slot09to10.occupiedCapacity, 0);
  });

  // =========================================================================
  // 4. Sesión de checkout expirada libera el horario
  // =========================================================================
  it("4. Sesión de checkout expirada (checkout.session.expired) libera el horario", async () => {
    const booking = {
      id: "bk-expired-session",
      user_id: "user-1",
      service_id: serviceCourt.id,
      status: "pending",
      total_amount: 80000,
      quantity: 1,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: new Date(BASE_NOW.getTime() + 10 * 60 * 1000),
      metadata: {},
    };

    const { client, state } = createMockDb({ booking });

    const webhookService = new StripeWebhookService({
      db: client,
      nowFn: () => BASE_NOW,
    });

    const result = await webhookService.handleEvent({
      id: "evt_exp",
      type: "checkout.session.expired",
      data: { object: completedCheckoutSession(booking.id) },
    });

    assert.equal(result.handled, true);
    assert.equal(result.confirmed, false);
    assert.equal(state.booking.status, "expired");

    // Comprobar que el slot queda libre
    const availService = new AvailabilityService({
      findServiceByIdFn: async () => serviceCourt,
      findBookingsForServiceDateFn: async () => [state.booking],
      mockNowBogota: { hours: 8, minutes: 0, dateStr: "2026-10-14" },
    });

    const availability = await availService.getServiceAvailability(
      serviceCourt.id,
      "2026-10-14"
    );
    const slot09to10 = availability.slots.find((s) => s.startTime === "09:00");
    assert.equal(slot09to10.status, "AVAILABLE");
    assert.equal(slot09to10.occupiedCapacity, 0);
  });

  // =========================================================================
  // 5. HOLD expirado deja el slot disponible para otro usuario
  // =========================================================================
  it("5. HOLD expirado (now > expires_at) no ocupa cupo en la consulta de disponibilidad", async () => {
    const staleHold = {
      id: "bk-stale",
      service_id: serviceCourt.id,
      status: "pending",
      quantity: 1,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: new Date(BASE_NOW.getTime() - 60 * 1000), // Venció hace 1 min
    };

    const availService = new AvailabilityService({
      findServiceByIdFn: async () => serviceCourt,
      findBookingsForServiceDateFn: async () => [staleHold],
      mockNowBogota: { hours: 8, minutes: 0, dateStr: "2026-10-14" },
    });

    const availability = await availService.getServiceAvailability(
      serviceCourt.id,
      "2026-10-14"
    );

    const slot09to10 = availability.slots.find((s) => s.startTime === "09:00");
    assert.equal(slot09to10.status, "AVAILABLE");
    assert.equal(slot09to10.occupiedCapacity, 0);
    assert.equal(slot09to10.remainingCapacity, 1);
  });

  // =========================================================================
  // 6. Webhook duplicado no genera doble confirmación ni duplica tickets
  // =========================================================================
  it("6. Webhook duplicado es estrictamente idempotente (no duplica ticket ni correo)", async () => {
    const booking = {
      id: "bk-dup",
      user_id: "user-1",
      service_id: serviceCourt.id,
      status: "pending",
      total_amount: 80000,
      quantity: 1,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: new Date(BASE_NOW.getTime() + 10 * 60 * 1000),
      metadata: {},
      services: { name: serviceCourt.name },
      users: { email: "cliente@vicecity.com", full_name: "Cliente" },
    };

    const { client, state } = createMockDb({ booking });
    let emailCount = 0;

    const webhookService = new StripeWebhookService({
      db: client,
      nowFn: () => BASE_NOW,
      sendEmailFn: async () => {
        emailCount++;
        return true;
      },
    });

    const event = {
      id: "evt_dup_1",
      type: "checkout.session.completed",
      data: { object: completedCheckoutSession(booking.id) },
    };

    // Primera entrega
    const res1 = await webhookService.handleEvent(event);
    assert.equal(res1.confirmed, true);
    assert.equal(state.payments.length, 1);
    assert.equal(state.tickets.length, 1);
    assert.equal(emailCount, 1);

    // Segunda entrega (reintento idéntico de Stripe)
    const res2 = await webhookService.handleEvent(event);
    assert.equal(res2.confirmed, true);
    assert.equal(res2.reason, "ALREADY_CONFIRMED");
    assert.equal(state.payments.length, 1);
    assert.equal(state.tickets.length, 1);
    assert.equal(emailCount, 1); // No duplicó el correo
  });

  // =========================================================================
  // 7. Webhook con firma inválida es rechazado
  // =========================================================================
  it("7. Webhook con firma inválida es rechazado con InvalidStripeSignatureError", async () => {
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
    try {
      const { client } = createMockDb({});
      const webhookService = new StripeWebhookService({
        db: client,
        stripe: {
          webhooks: {
            constructEvent: () => {
              throw new Error("Invalid signature");
            },
          },
        },
      });

      await assert.rejects(
        () => webhookService.handleRaw("{}", "t=123,v1=tampered_sig"),
        InvalidStripeSignatureError
      );
    } finally {
      if (originalSecret === undefined) {
        delete process.env.STRIPE_WEBHOOK_SECRET;
      } else {
        process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
      }
    }
  });

  // =========================================================================
  // 8. Pago confirmado que llega tarde
  // =========================================================================
  describe("8. Pago confirmado que llega tarde tras vencer el HOLD", () => {
    it("8.1 Slot sigue libre: no confirma automáticamente, registra cobro en revisión manual y expira reserva", async () => {
      const overdueBooking = {
        id: "bk-overdue-1",
        user_id: "user-1",
        service_id: serviceCourt.id,
        status: "pending",
        total_amount: 80000,
        quantity: 1,
        start_at: new Date("2026-10-14T09:00:00-05:00"),
        end_at: new Date("2026-10-14T10:00:00-05:00"),
        expires_at: new Date(BASE_NOW.getTime() - 5 * 60 * 1000), // Venció hace 5 min
        metadata: {},
      };

      const { client, state } = createMockDb({ booking: overdueBooking });

      const webhookService = new StripeWebhookService({
        db: client,
        nowFn: () => BASE_NOW,
      });

      const result = await webhookService.handleEvent({
        id: "evt_late_1",
        type: "checkout.session.completed",
        data: { object: completedCheckoutSession(overdueBooking.id) },
      });

      assert.equal(result.confirmed, false);
      assert.equal(result.reason, "HOLD_EXPIRED");
      assert.equal(state.booking.status, "expired"); // Marcada como expired para no bloquear Postgres
      assert.equal(state.payments.length, 1);
      assert.equal(state.payments[0].status, "processing"); // Revisión manual sin confirmar
      assert.equal(state.payments[0].raw_response.review_reason, "HOLD_EXPIRED");
      assert.equal(state.tickets.length, 0); // No emite ticket
    });

    it("8.2 Slot ya ocupado por Usuario B: no sobreasigna la cancha y protege la reserva de Usuario B", async () => {
      // Usuario A vencido
      const userABooking = {
        id: "bk-user-a",
        user_id: "user-a",
        service_id: serviceCourt.id,
        status: "expired",
        total_amount: 80000,
        quantity: 1,
        start_at: new Date("2026-10-14T09:00:00-05:00"),
        end_at: new Date("2026-10-14T10:00:00-05:00"),
        expires_at: new Date(BASE_NOW.getTime() - 10 * 60 * 1000),
      };

      // Usuario B ya confirmó el cupo
      const userBBooking = {
        id: "bk-user-b",
        user_id: "user-b",
        service_id: serviceCourt.id,
        status: "confirmed",
        total_amount: 80000,
        quantity: 1,
        start_at: new Date("2026-10-14T09:00:00-05:00"),
        end_at: new Date("2026-10-14T10:00:00-05:00"),
        expires_at: null,
      };

      const { client, state } = createMockDb({ booking: userABooking });
      state.bookings.push(userBBooking);

      const webhookService = new StripeWebhookService({
        db: client,
        nowFn: () => BASE_NOW,
      });

      // Llega confirmación tardía de Stripe para Usuario A
      const result = await webhookService.handleEvent({
        id: "evt_late_user_a",
        type: "checkout.session.completed",
        data: { object: completedCheckoutSession(userABooking.id) },
      });

      assert.equal(result.confirmed, false);
      assert.equal(result.reason, "HOLD_EXPIRED");
      // Usuario B permanece confirmada sin alteraciones
      const finalUserB = state.bookings.find((b) => b.id === "bk-user-b");
      assert.equal(finalUserB.status, "confirmed");
      // Usuario A no sobreasigna ni recibe ticket
      const finalUserA = state.bookings.find((b) => b.id === "bk-user-a");
      assert.equal(finalUserA.status, "expired");
      assert.equal(state.tickets.length, 0);
    });
  });

  // =========================================================================
  // 9. Reintento de reserva sobre un slot previamente liberado
  // =========================================================================
  it("9. Reintento de reserva sobre un slot previamente liberado se completa con éxito", async () => {
    // Usuario A tenía la reserva pero su HOLD venció
    const staleHold = {
      id: "bk-user-a-stale",
      service_id: serviceCourt.id,
      user_id: "user-a",
      status: "pending",
      quantity: 1,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: new Date(BASE_NOW.getTime() - 2 * 60 * 1000), // Expiró hace 2 min
    };

    const { client, state } = createMockDb({ booking: staleHold });

    const holdService = new ReservationHoldService({
      mockNow: BASE_NOW,
      transactionFn: async (fn) => fn(client),
      findServiceByIdFn: async () => serviceCourt,
    });

    // Usuario B reserva el mismo horario (09:00 a 10:00)
    const newHold = await holdService.holdReservation({
      userId: "user-b",
      serviceId: serviceCourt.id,
      startAt: "2026-10-14T09:00:00-05:00",
      endAt: "2026-10-14T10:00:00-05:00",
      quantity: 1,
    });

    assert.ok(newHold);
    assert.equal(newHold.userId, "user-b");
    assert.equal(newHold.status, "pending");

    // Verificar que la reserva vieja fue barrida a "expired"
    const oldBooking = state.bookings.find((b) => b.id === staleHold.id);
    assert.equal(oldBooking.status, "expired");
  });

  // =========================================================================
  // 10. Concurrencia: dos usuarios intentando reservar el mismo último cupo
  // =========================================================================
  it("10. Concurrencia: dos usuarios reservando el mismo último cupo, solo uno gana y el otro recibe 409", async () => {
    const { client } = createMockDb({});
    let currentCapacityOccupied = 0;

    let transactionQueue = Promise.resolve();

    const holdService = new ReservationHoldService({
      mockNow: BASE_NOW,
      findServiceByIdFn: async () => serviceCourt,
      transactionFn: async (fn) => {
        // En base de datos real, las transacciones sobre el mismo recurso se serializan
        // mediante pg_advisory_xact_lock. Simulamos la cola de transacción:
        const currentExecution = transactionQueue.then(async () => {
          return fn({
            ...client,
            bookings: {
              ...client.bookings,
              findMany: async () => {
                if (currentCapacityOccupied >= serviceCourt.capacity) {
                  return [
                    {
                      id: "already-taken",
                      quantity: 1,
                      status: "pending",
                      expires_at: new Date(BASE_NOW.getTime() + 100000),
                    },
                  ];
                }
                return [];
              },
              create: async (args) => {
                currentCapacityOccupied += 1;
                return client.bookings.create(args);
              },
            },
          });
        });

        // Asegurar que la cola continúe incluso si una transacción falla
        transactionQueue = currentExecution.catch(() => {});
        return currentExecution;
      },
    });

    // Usuario 1 reserva
    const p1 = holdService.holdReservation({
      userId: "user-concurrent-1",
      serviceId: serviceCourt.id,
      startAt: "2026-10-14T11:00:00-05:00",
      endAt: "2026-10-14T12:00:00-05:00",
      quantity: 1,
    });

    // Usuario 2 intenta reservar simultáneamente
    const p2 = holdService.holdReservation({
      userId: "user-concurrent-2",
      serviceId: serviceCourt.id,
      startAt: "2026-10-14T11:00:00-05:00",
      endAt: "2026-10-14T12:00:00-05:00",
      quantity: 1,
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1, "Exactamente una reserva debe triunfar");
    assert.equal(rejected.length, 1, "Exactamente una reserva debe ser rechazada");
    assert.ok(
      rejected[0].reason instanceof SlotFullConflictError,
      "El error devuelto debe ser SlotFullConflictError (409)"
    );
  });

  // =========================================================================
  // 11. Protección contra regresión: una reserva confirmada no puede degradarse
  // =========================================================================
  it("11. Protección contra regresión: una reserva confirmada nunca pasa a expirada por un evento tardío o de fallo", async () => {
    const confirmedBooking = {
      id: "bk-confirmed-forever",
      user_id: "user-1",
      service_id: serviceCourt.id,
      status: "confirmed",
      total_amount: 80000,
      quantity: 1,
      start_at: new Date("2026-10-14T09:00:00-05:00"),
      end_at: new Date("2026-10-14T10:00:00-05:00"),
      expires_at: null,
      metadata: { confirmed: true },
    };

    const existingPayment = {
      id: "pay-confirmed",
      booking_id: confirmedBooking.id,
      status: "approved",
      amount: 80000,
      provider: "stripe",
      provider_reference: "pi_confirmed_123",
    };

    const { client, state } = createMockDb({
      booking: confirmedBooking,
      existingPayments: [existingPayment],
    });

    const webhookService = new StripeWebhookService({
      db: client,
      nowFn: () => BASE_NOW,
    });

    // Evento de fallo tardío o erróneo para la misma reserva
    await webhookService.handleEvent({
      id: "evt_late_failure",
      type: "checkout.session.expired",
      data: { object: completedCheckoutSession(confirmedBooking.id) },
    });

    // La reserva DEBE mantenerse en "confirmed"
    assert.equal(state.booking.status, "confirmed");
    assert.equal(state.payments[0].status, "approved");

    // Evento payment_intent.payment_failed tardío
    await webhookService.handleEvent({
      id: "evt_late_pi_fail",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_confirmed_123",
          status: "failed",
          metadata: { booking_id: confirmedBooking.id },
        },
      },
    });

    // Sigue estrictamente confirmada
    assert.equal(state.booking.status, "confirmed");
    assert.equal(state.payments[0].status, "approved");
  });
});
