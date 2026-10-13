/**
 * Utilidades de Fechas y Zona Horaria para Vice City (RN-002: America/Bogota)
 * Vice City - Features: Services
 */

export const BOGOTA_TIMEZONE = "America/Bogota";

/**
 * Obtiene la fecha y hora actual en la zona horaria America/Bogota.
 */
export function getNowInBogota(): Date {
  // Obtener representación ISO en Bogotá
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  // YYYY-MM-DDTHH:mm:ss
  const isoStr = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}`;
  return new Date(isoStr);
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD según la hora de Bogotá.
 */
export function getTodayBogotaString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Retorna la hora y minutos actuales en Bogotá (formato 24h).
 */
export function getCurrentTimeInBogota(): { hours: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  let hours = 0;
  let minutes = 0;
  for (const part of parts) {
    if (part.type === "hour") hours = parseInt(part.value, 10);
    if (part.type === "minute") minutes = parseInt(part.value, 10);
  }
  return { hours, minutes };
}

/**
 * Calcula la diferencia en días calendario entre dos fechas (target - base).
 * Ambas fechas deben estar en formato YYYY-MM-DD.
 */
export function getDaysDifference(targetDateStr: string, baseDateStr?: string): number {
  const baseStr = baseDateStr ?? getTodayBogotaString();
  const [bYear, bMonth, bDay] = baseStr.split("-").map(Number);
  const [tYear, tMonth, tDay] = targetDateStr.split("-").map(Number);

  const baseUtc = Date.UTC(bYear, bMonth - 1, bDay);
  const targetUtc = Date.UTC(tYear, tMonth - 1, tDay);

  const diffMs = targetUtc - baseUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Retorna el día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
 * para una fecha YYYY-MM-DD en Bogotá.
 */
export function getDayOfWeekBogota(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Usar mediodía UTC para evitar desplazamientos por huso horario local
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.getUTCDay();
}

/**
 * Verifica si una franja horaria es la franja actualmente en curso (RN-010).
 * @param startTime Hora inicio "08:00"
 * @param endTime Hora fin "09:00"
 * @param dateStr Fecha "YYYY-MM-DD"
 */
export function isTimeSlotCurrent(
  startTime: string,
  endTime: string,
  dateStr: string,
  mockNowBogota?: { hours: number; minutes: number; dateStr?: string }
): boolean {
  const todayStr = mockNowBogota?.dateStr ?? getTodayBogotaString();
  if (dateStr !== todayStr) {
    return false;
  }

  const current = mockNowBogota ?? getCurrentTimeInBogota();
  const currentTotalMins = current.hours * 60 + current.minutes;

  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);
  const startTotalMins = sH * 60 + sM;
  const endTotalMins = eH * 60 + eM;

  // Está en curso si la hora actual es >= inicio y < fin
  return currentTotalMins >= startTotalMins && currentTotalMins < endTotalMins;
}

/**
 * Verifica si una franja ya terminó por completo en el día actual o en una fecha pasada.
 */
export function isTimeSlotPast(
  endTime: string,
  dateStr: string,
  mockNowBogota?: { hours: number; minutes: number; dateStr?: string }
): boolean {
  const todayStr = mockNowBogota?.dateStr ?? getTodayBogotaString();
  if (dateStr < todayStr) {
    return true;
  }
  if (dateStr > todayStr) {
    return false;
  }

  const current = mockNowBogota ?? getCurrentTimeInBogota();
  const currentTotalMins = current.hours * 60 + current.minutes;

  const [eH, eM] = endTime.split(":").map(Number);
  const endTotalMins = eH * 60 + eM;

  return currentTotalMins >= endTotalMins;
}

