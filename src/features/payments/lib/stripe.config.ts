/**
 * Configuración segura de la pasarela de pagos (Stripe test mode).
 * Vice City - Features: Payments
 *
 * NUNCA se expone la clave secreta al cliente. Solo `STRIPE_SECRET_KEY` y
 * `STRIPE_WEBHOOK_SECRET` se leen en el servidor.
 */

import { StripeNotConfiguredError } from "../errors/payments.errors";

export function getStripeSecretKey(env: NodeJS.ProcessEnv = process.env): string {
  const key = env.STRIPE_SECRET_KEY;
  if (!key || !key.trim()) {
    throw new StripeNotConfiguredError();
  }
  return key.trim();
}

export function getStripeWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !secret.trim()) {
    throw new StripeNotConfiguredError(
      "La pasarela de pagos no está configurada (falta STRIPE_WEBHOOK_SECRET). Configure el secreto del webhook de Stripe en el archivo .env."
    );
  }
  return secret.trim();
}

/**
 * URL base de la aplicación para construir success/cancel URLs.
 */
export function getAppBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

export const STRIPE_CURRENCY = "COP";