/**
 * FT-06 / HU25: Tipos de Dominio para el Módulo POS de Empleado (RN-017)
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
  qrPayload: {
    ticketCode: string;
    bookingId: string;
    validFrom: string;
    validUntil: string;
  };
}
