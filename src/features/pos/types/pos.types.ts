/**
 * FT-06 / HU25 & HU26: Tipos de Dominio para el Módulo POS de Empleado (RN-017, RN-019, RN-020)
 */

export type PosPaymentMethod = "cash" | "card";

export interface CreatePosSaleParams {
  sellerId: string;
  clientName: string;
  clientId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  quantity: number;
  paymentMethod: PosPaymentMethod;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
  idempotencyKey?: string;
  previewAvailableCapacity?: number;
}

export interface PosPreviewParams {
  sellerId: string;
  clientName: string;
  clientId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  quantity: number;
  paymentMethod: PosPaymentMethod;
  clientPhone?: string;
  notes?: string;
}

export interface PosPreviewResult {
  previewId: string;
  sellerId: string;
  sellerName: string;
  clientName: string;
  clientId: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  paymentMethod: PosPaymentMethod;
  availableCapacity: number;
  isStartedSlotPurchased: boolean;
  expiresAtEndOfSlot: string;
}

export interface PosSaleResult {
  bookingId: string;
  ticketId: string;
  ticketCode: string;
  paymentId: string;
  amount: number;
  currency: string;
  clientName: string;
  clientId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  quantity: number;
  paymentMethod: PosPaymentMethod;
  status: "confirmed";
  sellerId: string;
  isStartedSlotPurchased: boolean;
  isReused?: boolean;
  qrPayload: {
    ticketCode: string;
    bookingId: string;
    validFrom: string;
    validUntil: string;
  };
}
