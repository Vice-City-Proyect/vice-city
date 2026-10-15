/**
 * Servicio de procesamiento del Webhook de Stripe.
 * Vice City - Features: Payments
 *
 * Garantías:
 * - Verificación de firma con STRIPE_WEBHOOK_SECRET (nunca se confía en el cliente).
 * - Idempotencia: los reintentos de Stripe no duplican pagos, tickets ni correos.
 * - Confirmación atómica: pago + reserva + ticket en una sola transacción (ORM).
 * - Si el HOLD de 10 min venció antes del pago, no se confirma y se reembolsa.
 * - El correo de confirmación con QR se envía una única vez.
 */

import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  constructStripeEvent,
  getStripeClient,
} from "./stripe.client";
import { createTicketForBooking } from "./ticket.service";
import {
  sendBookingConfirmationEmail,
  type BookingConfirmationEmailParams,
} from "./booking-email.service";
import { InvalidStripeSignatureError } from "../errors/payments.errors";
import { STRIPE_CURRENCY, toStripeMinorUnits } from "../lib/stripe.config";

export interface WebhookResult {
  received: true;
  handled: boolean;
  type: string;
  confirmed?: boolean;
  reason?: string;
}

export interface StripeWebhookDeps {
  db?: PrismaClient;
  stripe?: Stripe;
  nowFn?: () => Date;
  /** Función de envío de correo inyectable (por defecto el servicio real) */
  sendEmailFn?: (params: BookingConfirmationEmailParams) => Promise<boolean>;
}

type ReviewReason = "HOLD_EXPIRED" | "AMOUNT_MISMATCH";

interface TransactionOutcome {
  kind:
    | "confirmed"
    | "already"
    | "raced"
    | "review_needed"
    | "already_recorded"
    | "not_found";
  booking?: any;
  ticket?: any;
  reason?: ReviewReason;
  paymentId?: string;
}

/**
 * Estado de un cobro recibido que NO se pudo confirmar (HOLD vencido o monto distinto).
 * Es un valor válido de la restricción `payments_status_valid`. El MVP no reembolsa
 * (RN-018): el cobro queda en revisión manual y no se confirma la reserva.
 */
const REVIEW_STATUS = "processing";

export class StripeWebhookService {
  private db: PrismaClient;
  private stripe?: Stripe;
  private nowFn: () => Date;
  private sendEmailFn: (params: BookingConfirmationEmailParams) => Promise<boolean>;

  constructor(deps: StripeWebhookDeps = {}) {
    this.db = deps.db ?? defaultPrisma;
    this.stripe = deps.stripe;
    this.nowFn = deps.nowFn ?? (() => new Date());
    this.sendEmailFn = deps.sendEmailFn ?? sendBookingConfirmationEmail;
  }

  /**
   * Verifica la firma y procesa el evento recibido (cuerpo crudo).
   */
  async handleRaw(rawBody: string | Buffer, signature: string): Promise<WebhookResult> {
    let event: Stripe.Event;
    try {
      const stripe = this.stripe ?? getStripeClient();
      event = constructStripeEvent(rawBody, signature, stripe);
    } catch (error: any) {
      // Errores de configuración se propagan tal cual (503); firma inválida → 400.
      if (error instanceof InvalidStripeSignatureError) throw error;
      if (error?.code === "STRIPE_NOT_CONFIGURED") throw error;
      throw new InvalidStripeSignatureError();
    }

    return this.handleEvent(event);
  }

