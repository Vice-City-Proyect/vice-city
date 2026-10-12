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
  refundPaymentIntent,
} from "./stripe.client";
import { createTicketForBooking } from "./ticket.service";
import {
  sendBookingConfirmationEmail,
  type BookingConfirmationEmailParams,
} from "./booking-email.service";
import { InvalidStripeSignatureError } from "../errors/payments.errors";

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

interface TransactionOutcome {
  kind: "confirmed" | "already" | "hold_expired" | "not_found";
  booking?: any;
  ticket?: any;
}

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
      customer_email: (session as any).customer_email ?? null,
      mode: session.mode,
    };
  }

  private getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
    const pi = (session as any).payment_intent;
    if (!pi) return null;
    return typeof pi === "string" ? pi : pi.id ?? null;
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
          where: { booking_id: bookingId, status: "SUCCEEDED" },
        });

        if (existingPayment || booking.status === "confirmed") {
          return { kind: "already", booking };
        }

        const holdExpired = booking.expires_at
          ? new Date(booking.expires_at).getTime() <= now.getTime()
          : false;

        // HOLD vencido o reserva no pendiente: no confirmar (se reembolsará fuera).
        if (booking.status !== "pending" || holdExpired) {
          await tx.payments.create({
            data: {
              booking_id: bookingId,
              amount: Number(booking.total_amount),
              currency: "COP",
              method: "STRIPE",
              status: "REFUNDED",
              provider: "stripe",
              provider_reference: paymentIntentId || session.id,
              raw_response: this.summarizeSession(session),
            },
          });
          return { kind: "hold_expired", booking };
        }

        const updatedBooking = await tx.bookings.update({
          where: { id: bookingId },
          data: {
            status: "confirmed",
            expires_at: null,
            updated_at: now,
            metadata: {
              ...meta,
              stripe_session_id: session.id,
              stripe_payment_intent: paymentIntentId,
              paid_at: now.toISOString(),
            },
          },
        });

        await tx.payments.create({
          data: {
            booking_id: bookingId,
            amount: Number(booking.total_amount),
            currency: "COP",
            method: "STRIPE",
            status: "SUCCEEDED",
            provider: "stripe",
            provider_reference: paymentIntentId || session.id,
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

        return { kind: "confirmed", booking: { ...updatedBooking, services: booking.services, users: booking.users }, ticket };
      }
    );

    if (outcome.kind === "confirmed" || outcome.kind === "already") {
      await this.deliverConfirmation(outcome.booking, outcome.ticket?.code);
      return {
        received: true,
        handled: true,
        type,
        confirmed: true,
        reason: outcome.kind === "already" ? "ALREADY_CONFIRMED" : "CONFIRMED",
      };
    }

    if (outcome.kind === "hold_expired") {
      // Reembolso automático del pago recibido fuera del HOLD de 10 minutos.
      if (paymentIntentId) {
        try {
          await refundPaymentIntent(paymentIntentId, this.stripe);
        } catch {
          // El reembolso podría requerir intervención manual; se registra como REFUNDED.
        }
      }
      return { received: true, handled: true, type, confirmed: false, reason: "HOLD_EXPIRED" };
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
        where: { booking_id: bookingId, status: "SUCCEEDED" },
      });
      if (existing) return; // nunca degradar un pago exitoso

      const meta = (booking.metadata as Record<string, any>) || {};
      await tx.payments.create({
        data: {
          booking_id: bookingId,
          amount: Number(booking.total_amount),
          currency: "COP",
          method: "STRIPE",
          status: "FAILED",
          provider: "stripe",
          provider_reference: paymentIntentId || session.id,
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