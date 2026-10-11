import { service_modality_enum } from "@prisma/client";

/**
 * Tipos de modalidad de reserva según el SRS / enum de Prisma
 */
export type ServiceModality = "PER_PERSON_HOUR" | "EXCLUSIVE_RESERVATION";

/**
 * Parámetros para crear una categoría
 */
export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
};

/**
 * Parámetros para actualizar una categoría
 */
export type UpdateCategoryInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

/**
 * Parámetros para crear un servicio (FT-03 / SRS)
 */
export type CreateServiceInput = {
  category_id: string;
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  duration_minutes?: number;
  capacity: number; // max_capacity: debe ser > 0
  image_url?: string | null;
  modality?: ServiceModality;
};

/**
 * Parámetros para actualizar un servicio
 */
export type UpdateServiceInput = {
  category_id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  duration_minutes?: number;
  capacity?: number; // max_capacity: debe ser > 0
  image_url?: string | null;
  is_active?: boolean;
  modality?: ServiceModality;
};

/**
 * Resultado de eliminación o desactivación de un servicio (RN-006)
 */
export type DeleteServiceResult = {
  success: boolean;
  action: "DELETED" | "DEACTIVATED";
  serviceId: string;
  message: string;
  activeBookingsCount?: number;
};

// ---------------------------------------------------------------------------
// HU18: Precios dinámicos de servicios (RN-007)
// ---------------------------------------------------------------------------

/**
 * Parámetros para modificar la tarifa base de un servicio (HU18)
 */
export type UpdateServicePriceInput = {
  price: number;
};

/**
 * Resultado de la modificación de precio de un servicio
 */
export type ServicePriceUpdateResult = {
  success: boolean;
  serviceId: string;
  previousPrice: number;
  newPrice: number;
  updatedAt: Date;
};

/**
 * Parámetros para crear una reserva asegurando la congelación del precio histórico
 */
export type CreateBookingInput = {
  user_id: string;
  service_id: string;
  start_at: Date;
  end_at: Date;
  quantity?: number;
  schedule_id?: string | null;
  notes?: string | null;
  /** Estado de la reserva: 'pending' (HOLD de 10 min) o 'confirmed' */
  status?: "pending" | "confirmed";
  /** Override opcional de monto unitario; si no se envía, toma el precio actual del servicio */
  unit_price?: number;
};
