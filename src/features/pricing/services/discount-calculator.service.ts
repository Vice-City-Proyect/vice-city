/**
 * Motor de Cálculo de Precios y Descuentos Oficiales (HU22 / RN-013, RN-014, RN-015)
 * Vice City - Features: Pricing
 *
 * Reglas de Negocio Oficiales:
 * - RN-013: 20% de descuento los Miércoles.
 * - RN-014: 20% de descuento en Reserva Completa de Piscina (50 cupos) con anticipación.
 *           Prohibido en: Viernes, Sábados, Domingos y Lunes Festivos.
 * - RN-015: Descuentos NO acumulables (máximo un solo 20%, nunca 40%).
 */

import { prisma } from "@/lib/prisma";
import type {
  PricingCalculationParams,
  PricingCalculationResult,
  DiscountType,
} from "../types/discount.types";
import { FullPoolDayRestrictedError } from "../errors/discount.errors";
import { ServiceNotFoundError } from "@/features/services";
import { getDayOfWeekBogota } from "@/features/services/utils/date-bogota.util";
import { isColombianHoliday } from "@/features/services/utils/colombian-holidays.util";

export interface DiscountCalculatorDependencies {
  findServiceByIdFn?: (serviceId: string) => Promise<any | null>;
}

export class DiscountCalculatorService {
  private findServiceByIdFn?: (serviceId: string) => Promise<any | null>;

  constructor(dependencies: DiscountCalculatorDependencies = {}) {
    this.findServiceByIdFn = dependencies.findServiceByIdFn;
  }

  /**
   * Calcula el precio de una reserva aplicando automáticamente los descuentos del SRS (HU22).
   *
   * @param params Parámetros de la reserva
   * @returns PricingCalculationResult con tarifa base, porcentaje, descuento y total final
   */
  async calculatePricing(
    params: PricingCalculationParams
  ): Promise<PricingCalculationResult> {
    const startDate = new Date(params.startAt);
    const endDate = new Date(params.endAt);
    const quantity = params.quantity && params.quantity > 0 ? params.quantity : 1;

    // 1. Consultar servicio vía ORM
    let service: any;
    if (this.findServiceByIdFn) {
      service = await this.findServiceByIdFn(params.serviceId);
    } else {
      service = await prisma.services.findFirst({
        where: { id: params.serviceId, is_active: true },
      });
    }

    if (!service) {
      throw new ServiceNotFoundError();
    }

    // 2. Calcular duración en horas
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = Math.max(1, durationMs / (1000 * 60 * 60));

    const pricePerHour = Number(service.price);
    const originalAmount = pricePerHour * quantity * durationHours;

    // 3. Evaluar si es reserva completa de piscina (RN-014)
    const isFullPoolBySlug =
      service.slug?.toLowerCase().includes("full-pool") ||
      service.slug?.toLowerCase().includes("completa");
    const isFullPoolByCapacity =
      (service.capacity === 50 || service.capacity >= 50) &&
      quantity >= 50 &&
      durationHours >= 9;

    const isFullPool = Boolean(params.isFullPool || isFullPoolBySlug || isFullPoolByCapacity);

    const dayOfWeek = getDayOfWeekBogota(params.date); // 0=Dom, 1=Lun, ..., 3=Mié, ..., 5=Vie, 6=Sáb
    const isWednesday = dayOfWeek === 3;

    // 4. Criterio 3: Prohibir reservas completas de piscina en días restringidos (RN-014)
    if (isFullPool) {
      const isFriday = dayOfWeek === 5;
      const isSaturday = dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      const isMondayHoliday = dayOfWeek === 1 && isColombianHoliday(params.date);

      if (isFriday || isSaturday || isSunday || isMondayHoliday) {
        throw new FullPoolDayRestrictedError(
          `Las reservas completas de piscina están prohibidas en ${
            isFriday
              ? "viernes"
              : isSaturday
              ? "sábados"
              : isSunday
              ? "domingos"
              : "lunes festivos"
          } (RN-014).`
        );
      }
    }

    // 5. Criterios 1, 2 y 4: Evaluación de descuentos y regla de NO acumulación (RN-015)
    let discountPercent = 0;
    let appliedDiscount: DiscountType = "NONE";
    let discountDescription: string | null = null;

    const qualifiesForWednesday = isWednesday;
    const qualifiesForFullPool = isFullPool;

    // Caso Límite (Criterio 4 / RN-015):
    // Si cumple ambos (Miércoles Y Piscina Completa), se aplica un ÚNICO 20% (nunca 40%).
    if (qualifiesForWednesday && qualifiesForFullPool) {
      discountPercent = 20;
      appliedDiscount = "WEDNESDAY_DISCOUNT";
      discountDescription =
        "20% de descuento aplicado (Promoción de Miércoles / Piscina Completa - No acumulable según RN-015).";
    } else if (qualifiesForWednesday) {
      // Criterio 1 (RN-013)
      discountPercent = 20;
      appliedDiscount = "WEDNESDAY_DISCOUNT";
      discountDescription =
        "20% de descuento por Miércoles de Promoción (RN-013).";
    } else if (qualifiesForFullPool) {
      // Criterio 2 (RN-014)
      discountPercent = 20;
      appliedDiscount = "FULL_POOL_DISCOUNT";
      discountDescription =
        "20% de descuento por Reserva Completa de Piscina (Piscina Completa - RN-014).";
    }

    const discountAmount = Math.round((originalAmount * discountPercent) / 100);
    const finalAmount = originalAmount - discountAmount;

    return {
      originalAmount,
      discountPercent,
      discountAmount,
      finalAmount,
      appliedDiscount,
      discountDescription,
      currency: service.currency || "COP",
      durationHours,
      pricePerHour,
      isWednesday,
      isFullPool,
    };
  }
}

// Instancia singleton por defecto
export const discountCalculatorService = new DiscountCalculatorService();

