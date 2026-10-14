/**
 * FT-08 / HU27: Tipos y Modelos para Métricas de Ventas y Ocupación
 * Vice City - Features: Reports
 *
 * Define las interfaces de datos para:
 * - Filtros por período ('day' | 'week' | 'month' | 'year')
 * - Desglose de ingresos totales, ventas Web y ventas POS
 * - Ocupación detallada por servicio y promedios
 * - Días de mayor venta ordenados por facturación
 * - Flujo temporal de ingresos para gráficas (horas, días, semanas, meses)
 */

import type { RevenuePeriod } from "./constants";

export type MetricsPeriod = RevenuePeriod; // 'day' | 'week' | 'month' | 'year'

/**
 * Canal de ventas registrado en Vice City
 */
export type SalesChannel = "web" | "pos";

/**
 * Rango de fechas con zona horaria explícita
 */
export interface MetricsDateRange {
  start: string; // ISO 8601 con offset America/Bogota (ej: "2026-10-01T00:00:00.000-05:00")
  end: string;   // ISO 8601 con offset America/Bogota (ej: "2026-10-31T23:59:59.999-05:00")
  timezone: string; // "America/Bogota"
  label: string;
}

/**
 * Punto de datos en la serie temporal de ingresos
 */
export interface RevenuePointData {
  label: string;     // Ej: "08:00", "Lun", "Sem 1", "Ene"
  value: number;     // Total recaudado en este punto temporal
  webValue: number;  // Ingresos generados vía Web (Stripe)
  posValue: number;  // Ingresos generados vía POS (Taquilla)
}

/**
 * Distribución de reservas u ocupación por servicio
 */
export interface ServiceOccupancyMetric {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  capacity: number;             // Aforo máximo unitario por hora/franja
  bookedCount: number;          // Cantidad de personas/cupos reservados en el período
  occupancyRate: number;        // Porcentaje de ocupación calculado (0 - 100)
  revenue: number;              // Total facturado por este servicio
  webBookings: number;          // Reservas hechas vía Web
  posBookings: number;          // Reservas hechas vía POS
}

/**
 * Resumen de día con mayor venta (Top Sales Day)
 */
export interface TopSalesDay {
  date: string;         // YYYY-MM-DD en America/Bogota
  dayName: string;      // Ej: "Lunes", "Sábado", etc.
  totalRevenue: number; // Monto total recaudado en el día
  webRevenue: number;   // Monto web
  posRevenue: number;   // Monto POS
  reservationsCount: number; // Total de reservas en el día
}

/**
 * Resumen ejecutivo de métricas
 */
export interface MetricsSummary {
  totalRevenue: number;        // Ingresos totales en el período
  webRevenue: number;          // Ingresos vía Web (Stripe)
  posRevenue: number;          // Ingresos vía POS (Taquilla presencial)
  totalReservations: number;   // Total de reservas confirmadas
  webReservations: number;     // Reservas Web
  posReservations: number;     // Reservas POS
  topService: string;          // Nombre del servicio con mayor facturación
  topDay: string;              // Día de mayor venta (nombre del día o fecha)
  averageOccupancy: number;    // Porcentaje de ocupación promedio ponderado (0 - 100)
}

/**
 * Punto para gráficos simples compatibles con Chart components
 */
export interface SimpleChartPoint {
  label: string;
  value: number;
}

/**
 * Respuesta completa de métricas de ventas y ocupación (FT-08 / HU27)
 */
export interface MetricsResponseData {
  period: MetricsPeriod;
  range: MetricsDateRange;
  summary: MetricsSummary;
  revenueFlow: RevenuePointData[];
  occupancyByService: ServiceOccupancyMetric[];
  reservationsByService: SimpleChartPoint[];
  revenueDistribution: SimpleChartPoint[];
  topSalesDays: TopSalesDay[];
}

