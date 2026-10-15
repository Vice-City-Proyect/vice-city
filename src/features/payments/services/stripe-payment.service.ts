/**
 * FT-05 / HU23: Servicio de Pago y Checkout con Stripe (Modo Test)
 * Vice City - Features: Payments
 *
 * Cumple con las Reglas de Negocio Oficiales:
 * - RN-016: Checkout con tarjeta de crédito o débito mediante Stripe (modo test).
 * - Monto correcto: Usa el precio congelado de la reserva (con descuentos de HU22 ya calculados).
 * - Caso de error: Pagar con HOLD vencido (>10 min) es rechazado inmediatamente.
 * - Caso límite: Doble clic o reintento de pago no genera dos cobros (idempotencia y reutilización de PaymentIntent).
 * - Desacoplamiento: El frontend NO marca la reserva como pagada; solo inicia el intent.
 */

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeSecretKey } from "../lib/stripe.config";
import type {
  CreatePaymentIntentParams,
  CreatePaymentIntentResult,
} from "../types/payment.types";
import {
  HoldExpiredPaymentError,
  BookingAlreadyPaidError,
  BookingNotFoundError,
  BookingCancelledError,
  StripePaymentError,
} from "../errors/payment.errors";
import { ForbiddenBookingAccessError } from "../errors/payments.errors";
import { toStripeMinorUnits } from "../lib/stripe.config";

export interface PaymentRequester {
  id: string;
  role: string;
}

export interface StripePaymentServiceDependencies {
  findBookingByIdFn?: (id: string) => Promise<any | null>;
  createPaymentFn?: (data: any) => Promise<any>;
  stripeClient?: {
    paymentIntents: {
      create: (params: any, options?: any) => Promise<any>;
      retrieve: (id: string) => Promise<any>;
    };
  };
}

export class StripePaymentService {
  private stripe?: {
    paymentIntents: {
      create: (params: any, options?: any) => Promise<any>;
      retrieve: (id: string) => Promise<any>;
    };
  };
  private readonly deps?: StripePaymentServiceDependencies;

  constructor(dependencies?: StripePaymentServiceDependencies) {
    this.deps = dependencies;

    if (dependencies?.stripeClient) {
      this.stripe = dependencies.stripeClient;
    }
  }

  private getStripe(): {
    paymentIntents: {
      create: (params: any, options?: any) => Promise<any>;
      retrieve: (id: string) => Promise<any>;
    };
  } {
    if (!this.stripe) {
      this.stripe = new Stripe(getStripeSecretKey(), {
        typescript: true,
      });
    }
    return this.stripe;
  }

