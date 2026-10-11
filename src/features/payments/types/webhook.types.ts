/**
 * FT-05 / HU24: Tipos para Procesamiento de Webhook de Stripe
 */

export interface ProcessWebhookResult {
  processed: boolean;
  eventType: string;
  paymentIntentId: string;
  bookingId: string | null;
  ticketId?: string;
  ticketCode?: string;
  isAlreadyProcessed: boolean;
  overdueHoldRescued?: boolean;
}

export interface TicketGenerationData {
  bookingId: string;
  holderName?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  metadata?: Record<string, any>;
}
