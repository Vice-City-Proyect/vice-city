/**
 * Módulo de Servicios, Catálogo y Disponibilidad (Features: Services)
 * Vice City - Soporte para FT-04 / HU20 y Administración (HU17, HU18)
 */

// Servicios principales de catálogo y disponibilidad (FT-04 / HU20)
export {
  CatalogService,
  catalogService,
} from "./services/catalog.service";
export type { CatalogServiceDependencies } from "./services/catalog.service";

export {
  AvailabilityService,
  availabilityService,
  OPERATING_HOURS,
  STANDARD_SLOTS,
} from "./services/availability.service";
export type { AvailabilityServiceDependencies } from "./services/availability.service";

// Tipos de catálogo y disponibilidad
export type {
  ServiceItem,
  CategoryWithServices,
  CatalogResponseData,
} from "./types/catalog.types";

export type {
  SlotStatus,
  TimeSlot,
  ServiceSummary,
  ServiceAvailabilityResult,
} from "./types/availability.types";

// Esquemas Zod con .strict()
export {
  availabilityQuerySchema,
  catalogQuerySchema,
} from "./schemas/availability.schema";
export type {
  AvailabilityQueryParams,
  CatalogQueryParams,
} from "./schemas/availability.schema";

// Errores de Dominio
export {
  CatalogError,
  MaintenanceDayError,
  AdvanceBookingLimitError,
  PastDateError,
  OperatingHoursError,
  ServiceNotFoundError,
  InvalidDateFormatError,
} from "./errors/availability.errors";

// Utilidades de Fechas y Festivos
export {
  isColombianHoliday,
  checkMaintenanceDay,
  getColombianHolidaysForYear,
} from "./utils/colombian-holidays.util";

export {
  BOGOTA_TIMEZONE,
  getNowInBogota,
  getTodayBogotaString,
  getCurrentTimeInBogota,
  getDaysDifference,
  getDayOfWeekBogota,
  isTimeSlotCurrent,
  isTimeSlotPast,
} from "./utils/date-bogota.util";

// Repositorios, guardias y tipos base de servicios y categorías (HU17, HU18)
export * from "./types";
export * from "./categories.repository";
export * from "./services.repository";
export * from "./auth-guard";

