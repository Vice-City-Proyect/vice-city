/**
 * Tipos para el Motor de Precios y Descuentos (HU22 / RN-013, RN-014, RN-015)
 * Vice City - Features: Pricing
 */

export type DiscountType =
  | "WEDNESDAY_DISCOUNT"   // 20% de descuento los miércoles (RN-013)
  | "FULL_POOL_DISCOUNT"   // 20% de descuento en reserva completa de piscina (RN-014)
  | "NONE";                // Sin descuento aplicable

export interface PricingCalculationParams {
  /** UUID del servicio a calcular */
  serviceId: string;
  /** Fecha de la reserva en formato YYYY-MM-DD */
  date: string;
  /** Fecha y hora de inicio (ISO o Date) */
  startAt: string | Date;
  /** Fecha y hora de fin (ISO o Date) */
  endAt: string | Date;
  /** Cantidad de cupos / personas */
  quantity?: number;
  /** Indicador forzado de reserva completa de piscina */
  isFullPool?: boolean;
}

export interface PricingCalculationResult {
  /** Tarifa base total sin descuento */
  originalAmount: number;
  /** Porcentaje de descuento aplicado (0 o 20) */
  discountPercent: number;
  /** Monto en pesos deducido por descuento */
  discountAmount: number;
  /** Tarifa final a cobrar con descuento aplicado */
  finalAmount: number;
  /** Tipo de descuento seleccionado (RN-015: máximo uno) */
  appliedDiscount: DiscountType;
  /** Descripción legible del descuento aplicado */
  discountDescription: string | null;
  /** Moneda configurada (ej. COP) */
  currency: string;
  /** Duración total calculada en horas */
  durationHours: number;
  /** Precio unitario por hora del servicio */
  pricePerHour: number;
  /** Indica si la fecha corresponde a día miércoles */
  isWednesday: boolean;
  /** Indica si la reserva corresponde a piscina completa */
  isFullPool: boolean;
}

