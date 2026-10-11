/**
 * Módulo de Precios y Promociones (Features: Pricing)
 * Vice City - Soporte para FT-04 / HU22
 */

// Servicios
export {
  DiscountCalculatorService,
  discountCalculatorService,
} from "./services/discount-calculator.service";
export type { DiscountCalculatorDependencies } from "./services/discount-calculator.service";

// Tipos
export type {
  DiscountType,
  PricingCalculationParams,
  PricingCalculationResult,
} from "./types/discount.types";

// Esquemas Zod con .strict()
export { calculatePricingSchema } from "./schemas/pricing.schema";
export type { CalculatePricingInput } from "./schemas/pricing.schema";

// Errores de Dominio
export {
  PricingError,
  FullPoolDayRestrictedError,
} from "./errors/discount.errors";

