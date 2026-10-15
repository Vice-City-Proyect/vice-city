import { ApiError, apiRequest } from '@/lib/api-client';
import type {
  AdminDashboardSummaryData,
  EmployeeDashboardSummaryData,
  AdminReservation,
  AdminReservationsPage,
  CancelAdminReservationPayload,
  UpdateAdminReservationPayload,
} from '../types/admin-reservations.types';

export type AdminReservationStatusFilter =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'FINISHED'
  | 'ALL';

export interface FetchAdminReservationsParams {
  page?: number;
  limit?: number;
  status?: AdminReservationStatusFilter;
  serviceId?: string;
  date?: string;
  slot?: string;
  search?: string;
}

interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPagination(value: unknown): value is AdminReservationsPage['pagination'] {
  if (!isRecord(value)) return false;
  return (
    typeof value.page === 'number' &&
    typeof value.limit === 'number' &&
    typeof value.total === 'number' &&
    typeof value.totalPages === 'number'
  );
}

async function fetchAdminReservationsPage(
  url: string
): Promise<AdminReservationsPage> {
  let response: Response;
  try {
    response = await fetch(url, { headers: {} });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica tu conexión.',
      0,
      'NETWORK_ERROR'
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const errorPayload: ApiErrorPayload | null = isRecord(payload)
    ? {
        success: typeof payload.success === 'boolean' ? payload.success : undefined,
        message: typeof payload.message === 'string' ? payload.message : undefined,
        error: typeof payload.error === 'string' ? payload.error : undefined,
      }
    : null;

  if (!response.ok || errorPayload?.success === false) {
    const message =
      errorPayload?.message ||
      errorPayload?.error ||
      `Error ${response.status} al procesar la solicitud`;
    throw new ApiError(message, response.status, errorPayload?.error);
  }

  if (payload === null) {
    throw new ApiError(
      `Respuesta inválida del servidor (${response.status}): el cuerpo no es JSON`,
      response.status,
      'INVALID_RESPONSE'
    );
  }

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.data) ||
    !isPagination(payload.pagination)
  ) {
    throw new ApiError('Respuesta inesperada del servidor', response.status, 'INVALID_RESPONSE');
  }

  return {
    items: payload.data as AdminReservation[],
    pagination: payload.pagination,
  };
}

export function fetchAdminReservations(
  params: FetchAdminReservationsParams = {}
): Promise<AdminReservationsPage> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') {
    searchParams.set('status', params.status);
  }
  if (params.serviceId) searchParams.set('serviceId', params.serviceId);
  if (params.date) searchParams.set('date', params.date);
  if (params.slot) searchParams.set('slot', params.slot);
  if (params.search?.trim()) searchParams.set('search', params.search.trim());

  const query = searchParams.toString();
  const url = `/api/admin/reservations${query ? `?${query}` : ''}`;
  return fetchAdminReservationsPage(url);
}

export interface FetchMyReservationsParams {
  page?: number;
  limit?: number;
  status?: AdminReservationStatusFilter;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  order?: 'asc' | 'desc';
}

/**
 * Reservas del usuario con sesión (GET /api/reservations). El backend limita al CLIENT a
 * sus propias reservas; el ADMIN recibe todas.
 */
export function fetchMyReservations(
  params: FetchMyReservationsParams = {}
): Promise<AdminReservationsPage> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') {
    searchParams.set('status', params.status);
  }
  if (params.serviceId) searchParams.set('serviceId', params.serviceId);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params.order) searchParams.set('order', params.order);

  const query = searchParams.toString();
  return fetchAdminReservationsPage(`/api/reservations${query ? `?${query}` : ''}`);
}

/**
 * Resumen del dashboard del administrador (GET /api/reports/dashboard-summary):
 * reservas pendientes, usuarios activos y próximas reservas.
 */
export function fetchAdminDashboardSummary(): Promise<AdminDashboardSummaryData> {
  return apiRequest<AdminDashboardSummaryData>('/api/reports/dashboard-summary', {
    cache: 'no-store',
  });
}

/**
 * Resumen operativo del día para el panel de empleados (GET /api/employee/summary).
 */
export function fetchEmployeeSummary(): Promise<EmployeeDashboardSummaryData> {
  return apiRequest<EmployeeDashboardSummaryData>('/api/employee/summary', {
    cache: 'no-store',
  });
}

export function updateAdminReservation(
  reservationId: string,
  payload: UpdateAdminReservationPayload
): Promise<AdminReservation> {
  return apiRequest<AdminReservation>(
    `/api/admin/reservations/${encodeURIComponent(reservationId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export function cancelAdminReservation(
  reservationId: string,
  payload: CancelAdminReservationPayload
): Promise<AdminReservation> {
  const reason = payload.cancellationReason?.trim();
  const body: CancelAdminReservationPayload = {
    status: 'CANCELLED',
    ...(reason ? { cancellationReason: reason } : {}),
  };

  return apiRequest<AdminReservation>(
    `/api/admin/reservations/${encodeURIComponent(reservationId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
}
