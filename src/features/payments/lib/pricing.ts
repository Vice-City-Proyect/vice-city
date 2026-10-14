/**
 * Motor de precios del lado del servidor para reservas web y pagos con Stripe.
 * Vice City - Features: Payments
 *
 * Reglas de negocio aplicadas (SRS / business-rules):
 * - Tarifa unitaria del servicio × cantidad × horas (PER_PERSON_HOUR) o
 *   tarifa × horas (EXCLUSIVE_RESERVATION).
 * - Descuento de miércoles (20%) o de piscina completa (20%): NUNCA se acumulan.
 * - Duración mínima 1 hora, máxima 9 horas.
 * - El monto se congeló al crear la reserva (RN-007): el backend es la única autoridad.
 *
 * Este módulo es puro (sin E/S) para permitir pruebas unitarias deterministas.
 */

import {
  MAX_DURATION_HOURS,
  MIN_DURATION_HOURS,
  WEDNESDAY_DISCOUNT,
  FULL_POOL_DISCOUNT,
  isWednesday,
} from "@/lib/schedule";

export type PricingModality = "PER_PERSON_HOUR" | "EXCLUSIVE_RESERVATION";

export interface PricingInput {
  /** Precio unitario (COP) del servicio al momento de la reserva */
  unitPrice: number;
  /** Modalidad de cobro del servicio */
  modality: PricingModality;
  /** Cantidad de personas (PER_PERSON_HOUR) o 1 (EXCLUSIVE_RESERVATION) */
  quantity: number;
  /** Inicio de la franja */
  startAt: Date;
  /** Fin de la franja */
  endAt: Date;
  /** Aforo total del servicio (para detectar reserva de piscina completa) */
  capacity: number;
}

export interface PricingResult {
  /** Horas facturadas (enteras) */
  durationHours: number;
  /** Subtotal sin descuento */
  baseAmount: number;
  /** Porcentaje de descuento aplicado (0, 20) */
  discountPercent: number;
  /** Monto descontado */
  discountAmount: number;
  /** Total a pagar redondeado a pesos COP sin decimales */
  totalAmount: number;
  /** Indica si aplicó descuento de miércoles */
  wednesdayDiscount: boolean;
  /** Indica si aplicó descuento de piscina completa */
  fullPoolDiscount: boolean;
  /** true si la reserva ocupa la capacidad total (aforo completo) */
  fullPool: boolean;
}

export class InvalidPricingError extends Error {
  readonly code = "INVALID_PRICING";
  constructor(message: string) {
    super(message);
    this.name = "InvalidPricingError";
  }
}

/**
 * Calcula la duración en horas de una franja horaria.
 * Se requieren horas enteras de 1 a 9 según el SRS.
 */
export function computeDurationHours(startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime();
  if (!(ms > 0)) {
    throw new InvalidPricingError(
      "La franja horaria es inválida: el fin debe ser posterior al inicio"
    );
  }

  const hours = ms / 3600000;

  if (!Number.isInteger(hours)) {
    throw new InvalidPricingError(
      "La duración de la reserva debe ser en horas enteras"
    );
  }

  if (hours < MIN_DURATION_HOURS || hours > MAX_DURATION_HOURS) {
    throw new InvalidPricingError(
      `La duración de la reserva debe ser entre ${MIN_DURATION_HOURS} y ${MAX_DURATION_HOURS} horas`
    );
  }

  return hours;
}

/**
 * Determina si la reserva corresponde a "piscina completa" (aforo total).
 */
export function isFullPool(quantity: number, capacity: number): boolean {
  return quantity > 0 && capacity > 0 && quantity >= capacity;
}

/**
 * Calcula el total de la reserva aplicando los descuentos del SRS.
 * Los descuentos NO se acumulan (miércoles o piscina completa, ambos 20%).
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const {
    unitPrice,
    modality,
    quantity: rawQuantity,
    startAt,
    endAt,
    capacity,
  } = input;

  if (!(unitPrice >= 0) || typeof unitPrice !== "number" || isNaN(unitPrice)) {
    throw new InvalidPricingError("La tarifa del servicio no es válida");
  }

  const quantity = modality === "PER_PERSON_HOUR" ? Math.max(1, Math.floor(rawQuantity)) : 1;
  const durationHours = computeDurationHours(startAt, endAt);

  const baseUnit = modality === "PER_PERSON_HOUR" ? unitPrice * quantity : unitPrice;
  const baseAmount = baseUnit * durationHours;

  const fullPool = isFullPool(quantity, capacity);
  const wednesdayDiscount = isWednesdayOf(startAt);
  // Descuentos no acumulables: prevalece el de miércoles, si aplica.
  const discountPercent = wednesdayDiscount
    ? WEDNESDAY_DISCOUNT
    : fullPool
    ? FULL_POOL_DISCOUNT
    : 0;

  const discountAmount = Math.round((baseAmount * discountPercent) / 100);
  const totalAmount = Math.round(baseAmount - discountAmount);

  return {
    durationHours,
    baseAmount: Math.round(baseAmount),
    discountPercent,
    discountAmount,
    totalAmount,
    wednesdayDiscount,
    fullPoolDiscount: !wednesdayDiscount && fullPool,
    fullPool,
  };
}

/**
 * Determina si la fecha de la reserva cae en miércoles (zona America/Bogota).
 */
function isWednesdayOf(date: Date): boolean {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return isWednesday(`${y}-${m}-${d}`);
}