  async handleEvent(event: Stripe.Event): Promise<WebhookResult> {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        return this.handleCheckoutFailed(
          event.data.object as Stripe.Checkout.Session,
          event.type
        );
      default:
        return { received: true, handled: false, type: event.type };
    }
  }

  private summarizeSession(session: Stripe.Checkout.Session): Record<string, unknown> {
    return {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency ?? null,
      customer_email: (session as any).customer_email ?? null,
      mode: session.mode,
    };
  }

  private getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
    const pi = (session as any).payment_intent;
    if (!pi) return null;
    return typeof pi === "string" ? pi : pi.id ?? null;
  }

  /**
   * Verifica que lo cobrado por Stripe coincida con el total congelado de la reserva.
   * Nunca se confirma por el valor de la base de datos si Stripe cobró otra cosa.
   */
  private paidAmountMatches(
    session: Stripe.Checkout.Session,
    booking: { total_amount: unknown }
  ): boolean {
    const expected = toStripeMinorUnits(Number(booking.total_amount));
    const currency = String(session.currency ?? "").toLowerCase();
    return (
      session.amount_total === expected && currency === STRIPE_CURRENCY.toLowerCase()
    );
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<WebhookResult> {
    const type = "checkout.session.completed";
    const bookingId = (session.metadata?.booking_id as string) || null;
    const paymentIntentId = this.getPaymentIntentId(session);
    const now = this.nowFn();

    if (!bookingId) {
      return { received: true, handled: false, type, reason: "MISSING_BOOKING_ID" };
    }

    // Pagos asíncronos: solo se confirma cuando el pago está efectivamente realizado.
    const paymentStatus = (session as any).payment_status;
    if (
      paymentStatus &&
      paymentStatus !== "paid" &&
      paymentStatus !== "no_payment_required"
    ) {
      return { received: true, handled: false, type, reason: "PAYMENT_NOT_COMPLETED" };
    }

    const providerReference = paymentIntentId || session.id;

    const outcome = await this.db.$transaction(
      async (tx: any): Promise<TransactionOutcome> => {
        const booking = await tx.bookings.findUnique({
          where: { id: bookingId },
          include: { services: true, users: true },
        });

        if (!booking) {
          return { kind: "not_found" };
        }

        const meta = (booking.metadata as Record<string, any>) || {};

        // Idempotencia: si ya hay un pago exitoso o la reserva ya está confirmada.
        const existingPayment = await tx.payments.findFirst({
          where: { booking_id: bookingId, status: "approved" },
        });

        if (existingPayment || booking.status === "confirmed") {
          return { kind: "already", booking };
        }

        // Reintento de un cobro que ya se registró para revisión: no se repite.
        const existingReview = await tx.payments.findFirst({
          where: {
            booking_id: bookingId,
            provider_reference: providerReference,
            status: REVIEW_STATUS,
          },
        });
        if (existingReview) {
          return { kind: "already_recorded" };
        }

        const holdExpired = booking.expires_at
          ? new Date(booking.expires_at).getTime() <= now.getTime()
          : false;
        const notPayable = booking.status !== "pending" || holdExpired;
        const amountMismatch = !notPayable && !this.paidAmountMatches(session, booking);

        // HOLD vencido, reserva no pendiente o monto cobrado distinto al de la reserva:
        // no se confirma. El cobro queda en revisión manual (sin reembolso automático).
        if (notPayable || amountMismatch) {
          const reason: ReviewReason = notPayable ? "HOLD_EXPIRED" : "AMOUNT_MISMATCH";
          const payment = await tx.payments.create({
            data: {
              booking_id: bookingId,
              amount: Number(booking.total_amount),
              currency: "COP",
              method: "card",
              status: REVIEW_STATUS,
              provider: "stripe",
              provider_reference: providerReference,
              raw_response: { ...this.summarizeSession(session), review_reason: reason },
            },
          });
          return { kind: "review_needed", reason, paymentId: payment.id };
        }

        const confirmedMetadata = {
          ...meta,
          stripe_session_id: session.id,
          stripe_payment_intent: paymentIntentId,
          paid_at: now.toISOString(),
        };

        // Confirmación atómica (compare-and-set): solo una entrega concurrente del mismo
        // evento puede pasar la reserva de "pending" a "confirmed"; las demás no duplican
        // pago ni ticket.
        const claimed = await tx.bookings.updateMany({
          where: { id: bookingId, status: "pending" },
          data: {
            status: "confirmed",
            expires_at: null,
            updated_at: now,
            metadata: confirmedMetadata,
          },
        });
        if (claimed.count === 0) {
          return { kind: "raced" };
        }

        await tx.payments.create({
          data: {
            booking_id: bookingId,
            amount: Number(booking.total_amount),
            currency: "COP",
            method: "card",
            status: "approved",
            provider: "stripe",
            provider_reference: providerReference,
            paid_at: now,
            raw_response: this.summarizeSession(session),
          },
        });

        const ticket = await createTicketForBooking(tx, {
          bookingId,
          holderName: booking.users?.full_name ?? null,
          validFrom: booking.start_at,
          validUntil: booking.end_at,
          metadata: { stripe_session_id: session.id },
        });

        return {
          kind: "confirmed",
          booking: {
            ...booking,
            status: "confirmed",
            expires_at: null,
            updated_at: now,
            metadata: confirmedMetadata,
          },
          ticket,
        };
      }
    );

    if (outcome.kind === "confirmed" || outcome.kind === "already") {
      // El correo es secundario: si el proveedor falla, el pago ya está confirmado y Stripe
      // NO debe recibir un error (reintentaría el webhook sin fin). Se reintenta en la próxima entrega.
      try {
        await this.deliverConfirmation(outcome.booking, outcome.ticket?.code);
      } catch (error: unknown) {
        console.error("[BOOKING_EMAIL_FAILED] reserva confirmada, correo pendiente", {
          bookingId,
          message: error instanceof Error ? error.message : "error desconocido",
        });
      }
      return {
        received: true,
        handled: true,
        type,
        confirmed: true,
        reason: outcome.kind === "already" ? "ALREADY_CONFIRMED" : "CONFIRMED",
      };
    }

    // Otra entrega del mismo evento ganó la confirmación: ella envía el correo.
    if (outcome.kind === "raced") {
      return {
        received: true,
        handled: true,
        type,
        confirmed: true,
        reason: "ALREADY_CONFIRMED",
      };
    }

    if (outcome.kind === "already_recorded") {
      return {
        received: true,
        handled: true,
        type,
        confirmed: false,
        reason: "ALREADY_RECORDED",
      };
    }

    if (outcome.kind === "review_needed") {
      // Alguien debe revisar a mano este cobro: se dejó registrado pero la reserva no se confirmó.
      console.error("[STRIPE_PAYMENT_REVIEW_REQUIRED] cobro sin confirmar: revisión manual", {
        paymentId: outcome.paymentId,
        bookingId,
        reason: outcome.reason,
      });
      return { received: true, handled: true, type, confirmed: false, reason: outcome.reason };
    }

    return { received: true, handled: false, type, reason: "BOOKING_NOT_FOUND" };
  }

  private async handleCheckoutFailed(
    session: Stripe.Checkout.Session,
    type: string
  ): Promise<WebhookResult> {
    const bookingId = (session.metadata?.booking_id as string) || null;
    if (!bookingId) {
      return { received: true, handled: false, type, reason: "MISSING_BOOKING_ID" };
    }

    const paymentIntentId = this.getPaymentIntentId(session);
    const now = this.nowFn();

    await this.db.$transaction(async (tx: any) => {
      const booking = await tx.bookings.findUnique({ where: { id: bookingId } });
      if (!booking) return;

      const existing = await tx.payments.findFirst({
        where: { booking_id: bookingId, status: "approved" },
      });
      if (existing) return; // nunca degradar un pago exitoso

      // Idempotencia: la base impone unicidad por (provider, provider_reference). Un reintento del
      // mismo evento no debe insertar otra vez el cobro ni responder con error (Stripe reintentaría
      // sin fin).
      const providerReference = paymentIntentId || session.id;
      const alreadyRecorded = await tx.payments.findFirst({
        where: { booking_id: bookingId, provider_reference: providerReference },
      });
      if (alreadyRecorded) return;

      const meta = (booking.metadata as Record<string, any>) || {};
      await tx.payments.create({
        data: {
          booking_id: bookingId,
          amount: Number(booking.total_amount),
          currency: "COP",
          method: "card",
          status: "failed",
          provider: "stripe",
          provider_reference: providerReference,
          raw_response: this.summarizeSession(session),
        },
      });

      if (booking.status === "pending") {
        await tx.bookings.update({
          where: { id: bookingId },
          data: {
            status: "expired",
            updated_at: now,
            metadata: { ...meta, stripe_session_status: type },
          },
        });
      }
    });

    return { received: true, handled: true, type, confirmed: false, reason: "PAYMENT_FAILED" };
  }

  /**
   * Envía el correo de confirmación una única vez (idempotente).
   */
  private async deliverConfirmation(booking: any, ticketCode?: string): Promise<boolean> {
    if (!booking) return false;
    const meta = (booking.metadata as Record<string, any>) || {};
    if (meta.confirmation_email_sent === true) return false;

    const to = booking.users?.email;
    if (!to) return false;

    let code = ticketCode;
    if (!code) {
      const ticket = await this.db.tickets.findFirst({ where: { booking_id: booking.id } });
      code = ticket?.code;
    }
    if (!code) return false;

    await this.sendEmailFn({
      to,
      holderName: booking.users?.full_name || "Cliente",
      serviceName: booking.services?.name || "Reserva Vice City",
      startAt: new Date(booking.start_at),
      endAt: new Date(booking.end_at),
      quantity: booking.quantity,
      totalAmount: Number(booking.total_amount),
      ticketCode: code,
    });

    await this.db.bookings.update({
      where: { id: booking.id },
      data: { metadata: { ...meta, confirmation_email_sent: true } },
    });

    return true;
  }
}

export const stripeWebhookService = new StripeWebhookService();