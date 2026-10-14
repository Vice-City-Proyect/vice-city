/**
 * Servicio de Checkout con Stripe (test mode).
 * Vice City - Features: Payments
 *
 * Responsabilidades:
 * - Validar que la reserva pertenece al usuario y está en estado pagable (HOLD vigente).
 * - Crear la Checkout Session con el monto calculado en el servidor.
 * - Persistir la referencia de la sesión en la reserva.
 */

import type { PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  createStripeCheckoutSession,
  getAppBaseUrl,
} from "./stripe.client";
import {
  BookingNotFoundError,
  BookingNotPayableError,
  ForbiddenBookingAccessError,
} from "../errors/payments.errors";

export interface CheckoutSessionUser {
  id: string;
  role: string;
}

export interface CheckoutDeps {
  db?: PrismaClient;
  stripe?: Stripe;
  nowFn?: () => Date;
  appBaseUrlFn?: () => string;
}

export interface CheckoutResult {
  bookingId: string;
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
}

export class CheckoutService {
  private db: PrismaClient;
  private stripe?: Stripe;
  private nowFn: () => Date;
  private appBaseUrlFn: () => string;

  constructor(deps: CheckoutDeps = {}) {
    this.db = deps.db ?? defaultPrisma;
    this.stripe = deps.stripe;
    this.nowFn = deps.nowFn ?? (() => new Date());
    this.appBaseUrlFn = deps.appBaseUrlFn ?? getAppBaseUrl;
  }

  async createCheckoutSession(
    bookingId: string,
    user: CheckoutSessionUser
  ): Promise<CheckoutResult> {
    if (!bookingId?.trim()) {
      throw new BookingNotFoundError("El identificador de la reserva es obligatorio");
    }

    const booking = await this.db.bookings.findUnique({
      where: { id: bookingId },
      include: { services: true, users: true },
    });

    if (!booking) {
      throw new BookingNotFoundError();
    }

    // Autorización a nivel de recurso: dueño de la reserva o ADMIN.
    const isAdmin = user.role?.toUpperCase() === "ADMIN";
    if (!isAdmin && booking.user_id !== user.id) {
      throw new ForbiddenBookingAccessError();
    }

    if (booking.status !== "pending") {
      throw new BookingNotPayableError(
        "La reserva ya no está pendiente de pago"
      );
    }

    if (booking.expires_at && new Date(booking.expires_at).getTime() <= this.nowFn().getTime()) {
      throw new BookingNotPayableError(
        "El HOLD de 10 minutos de la reserva ya venció. Crea una nueva reserva."
      );
    }

    const amount = Math.round(Number(booking.total_amount));
    if (!(amount > 0)) {
      throw new BookingNotPayableError("El monto de la reserva no es válido");
    }

    const baseUrl = this.appBaseUrlFn();
    const bookingMetadata = (booking.metadata as Record<string, any>) || {};

    const session = await createStripeCheckoutSession(
      {
        bookingId: booking.id,
        amount,
        currency: "COP",
        productName: booking.services?.name || "Reserva Vice City",
        productDescription: `Reserva del ${new Date(booking.start_at).toISOString()} — ${booking.quantity} persona(s)`,
        customerEmail: booking.users?.email,
        successUrl: `${baseUrl}/cliente/reservas?checkout=success&bookingId=${booking.id}`,
        cancelUrl: `${baseUrl}/cliente/reservas?checkout=cancelled&bookingId=${booking.id}`,
        metadata: { user_id: booking.user_id },
      },
      this.stripe
    );

    if (!session.url) {
      throw new BookingNotPayableError("Stripe no devolvió una URL de checkout");
    }

    await this.db.bookings.update({
      where: { id: booking.id },
      data: {
        metadata: {
          ...bookingMetadata,
          stripe_session_id: session.id,
          stripe_session_status: "open",
          stripe_amount: amount,
          stripe_created_at: this.nowFn().toISOString(),
        } as any,
        updated_at: this.nowFn(),
      },
    });

    return {
      bookingId: booking.id,
      sessionId: session.id,
      checkoutUrl: session.url,
      amount,
      currency: "COP",
    };
  }
}

export const checkoutService = new CheckoutService();