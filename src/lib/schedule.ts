import type { TimeSlot } from '@/types/service';

export const TIME_ZONE = 'America/Bogota';

export const OPERATING_OPEN = '08:00';
export const OPERATING_CLOSE = '17:00';

export const MAINTENANCE_DAY = 1;
export const HOLIDAY_AFTER_MAINTENANCE_DAY = 2;

export const MAX_ADVANCE_DAYS_NORMAL = 15;
export const MAX_ADVANCE_DAYS_FULL_POOL = 20;
export const MIN_DURATION_HOURS = 1;
export const MAX_DURATION_HOURS = 9;

export const HOLD_MINUTES = 10;
export const WEDNESDAY_DISCOUNT = 20;
export const FULL_POOL_DISCOUNT = 20;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isWithinOperatingHours(slot: TimeSlot): boolean {
  return (
    toMinutes(slot.start) >= toMinutes(OPERATING_OPEN) &&
    toMinutes(slot.end) <= toMinutes(OPERATING_CLOSE)
  );
}

export function isMaintenanceDay(date: string, holiday = false): boolean {
  const day = new Date(`${date}T12:00:00-05:00`).getDay();
  if (day === MAINTENANCE_DAY) return true;
  return holiday && day === HOLIDAY_AFTER_MAINTENANCE_DAY;
}

export function isWednesday(date: string): boolean {
  return new Date(`${date}T12:00:00-05:00`).getDay() === 3;
}

export function getOperatingSlots(date: string): TimeSlot[] {
  if (isMaintenanceDay(date)) return [];

  const slots: TimeSlot[] = [];
  const open = toMinutes(OPERATING_OPEN);
  const close = toMinutes(OPERATING_CLOSE);

  for (let start = open; start < close; start += 60) {
    const end = start + 60;
    slots.push({
      start: minutesToTime(start),
      end: minutesToTime(end),
    });
  }

  return slots;
}

function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function addHours(time: string, hours: number): string {
  return minutesToTime(toMinutes(time) + hours * 60);
}
