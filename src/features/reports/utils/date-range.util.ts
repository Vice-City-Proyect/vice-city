/**
 * FT-08 / HU27: Utilidad de Rangos de Fechas en Zona Horaria America/Bogota
 * Vice City - Features: Reports
 *
 * Reglas de Negocio Oficiales:
 * - RN-002: Todo el complejo opera bajo el huso horario America/Bogota (UTC-5).
 * - CA02: Cada filtro de período ('day', 'week', 'month', 'year') devuelve el rango
 *   cronológico exacto calculado en hora colombiana, sin sufrir desplazamientos por
 *   la zona horaria del servidor o entorno de ejecución.
 */

import type { MetricsPeriod, MetricsDateRange } from "../types";

export const BOGOTA_TIMEZONE = "America/Bogota";
export const BOGOTA_OFFSET_HOURS = 5; // Colombia no tiene horario de verano (DST), siempre UTC-5.

export const SPANISH_DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const SPANISH_MONTH_SHORT_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export interface BogotaDateParts {
  year: number;
  month: number;    // 1-12
  day: number;      // 1-31
  hour: number;     // 0-23
  minute: number;   // 0-59
  second: number;   // 0-59
  dayOfWeek: number;// 0 (Domingo) - 6 (Sábado)
  dateStr: string;  // YYYY-MM-DD
}

/**
 * Descompone un objeto Date en sus componentes locales de calendario en America/Bogota.
 */
export function getBogotaDateParts(date: Date): BogotaDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);
  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;

  // Para calcular el día de la semana en Bogotá de forma inequívoca:
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = noonUtc.getUTCDay();

  return { year, month, day, hour, minute, second, dayOfWeek, dateStr };
}

export interface CalculatedDateRange {
  startDate: Date;      // Objeto Date UTC para consultar en Prisma (gte)
  endDate: Date;        // Objeto Date UTC para consultar en Prisma (lte)
  metricsRange: MetricsDateRange; // Representación legible con offset -05:00
}

/**
 * Calcula los límites cronológicos [inicio, fin] para un período determinado
 * en la zona horaria America/Bogota.
 *
 * - 'day': Desde las 00:00:00.000 hasta las 23:59:59.999 del día en Bogotá.
 * - 'week': Desde el Lunes 00:00:00.000 hasta el Domingo 23:59:59.999 de la semana.
 * - 'month': Desde el día 1 00:00:00.000 hasta el último día del mes 23:59:59.999.
 * - 'year': Desde el 1 de Enero 00:00:00.000 hasta el 31 de Diciembre 23:59:59.999.
 */
export function getDateRangeInBogota(
  period: MetricsPeriod,
  referenceDate: Date = new Date()
): CalculatedDateRange {
  const parts = getBogotaDateParts(referenceDate);
  const { year, month, day, dayOfWeek, dateStr } = parts;

  let startUtcMs: number;
  let endUtcMs: number;
  let label = "";
  let startIsoStr = "";
  let endIsoStr = "";

  if (period === "day") {
    // 00:00:00.000 Bogotá -> +5 horas en UTC
    startUtcMs = Date.UTC(year, month - 1, day, BOGOTA_OFFSET_HOURS, 0, 0, 0);
    // 23:59:59.999 Bogotá -> +5 horas en UTC (28:59:59.999)
    endUtcMs = Date.UTC(year, month - 1, day, 23 + BOGOTA_OFFSET_HOURS, 59, 59, 999);

    label = `Día ${dateStr}`;
    startIsoStr = `${dateStr}T00:00:00.000-05:00`;
    endIsoStr = `${dateStr}T23:59:59.999-05:00`;
  } else if (period === "week") {
    // En Colombia la semana comienza el Lunes (ISO 1) y termina el Domingo (ISO 7)
    const isoDow = dayOfWeek === 0 ? 7 : dayOfWeek;
    const mondayOffset = isoDow - 1;

    // Calcular fecha del Lunes
    const monDate = new Date(Date.UTC(year, month - 1, day - mondayOffset, 12, 0, 0));
    const monParts = getBogotaDateParts(monDate);

    startUtcMs = Date.UTC(monParts.year, monParts.month - 1, monParts.day, BOGOTA_OFFSET_HOURS, 0, 0, 0);

    // Calcular fecha del Domingo (Lunes + 6 días)
    const sunDate = new Date(Date.UTC(monParts.year, monParts.month - 1, monParts.day + 6, 12, 0, 0));
    const sunParts = getBogotaDateParts(sunDate);

    endUtcMs = Date.UTC(sunParts.year, sunParts.month - 1, sunParts.day, 23 + BOGOTA_OFFSET_HOURS, 59, 59, 999);

    label = `Semana del ${monParts.dateStr} al ${sunParts.dateStr}`;
    startIsoStr = `${monParts.dateStr}T00:00:00.000-05:00`;
    endIsoStr = `${sunParts.dateStr}T23:59:59.999-05:00`;
  } else if (period === "month") {
    // Día 1 del mes en Bogotá
    startUtcMs = Date.UTC(year, month - 1, 1, BOGOTA_OFFSET_HOURS, 0, 0, 0);

    // Último día del mes: Date.UTC(year, month, 0) calcula el último día del mes anterior a 'month'
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    endUtcMs = Date.UTC(year, month - 1, lastDayOfMonth, 23 + BOGOTA_OFFSET_HOURS, 59, 59, 999);

    const monthStr = String(month).padStart(2, "0");
    const lastDayStr = String(lastDayOfMonth).padStart(2, "0");

    label = `Mes ${monthStr}/${year}`;
    startIsoStr = `${year}-${monthStr}-01T00:00:00.000-05:00`;
    endIsoStr = `${year}-${monthStr}-${lastDayStr}T23:59:59.999-05:00`;
  } else if (period === "year") {
    // 1 de Enero 00:00:00 Bogotá
    startUtcMs = Date.UTC(year, 0, 1, BOGOTA_OFFSET_HOURS, 0, 0, 0);
    // 31 de Diciembre 23:59:59.999 Bogotá
    endUtcMs = Date.UTC(year, 11, 31, 23 + BOGOTA_OFFSET_HOURS, 59, 59, 999);

    label = `Año ${year}`;
    startIsoStr = `${year}-01-01T00:00:00.000-05:00`;
    endIsoStr = `${year}-12-31T23:59:59.999-05:00`;
  } else {
    throw new Error(`Período no soportado: '${period}'. Válidos: day, week, month, year.`);
  }

  const startDate = new Date(startUtcMs);
  const endDate = new Date(endUtcMs);

  return {
    startDate,
    endDate,
    metricsRange: {
      start: startIsoStr,
      end: endIsoStr,
      timezone: BOGOTA_TIMEZONE,
      label,
    },
  };
}

