/**
 * Cálculo de Días Festivos Oficiales de Colombia (Ley 51 de 1983 - Ley Emiliani)
 * y Detección de Días de Mantenimiento (RN-003)
 * Vice City - Features: Services
 */

import { getDayOfWeekBogota } from "./date-bogota.util";

/**
 * Calcula la fecha del Domingo de Pascua (algoritmo anónimo de Gauss / Meeus).
 */
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Abr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Traslada una fecha al siguiente lunes según la Ley Emiliani (si no cae en lunes).
 */
function moveToNextMonday(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = date.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  if (dayOfWeek === 1) {
    // Ya es lunes
    return formatIso(year, month, day);
  }
  const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return formatIso(
    nextMonday.getUTCFullYear(),
    nextMonday.getUTCMonth() + 1,
    nextMonday.getUTCDate()
  );
}

function addDaysToEaster(
  year: number,
  easter: { month: number; day: number },
  daysToAdd: number
): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(year, easter.month - 1, easter.day, 12, 0, 0));
  const result = new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

function formatIso(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Obtiene todos los festivos oficiales de Colombia para un año determinado (formato YYYY-MM-DD).
 */
export function getColombianHolidaysForYear(year: number): Set<string> {
  const holidays = new Set<string>();

  // 1. Festivos con fecha fija
  holidays.add(formatIso(year, 1, 1));   // Año Nuevo
  holidays.add(formatIso(year, 5, 1));   // Día del Trabajo
  holidays.add(formatIso(year, 7, 20));  // Grito de Independencia
  holidays.add(formatIso(year, 8, 7));   // Batalla de Boyacá
  holidays.add(formatIso(year, 12, 8));  // Inmaculada Concepción
  holidays.add(formatIso(year, 12, 25)); // Navidad

  // 2. Festivos trasladables (Ley Emiliani: se trasladan al siguiente lunes)
  holidays.add(moveToNextMonday(year, 1, 6));   // Reyes Magos
  holidays.add(moveToNextMonday(year, 3, 19));  // San José
  holidays.add(moveToNextMonday(year, 6, 29));  // San Pedro y San Pablo
  holidays.add(moveToNextMonday(year, 8, 15));  // Asunción de la Virgen
  holidays.add(moveToNextMonday(year, 10, 12)); // Día de la Raza
  holidays.add(moveToNextMonday(year, 11, 1));  // Todos los Santos
  holidays.add(moveToNextMonday(year, 11, 11)); // Independencia de Cartagena

  // 3. Festivos dependientes de la Semana Santa
  const easter = getEasterSunday(year);

  // Jueves y Viernes Santo (fechas fijas respecto a Pascua)
  const juevesSanto = addDaysToEaster(year, easter, -3);
  holidays.add(formatIso(juevesSanto.year, juevesSanto.month, juevesSanto.day));

  const viernesSanto = addDaysToEaster(year, easter, -2);
  holidays.add(formatIso(viernesSanto.year, viernesSanto.month, viernesSanto.day));

  // Festivos móviles trasladados al lunes
  const ascension = addDaysToEaster(year, easter, 39); // 40 días post Pascua
  holidays.add(moveToNextMonday(ascension.year, ascension.month, ascension.day));

  const corpusChristi = addDaysToEaster(year, easter, 60); // 60 días post Pascua
  holidays.add(moveToNextMonday(corpusChristi.year, corpusChristi.month, corpusChristi.day));

  const sagradoCorazon = addDaysToEaster(year, easter, 68); // 68 días post Pascua
  holidays.add(moveToNextMonday(sagradoCorazon.year, sagradoCorazon.month, sagradoCorazon.day));

  return holidays;
}

/**
 * Determina si una fecha específica (YYYY-MM-DD) es día festivo oficial en Colombia.
 */
export function isColombianHoliday(dateStr: string): boolean {
  const [year] = dateStr.split("-").map(Number);
  const holidays = getColombianHolidaysForYear(year);
  return holidays.has(dateStr);
}

/**
 * Determina si una fecha es día de mantenimiento semanal en Vice City (RN-001 y RN-003):
 * - Mantenimiento regular: LUNES (siempre y cuando no sea festivo).
 * - Mantenimiento trasladado: MARTES (si el lunes anterior fue festivo).
 * En días de mantenimiento, ¡NO HAY DISPONIBILIDAD para ningún servicio!
 */
export function checkMaintenanceDay(dateStr: string): {
  isMaintenance: boolean;
  reason?: string;
} {
  const dayOfWeek = getDayOfWeekBogota(dateStr); // 0=Dom, 1=Lun, 2=Mar, ...

  // Caso 1: Lunes
  if (dayOfWeek === 1) {
    const isHoliday = isColombianHoliday(dateStr);
    if (isHoliday) {
      // Si el lunes es festivo, el complejo opera normalmente (el mantenimiento pasa al martes)
      return { isMaintenance: false };
    }
    return {
      isMaintenance: true,
      reason: "Mantenimiento semanal programado (Lunes). Complejo deportivo cerrado.",
    };
  }

  // Caso 2: Martes
  if (dayOfWeek === 2) {
    // Calcular la fecha del lunes anterior (1 día antes)
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const previousMonday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const prevMonStr = formatIso(
      previousMonday.getUTCFullYear(),
      previousMonday.getUTCMonth() + 1,
      previousMonday.getUTCDate()
    );

    const prevMonIsHoliday = isColombianHoliday(prevMonStr);
    if (prevMonIsHoliday) {
      return {
        isMaintenance: true,
        reason:
          "Mantenimiento semanal trasladado (Martes posterior a Lunes festivo). Complejo deportivo cerrado.",
      };
    }
    return { isMaintenance: false };
  }

  // Miércoles a Domingo nunca son días de mantenimiento
  return { isMaintenance: false };
}

