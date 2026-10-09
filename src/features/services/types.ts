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
