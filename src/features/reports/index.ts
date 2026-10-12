/**
 * FT-08 / HU27: Barrel Export para la Feature de Reportes y Analítica
 * Vice City - Features: Reports
 */

// Servicios
export { MetricsService, metricsService } from "./services/metrics.service";
export type { MetricsServiceDependencies } from "./services/metrics.service";

// Utilidades de Fechas y Rangos
export {
  BOGOTA_TIMEZONE,
  BOGOTA_OFFSET_HOURS,
  SPANISH_DAY_NAMES,
  SPANISH_MONTH_SHORT_NAMES,
  getBogotaDateParts,
  getDateRangeInBogota,
} from "./utils/date-range.util";
export type { BogotaDateParts, CalculatedDateRange } from "./utils/date-range.util";

// Tipos
export type {
  MetricsPeriod,
  SalesChannel,
  MetricsDateRange,
  RevenuePointData,
  ServiceOccupancyMetric,
  TopSalesDay,
  MetricsSummary,
  SimpleChartPoint,
  MetricsResponseData,
} from "./types";

// Data
export {
  REVENUE_PERIODS,
  type RevenuePeriod,
  type RevenuePoint,
  MOCK_REVENUE,
  MOCK_RESERVATIONS_BY_SERVICE,
  MOCK_REVENUE_DISTRIBUTION,
  MOCK_REVENUE_SUMMARY,
} from "./data/mock-revenue";
