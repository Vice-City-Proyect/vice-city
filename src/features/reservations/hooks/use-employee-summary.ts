'use client';

import { fetchEmployeeSummary } from '../api/reservations.api';
import type { EmployeeDashboardSummaryData } from '../types/admin-reservations.types';
import { useRemoteData, type RemoteDataState } from './use-remote-data';
import { describeReservationsError } from './use-my-reservations';

export type EmployeeSummaryState = RemoteDataState<EmployeeDashboardSummaryData>;

/**
 * Resumen operativo del día para el panel de empleados: cifras y reservas de hoy
 * (GET /api/employee/summary).
 */
export function useEmployeeSummary(): EmployeeSummaryState {
  return useRemoteData(
    fetchEmployeeSummary,
    (error) => describeReservationsError(error, 'ver el panel'),
    'employee-summary',
  );
}
