import { apiRequest } from "@/lib/api-client";
import type {
  BackendCategoryRecord,
  BackendServiceRecord,
  ServiceMutationPayload,
} from "./service-mappers";

/**
 * Cliente del catálogo de servicios y categorías.
 *
 * Contratos consumidos:
 * - GET  /api/services?all=true
 * - GET  /api/services/[id]
 * - POST /api/services
 * - PATCH /api/services/[id]
 * - DELETE /api/services/[id]
 * - GET  /api/categories?all=true
 */

export function fetchServices(): Promise<BackendServiceRecord[]> {
  return apiRequest<BackendServiceRecord[]>("/api/services?all=true");
}

export function fetchService(id: string): Promise<BackendServiceRecord> {
  return apiRequest<BackendServiceRecord>(`/api/services/${encodeURIComponent(id)}`);
}

export function fetchCategories(): Promise<BackendCategoryRecord[]> {
  return apiRequest<BackendCategoryRecord[]>("/api/categories?all=true");
}

export function createServiceRecord(
  payload: ServiceMutationPayload
): Promise<BackendServiceRecord> {
  return apiRequest<BackendServiceRecord>("/api/services", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateServiceRecord(
  id: string,
  payload: Partial<ServiceMutationPayload> & { is_active?: boolean }
): Promise<BackendServiceRecord> {
  return apiRequest<BackendServiceRecord>(`/api/services/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setServiceActive(
  id: string,
  isActive: boolean
): Promise<BackendServiceRecord> {
  return updateServiceRecord(id, { is_active: isActive });
}

export interface DeleteServiceResponse {
  success: boolean;
  action: "DELETED" | "DEACTIVATED";
  serviceId: string;
  message: string;
  activeBookingsCount?: number;
}

export function deleteServiceRecord(id: string): Promise<DeleteServiceResponse> {
  return apiRequest<DeleteServiceResponse>(`/api/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
