/**
 * Cliente Stripe (test mode) con inicialización perezosa.
 * Vice City - Features: Payments
 *
 * La clave secreta se lee en tiempo de ejecución para no romper el arranque
 * cuando la pasarela aún no está configurada (por ejemplo en desarrollo o CI).
 */

import Stripe from "stripe";
import {
  getAppBaseUrl,
  getStripeSecretKey,
  getStripeWebhookSecret,
  STRIPE_CURRENCY,
  toStripeMinorUnits,
} from "../lib/stripe.config";

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(getStripeSecretKey());
  }
  return cachedClient;
}

/** Limpia el cliente cacheado (útil en pruebas). */
export function resetStripeClient(): void {
  cachedClient = null;
}

export interface CreateCheckoutSessionInput {
  bookingId: string;
  /** Monto total en pesos COP; se convierte a la unidad mínima de Stripe (× 100) al crear la sesión */
  amount: number;
  currency?: string;
  productName: string;
  productDescription?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Crea una Checkout Session de Stripe en modo pago único.
 * El monto SIEMPRE proviene del servidor (booking.total_amount), nunca del cliente.
 */
export async function createStripeCheckoutSession(
  input: CreateCheckoutSessionInput,
  client: Stripe = getStripeClient()
): Promise<Stripe.Checkout.Session> {
  const currency = (input.currency || STRIPE_CURRENCY).toLowerCase();

  return client.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toStripeMinorUnits(input.amount),
          product_data: {
            name: input.productName,
            description: input.productDescription,
          },
        },
      },
    ],
    customer_email: input.customerEmail,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      booking_id: input.bookingId,
      ...(input.metadata ?? {}),
    },
  });
}

/**
 * Construye un Event de Stripe verificando la firma con STRIPE_WEBHOOK_SECRET.
 * Lanza si la firma es inválida.
 */
export function constructStripeEvent(
  rawBody: string | Buffer,
  signature: string,
  client: Stripe = getStripeClient()
): Stripe.Event {
  return client.webhooks.constructEvent(
    rawBody,
    signature,
    getStripeWebhookSecret()
  );
}

/** Reembolsa un PaymentIntent (se usa cuando el HOLD de 10 min venció antes del pago). */
export async function refundPaymentIntent(
  paymentIntentId: string,
  client: Stripe = getStripeClient()
): Promise<Stripe.Refund> {
  return client.refunds.create({ payment_intent: paymentIntentId });
}

export { getAppBaseUrl };