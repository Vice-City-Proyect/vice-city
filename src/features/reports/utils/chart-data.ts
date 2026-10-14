/**
 * Utilidades puras para presentar las métricas (HU32). Sin dependencias de React ni de la red,
 * para poder probarlas con node:test.
 */

export interface ChartPointLike {
  label: string;
  value: number;
}

/**
 * Indica si una serie tiene algo que graficar. Un período sin ventas llega del backend como una
 * serie de ceros (no como un error): en ese caso se muestra un estado vacío.
 */
export function hasChartData(points: readonly ChartPointLike[] | null | undefined): boolean {
  return Array.isArray(points) && points.some((point) => Number.isFinite(point.value) && point.value > 0);
}

/**
 * Mensaje para el usuario según el estado HTTP de /api/reports/metrics. Nunca expone detalles
 * internos del servidor.
 */
export function describeMetricsError(status: number | null): string {
  if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo para ver las métricas.';
  if (status === 403) return 'No tienes permiso para ver estas métricas.';
  if (status === 400) return 'El período seleccionado no es válido.';
  return 'No se pudieron cargar las métricas. Intenta de nuevo en unos segundos.';
}
