/**
 * Módulo de Reservas y Retención (HOLD) (Features: Reservations)
 * Vice City - Soporte para FT-04 / HU21
 */

// Servicios
export {
  ReservationHoldService,
  reservationHoldService,
  HOLD_DURATION_MINUTES,
  HOLD_DURATION_MS,
} from "./services/reservation-hold.service";
export type { ReservationHoldServiceDependencies } from "./services/reservation-hold.service";

// Tipos
export type {
  CreateHoldParams,
  HoldReservationResult,
  BookingDetails,
} from "./types/reservation.types";

// Esquemas Zod con .strict()
export { createHoldSchema } from "./schemas/reservation.schema";
export type { CreateHoldInput } from "./schemas/reservation.schema";

// Errores de Dominio
export {
  ReservationError,
  SlotFullConflictError,
  HoldExpiredError,
  InvalidDurationError,
  BookingNotFoundError,
} from "./errors/reservation.errors";

// Módulo de Reservas Administrativas (MR1)
export {
  AdminReservationsService,
  adminReservationsService,
} from "./services/admin-reservations.service";
export type {
  AdminReservationsListResult,
  AdminReservationsServiceDeps,
} from "./services/admin-reservations.service";

export {
  adminReservationsQuerySchema,
  adminReservationIdSchema,
  updateAdminReservationSchema,
} from "./schemas/admin-reservations.schema";
export type {
  AdminReservationsQueryParams,
  UpdateAdminReservationInput,
} from "./schemas/admin-reservations.schema";

export {
  mapBookingToAdminDto,
  mapBookingToAdminDetailDto,
  toBogotaDateParts,
  computeOperationalStatus,
} from "./dto/admin-reservation.dto";
export type {
  AdminReservationDto,
  AdminReservationDetailDto,
} from "./dto/admin-reservation.dto";


