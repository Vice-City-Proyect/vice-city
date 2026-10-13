/**
 * FT-05 / HU23: Tipos de Dominio para Pasarela de Pagos (Stripe Test)
 */

export type PaymentMethod = "card";

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export interface CreatePaymentIntentParams {
  bookingId: string;
}

export interface CreatePaymentIntentResult {
  paymentId: string;
  bookingId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  provider: "stripe";
  providerReference: string;
  isReused: boolean;
  bookingStatus: string;
  expiresAt: string | null;
}

export interface PaymentDetails {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  provider: string | null;
  providerReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

