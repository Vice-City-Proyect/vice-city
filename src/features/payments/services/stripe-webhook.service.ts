/**
 * FT-05 / HU24: Servicio de Webhook de Stripe y Confirmación de Tickets
 * Vice City - Features: Payments
 *
 * Cumple con las Reglas de Negocio Oficiales:
 * - RN-016: Confirmar la reserva únicamente cuando el webhook oficial de Stripe certifica el pago.
 * - RN-018: Sin reembolsos ni cancelaciones de dinero para clientes en el MVP.
 * - RN-019: Generar ticket digital con código seguro para validación de acceso QR.
 * - Idempotencia: Si el evento se recibe múltiples veces, no duplica tickets ni registros.
 * - Manejo de HOLD vencido: Si el pago se confirma tras expirar el HOLD de 10 min, se rescata controladamente.
 */

import Stripe from "stripe";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ProcessWebhookResult } from "../types/webhook.types";
import {
  InvalidWebhookSignatureError,
  WebhookBookingNotFoundError,
  WebhookProcessingError,
} from "../errors/webhook.errors";

export interface StripeWebhookServiceDependencies {
  findBookingFn?: (bookingId: string) => Promise<any | null>;
  findPaymentByProviderRefFn?: (ref: string) => Promise<any | null>;
  updateBookingFn?: (bookingId: string, data: any) => Promise<any>;
  updatePaymentFn?: (paymentId: string, data: any) => Promise<any>;
  createPaymentFn?: (data: any) => Promise<any>;
  createTicketFn?: (data: any) => Promise<any>;
  transactionFn?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  constructEventFn?: (rawBody: string, signature: string, secret: string) => any;
}

