/**
 * FT-06 / HU25 & HU26: Barrel Export para la Feature de POS de Empleados
 * Vice City - Features: POS
 */

// Servicios
export { PosSaleService, posSaleService } from "./services/pos-sale.service";
export type { PosSaleServiceDependencies } from "./services/pos-sale.service";

// Tipos
export type {
  PosPaymentMethod,
  CreatePosSaleParams,
  PosPreviewParams,
  PosPreviewResult,
  PosSaleResult,
} from "./types/pos.types";

// Esquemas Zod con .strict()
export { posSaleSchema } from "./schemas/pos-sale.schema";
export type { PosSaleInput } from "./schemas/pos-sale.schema";

export { posPreviewSchema } from "./schemas/pos-preview.schema";
export type { PosPreviewInput } from "./schemas/pos-preview.schema";

// Errores de Dominio
export {
  PosError,
  ForbiddenPosAccessError,
  PosCapacityExceededError,
  PosAvailabilityChangedError,
  PosMaintenanceDayError,
  PosServiceNotFoundError,
  PosOperatingHoursError,
  PosPastSlotError,
} from "./errors/pos.errors";

// Componentes UI (HU25 & HU26)
export { PosSaleForm } from "./components/PosSaleForm";
export type { PosSaleFormProps } from "./components/PosSaleForm";
export { PosReceiptCard } from "./components/PosReceiptCard";
export { PosTicketPreviewModal } from "./components/PosTicketPreviewModal";
