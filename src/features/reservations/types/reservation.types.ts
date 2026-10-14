/**
 * Tipos para el Motor de Reservas y Retención (HOLD) (HU21 / RN-011)
 * Vice City - Features: Reservations
 */

export interface CreateHoldParams {
  /** UUID del usuario que realiza la reserva */
  userId: string;
  /** UUID del servicio que se desea reservar */
  serviceId: string;
  /** Fecha y hora de inicio de la reserva (formato ISO o Date) */
  startAt: string | Date;
  /** Fecha y hora de finalización de la reserva (formato ISO o Date) */
  endAt: string | Date;
  /** Cantidad de cupos / personas (por defecto 1) */
  quantity?: number;
  /** Notas u observaciones opcionales */
  notes?: string;
}

export interface HoldReservationResult {
  bookingId: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  quantity: number;
  /** Precio histórico congelado al momento del HOLD */
  totalAmount: number;
  currency: string;
  /** Estado de la reserva: siempre "pending" durante el hold */
  status: "pending";
  /** Fecha y hora exacta en que expira la retención (10 minutos) */
  expiresAt: string;
  /** Segundos restantes de la retención */
  remainingSeconds: number;
  metadata: Record<string, any>;
}

export interface BookingDetails {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  status: string;
  expiresAt: string | null;
  /** Indica si el hold ya expiró sin haber sido pagado */
  isHoldExpired: boolean;
  remainingSeconds: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

