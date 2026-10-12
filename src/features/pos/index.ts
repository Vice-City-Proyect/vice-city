/**
 * FT-06 / HU25: Barrel Export para la Feature de POS de Empleados
 * Vice City - Features: POS
 */

// Servicios
export { PosSaleService, posSaleService } from "./services/pos-sale.service";
export type { PosSaleServiceDependencies } from "./services/pos-sale.service";

// Tipos
export type {
  PosPaymentMethod,
  CreatePosSaleParams,
  PosSaleResult,
} from "./types/pos.types";

// Esquemas Zod con .strict()
export { posSaleSchema } from "./schemas/pos-sale.schema";
export type { PosSaleInput } from "./schemas/pos-sale.schema";

// Errores de Dominio
export {
  PosError,
  ForbiddenPosAccessError,
  PosCapacityExceededError,
  PosMaintenanceDayError,
  PosServiceNotFoundError,
  PosOperatingHoursError,
  PosPastSlotError,
} from "./errors/pos.errors";
