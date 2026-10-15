/**
 * Constantes de la feature de reportes (HU27 / HU32): filtros de período disponibles.
 * Los valores deben coincidir con los que acepta `GET /api/reports/metrics?period=`.
 */

export const REVENUE_PERIODS = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
] as const;

export type RevenuePeriod = (typeof REVENUE_PERIODS)[number]['value'];
