'use client';

import { ApiError } from '@/lib/api-client';
import { fetchMyReservations, type FetchMyReservationsParams } from '../api/reservations.api';
import type { AdminReservationsPage } from '../types/admin-reservations.types';
import { useRemoteData, type RemoteDataState } from './use-remote-data';

export type MyReservationsState = RemoteDataState<AdminReservationsPage>;

/**
 * Mensaje claro para el usuario según el error de la consulta. Nunca expone el texto técnico
 * del servidor. `subject` completa la frase ("ver tus reservas", "ver el resumen"...).
 */
export function describeReservationsError(error: unknown, subject = 'ver tus reservas'): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return `Tu sesión expiró. Inicia sesión de nuevo para ${subject}.`;
    if (error.status === 403) return 'Tu cuenta no tiene permiso para ver esta información.';
    if (error.status === 0) return 'No se pudo conectar con el servidor. Verifica tu conexión.';
  }
  return 'No pudimos cargar la información. Intenta de nuevo en unos minutos.';
}

/**
 * Reservas del usuario (GET /api/reservations). Mientras se consulta no se muestran datos
 * anteriores y, si el backend falla o tarda, se expone un mensaje claro en vez de datos viejos
 * o de ejemplo.
 */
export function useMyReservations(params: FetchMyReservationsParams = {}): MyReservationsState {
  return useRemoteData(
    () => fetchMyReservations(params),
    (error) => describeReservationsError(error),
    JSON.stringify(params),
  );
}
