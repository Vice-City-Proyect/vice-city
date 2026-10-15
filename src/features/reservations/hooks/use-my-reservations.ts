'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { fetchMyReservations, type FetchMyReservationsParams } from '../api/reservations.api';
import type { AdminReservationsPage } from '../types/admin-reservations.types';

export interface MyReservationsState {
  data: AdminReservationsPage | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Result {
  key: string;
  data: AdminReservationsPage | null;
  error: string | null;
}

export function describeReservationsError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo para ver tus reservas.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para ver estas reservas.';
    if (error.status === 0) return 'No se pudo conectar con el servidor. Verifica tu conexión.';
  }
  return 'No pudimos cargar tus reservas. Intenta de nuevo en unos minutos.';
}

/**
 * Reservas del usuario (GET /api/reservations). Mientras se consulta no se muestran datos
 * anteriores y, si el backend falla o tarda, se expone un mensaje claro en vez de datos viejos
 * o de ejemplo.
 */
export function useMyReservations(params: FetchMyReservationsParams = {}): MyReservationsState {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const paramsKey = JSON.stringify(params);
  const requestKey = `${paramsKey}:${reloadKey}`;

  useEffect(() => {
    let active = true;
    const currentParams = JSON.parse(paramsKey) as FetchMyReservationsParams;

    fetchMyReservations(currentParams)
      .then((data) => {
        if (active) setResult({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (active) setResult({ key: requestKey, data: null, error: describeReservationsError(err) });
      });

    return () => {
      active = false;
    };
  }, [paramsKey, requestKey]);

  const settled = result?.key === requestKey;

  return {
    data: settled ? result.data : null,
    loading: !settled,
    error: settled ? result.error : null,
    reload: () => setReloadKey((key) => key + 1),
  };
}