export class StripeWebhookService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly deps?: StripeWebhookServiceDependencies;

  constructor(dependencies?: StripeWebhookServiceDependencies) {
    this.deps = dependencies;
    const apiKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_vice_city";
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder_secret_vice_city";

    this.stripe = new Stripe(apiKey, {
      typescript: true,
    });
  }

  /**
   * Valida la firma criptográfica enviada por Stripe en el header 'stripe-signature'
   */
  verifyWebhookSignature(rawBody: string, signature: string): Stripe.Event {
    if (!signature || !rawBody) {
      throw new InvalidWebhookSignatureError("Firma del webhook ausente o cuerpo vacío.");
    }

    if (this.deps?.constructEventFn) {
      try {
        return this.deps.constructEventFn(rawBody, signature, this.webhookSecret);
      } catch (err: any) {
        throw new InvalidWebhookSignatureError(
          `Firma de Stripe inválida: ${err.message || "Firma no verificada"}`
        );
      }
    }

    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );
    } catch (err: any) {
      throw new InvalidWebhookSignatureError(
        `Firma de Stripe inválida: ${err.message || "Firma no verificada"}`
      );
    }
  }

  /**
   * Procesa el evento oficial recibido desde Stripe
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<ProcessWebhookResult> {
    // Solo procesamos 'payment_intent.succeeded' para confirmar reservas
    if (event.type !== "payment_intent.succeeded") {
      // RN-018: Si es un evento de reembolso (ej: charge.refunded), no se cancela ni altera el ticket en MVP
      return {
        processed: false,
        eventType: event.type,
        paymentIntentId: (event.data?.object as any)?.id || "",
        bookingId: null,
        isAlreadyProcessed: false,
      };
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const paymentIntentId = paymentIntent.id;

    // Obtener bookingId desde los metadatos del paymentIntent
    let bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      // Buscar en payments si el intent fue registrado previamente
      let existingPayment: any = null;
      if (this.deps?.findPaymentByProviderRefFn) {
        existingPayment = await this.deps.findPaymentByProviderRefFn(paymentIntentId);
      } else {
        existingPayment = await prisma.payments.findFirst({
          where: { provider_reference: paymentIntentId },
        });
      }

      if (existingPayment) {
        bookingId = existingPayment.booking_id;
      }
    }

    if (!bookingId) {
      throw new WebhookBookingNotFoundError(
        `No fue posible vincular el PaymentIntent '${paymentIntentId}' a ninguna reserva existente.`
      );
    }

    // Ejecución transaccional para atomicidad e idempotencia
    const executeLogic = async (tx: any) => {
      // 1. Consultar la reserva
      let booking: any = null;
      if (this.deps?.findBookingFn) {
        booking = await this.deps.findBookingFn(bookingId);
      } else {
        booking = await tx.bookings.findUnique({
          where: { id: bookingId },
          include: {
            tickets: true,
            payments: true,
            users: true,
          },
        });
      }

      if (!booking) {
        throw new WebhookBookingNotFoundError(`La reserva con id '${bookingId}' no existe.`);
      }

      // 2. Criterio 3 (Idempotencia): El mismo evento recibido dos veces no duplica el ticket
      if (
        (booking.status === "confirmed" || booking.status === "paid") &&
        booking.tickets &&
        booking.tickets.length > 0
      ) {
        const existingTicket = booking.tickets[0];
        return {
          processed: true,
          eventType: event.type,
          paymentIntentId,
          bookingId: booking.id,
          ticketId: existingTicket.id,
          ticketCode: existingTicket.code,
          isAlreadyProcessed: true,
          overdueHoldRescued: false,
        };
      }

      // 3. Criterio 4 (Caso Límite): Pago confirmado después de vencido el HOLD (10 minutos)
      let overdueHoldRescued = false;
      const now = new Date();
      if (booking.expires_at && new Date(booking.expires_at) <= now) {
        overdueHoldRescued = true;
      }

      // 4. Actualizar estado de la reserva a CONFIRMED
      const bookingMetadata = {
        ...(typeof booking.metadata === "object" ? booking.metadata : {}),
        payment_intent_id: paymentIntentId,
        confirmed_at: now.toISOString(),
        ...(overdueHoldRescued ? { overdue_hold_rescued: true } : {}),
      };

      if (this.deps?.updateBookingFn) {
        await this.deps.updateBookingFn(booking.id, {
          status: "confirmed",
          metadata: bookingMetadata,
        });
      } else {
        await tx.bookings.update({
          where: { id: booking.id },
          data: {
            status: "confirmed",
            metadata: bookingMetadata,
          },
        });
      }

      // 5. Actualizar o crear registro en 'payments'
      const existingPayment = booking.payments?.find(
        (p: any) => p.provider_reference === paymentIntentId || p.status === "pending"
      );

      const paymentUpdateData = {
        status: "paid",
        paid_at: now,
        provider: "stripe",
        provider_reference: paymentIntentId,
        raw_response: {
          event_id: event.id,
          type: event.type,
          amount_received: paymentIntent.amount_received || paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
      };

      if (existingPayment) {
        if (this.deps?.updatePaymentFn) {
          await this.deps.updatePaymentFn(existingPayment.id, paymentUpdateData);
        } else {
          await tx.payments.update({
            where: { id: existingPayment.id },
            data: paymentUpdateData,
          });
        }
      } else {
        const newPaymentData = {
          booking_id: booking.id,
          amount: booking.total_amount,
          currency: (paymentIntent.currency || "COP").toUpperCase(),
          method: "card",
          ...paymentUpdateData,
        };

        if (this.deps?.createPaymentFn) {
          await this.deps.createPaymentFn(newPaymentData);
        } else {
          await tx.payments.create({
            data: newPaymentData,
          });
        }
      }

      // 6. Criterio 1: Generar Ticket con identificador seguro para el QR (RN-019)
      const secureCode = crypto.randomUUID().replace(/-/g, "").toUpperCase();

      const ticketData = {
        booking_id: booking.id,
        code: secureCode,
        holder_name: booking.users?.name || "Titular Vice City",
        status: "valid",
        valid_from: booking.start_at,
        valid_until: booking.end_at,
        metadata: {
          qr_payload: {
            ticketCode: secureCode,
            bookingId: booking.id,
            validFrom: booking.start_at ? new Date(booking.start_at).toISOString() : null,
            validUntil: booking.end_at ? new Date(booking.end_at).toISOString() : null,
          },
          payment_intent_id: paymentIntentId,
          issued_at: now.toISOString(),
        },
      };

      let createdTicket: any;
      if (this.deps?.createTicketFn) {
        createdTicket = await this.deps.createTicketFn(ticketData);
      } else {
        createdTicket = await tx.tickets.create({
          data: ticketData,
        });
      }

      return {
        processed: true,
        eventType: event.type,
        paymentIntentId,
        bookingId: booking.id,
        ticketId: createdTicket.id,
        ticketCode: createdTicket.code,
        isAlreadyProcessed: false,
        overdueHoldRescued,
      };
    };

    if (this.deps?.transactionFn) {
      return this.deps.transactionFn(executeLogic);
    } else {
      return prisma.$transaction(executeLogic);
    }
  }
}

export const stripeWebhookService = new StripeWebhookService();