  /**
   * Crea o reutiliza un PaymentIntent de Stripe para una reserva en estado HOLD (pending)
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams,
    requester?: PaymentRequester
  ): Promise<CreatePaymentIntentResult> {
    const { bookingId } = params;

    // 1. Obtener la reserva
    let booking: any = null;
    if (this.deps?.findBookingByIdFn) {
      booking = await this.deps.findBookingByIdFn(bookingId);
    } else {
      booking = await prisma.bookings.findUnique({
        where: { id: bookingId },
        include: {
          services: true,
          payments: {
            orderBy: { created_at: "desc" },
          },
        },
      });
    }

    if (!booking) {
      throw new BookingNotFoundError(`La reserva con id '${bookingId}' no existe.`);
    }

    // 1.1 Autorización a nivel de recurso: dueño de la reserva o ADMIN.
    if (requester) {
      const isAdmin = requester.role?.toUpperCase() === "ADMIN";
      if (!isAdmin && booking.user_id !== requester.id) {
        throw new ForbiddenBookingAccessError();
      }
    }

    // 2. Validar que la reserva no esté cancelada ni ya pagada
    if (booking.status === "confirmed" || booking.status === "paid") {
      throw new BookingAlreadyPaidError(
        "Esta reserva ya se encuentra confirmada y pagada."
      );
    }

    if (booking.status === "cancelled") {
      throw new BookingCancelledError(
        "La reserva se encuentra cancelada y no puede ser procesada para pago."
      );
    }

    // 3. Caso de error: Validar que el HOLD de 10 minutos no haya expirado (RN-011 / RN-016)
    const now = new Date();
    if (booking.expires_at && new Date(booking.expires_at) <= now) {
      throw new HoldExpiredPaymentError(
        "La reserva ha expirado y el cupo retenido (HOLD) de 10 minutos fue liberado. Debe generar una nueva reserva."
      );
    }

    // 4. Caso Límite: Doble clic o reintento de pago (Idempotencia)
    // Si ya existe un registro de pago en estado 'pending' con un provider_reference activo,
    // reutilizamos el PaymentIntent existente para NO generar dos cobros ni duplicar registros.
    const existingPendingPayment = booking.payments?.find(
      (p: any) => p.status === "pending" && p.provider === "stripe" && p.provider_reference
    );

    if (existingPendingPayment) {
      try {
        const existingIntent = await this.getStripe().paymentIntents.retrieve(
          existingPendingPayment.provider_reference
        );

        // Si el PaymentIntent sigue pendiente de cobro, devolver el clientSecret existente
        if (
          existingIntent &&
          existingIntent.status !== "canceled" &&
          existingIntent.status !== "succeeded"
        ) {
          return {
            paymentId: existingPendingPayment.id,
            bookingId: booking.id,
            clientSecret: existingIntent.client_secret,
            amount: Number(booking.total_amount),
            currency: booking.services?.currency || "COP",
            provider: "stripe",
            providerReference: existingIntent.id,
            isReused: true,
            bookingStatus: booking.status,
            expiresAt: booking.expires_at ? new Date(booking.expires_at).toISOString() : null,
          };
        }
      } catch {
        // Si falló la consulta del intent anterior, procedemos a crear uno nuevo
      }
    }

    // 5. Criterio 1: Crear el pago con el monto exacto de la reserva (descuentos incluidos)
    const totalAmount = Number(booking.total_amount);
    const currency = (booking.services?.currency || "COP").toLowerCase();

    // En Stripe, el monto se envía en la unidad mínima (centavos para monedas de 2 decimales como COP / USD)
    const amountInCents = toStripeMinorUnits(totalAmount);

    let paymentIntent: any;
    try {
      paymentIntent = await this.getStripe().paymentIntents.create(
        {
          amount: amountInCents,
          currency,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            bookingId: booking.id,
            serviceId: booking.service_id,
            quantity: String(booking.quantity),
            serviceName: booking.services?.name || "Servicio Deportivo",
            expiresAt: booking.expires_at ? new Date(booking.expires_at).toISOString() : "",
          },
          description: `Pago reserva Vice City - ${booking.services?.name || "Servicio"} (Reserva #${booking.id.slice(0, 8)})`,
        },
        {
          idempotencyKey: `booking-hold-intent-${booking.id}`,
        }
      );
    } catch (err: any) {
      throw new StripePaymentError(
        `Error al crear el intento de pago con Stripe: ${err.message || "Error desconocido"}`
      );
    }

    // 6. Guardar el registro en la tabla 'payments' en estado 'pending'
    let paymentRecord: any;
    const paymentData = {
      booking_id: booking.id,
      amount: booking.total_amount,
      currency: (booking.services?.currency || "COP").toUpperCase(),
      method: "card",
      status: "pending",
      provider: "stripe",
      provider_reference: paymentIntent.id,
      raw_response: {
        payment_intent_id: paymentIntent.id,
        created: paymentIntent.created,
        status: paymentIntent.status,
      },
    };

    if (this.deps?.createPaymentFn) {
      paymentRecord = await this.deps.createPaymentFn(paymentData);
    } else {
      paymentRecord = await prisma.payments.create({
        data: paymentData,
      });
    }

    return {
      paymentId: paymentRecord.id,
      bookingId: booking.id,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: (booking.services?.currency || "COP").toUpperCase(),
      provider: "stripe",
      providerReference: paymentIntent.id,
      isReused: false,
      bookingStatus: booking.status,
      expiresAt: booking.expires_at ? new Date(booking.expires_at).toISOString() : null,
    };
  }
}

export const stripePaymentService = new StripePaymentService();

