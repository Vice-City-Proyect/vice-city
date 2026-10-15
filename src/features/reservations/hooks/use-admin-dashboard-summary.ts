'use client';

import { fetchAdminDashboardSummary } from '../api/reservations.api';
import type { AdminDashboardSummaryData } from '../types/admin-reservations.types';
import { useRemoteData, type RemoteDataState } from './use-remote-data';
import { describeReservationsError } from './use-my-reservations';

export type AdminDashboardSummaryState = RemoteDataState<AdminDashboardSummaryData>;

/**
 * Resumen del dashboard del administrador: reservas pendientes, usuarios activos y próximas
 * reservas (GET /api/reports/dashboard-summary).
 */
export function useAdminDashboardSummary(): AdminDashboardSummaryState {
  return useRemoteData(
    fetchAdminDashboardSummary,
    (error) => describeReservationsError(error, 'ver el resumen'),
    'admin-dashboard-summary',
  );
}
