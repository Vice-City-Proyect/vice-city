/**
 * FT-05 / HU23: Barrel Export para la Feature de Pagos y Pasarelas
 * Vice City - Features: Payments
 */

// Servicios
export {
  StripePaymentService,
  stripePaymentService,
} from "./services/stripe-payment.service";
export type { StripePaymentServiceDependencies } from "./services/stripe-payment.service";

export {
  StripeWebhookService,
  stripeWebhookService,
} from "./services/stripe-webhook.service";
export type { StripeWebhookServiceDependencies } from "./services/stripe-webhook.service";

// Tipos
export type {
  PaymentMethod,
  PaymentStatus,
  CreatePaymentIntentParams,
  CreatePaymentIntentResult,
  PaymentDetails,
} from "./types/payment.types";

export type {
  ProcessWebhookResult,
  TicketGenerationData,
} from "./types/webhook.types";

// Esquemas Zod con .strict()
export {
  createPaymentIntentSchema,
} from "./schemas/create-payment-intent.schema";
export type { CreatePaymentIntentInput } from "./schemas/create-payment-intent.schema";

// Errores de Dominio
export {
  PaymentError,
  HoldExpiredPaymentError,
  BookingAlreadyPaidError,
  BookingNotFoundError,
  BookingCancelledError,
  StripePaymentError,
} from "./errors/payment.errors";

export {
  StripeNotConfiguredError,
  InvalidStripeSignatureError,
  BookingNotPayableError,
  ForbiddenBookingAccessError,
} from "./errors/payments.errors";

export {
  InvalidWebhookSignatureError,
  WebhookBookingNotFoundError,
  WebhookProcessingError,
} from "./errors/webhook.errors";

