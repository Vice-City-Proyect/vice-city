import { CalendarClock, CalendarOff } from 'lucide-react';
import {
  HOLIDAY_AFTER_MAINTENANCE_DAY,
  MAINTENANCE_DAY,
  isMaintenanceDay,
} from '@/lib/schedule';
import { toISODate } from '@/lib/format';

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function MaintenanceNotice() {
  const today = toISODate(new Date());
  const maintenanceToday = isMaintenanceDay(today);

  if (maintenanceToday) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-brand-yellow/50 bg-brand-yellow/15 px-4 py-3.5"
      >
        <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-text-main" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-text-main">
            Hoy aplica mantenimiento
          </span>
          <span className="text-xs leading-relaxed text-text-muted">
            El complejo no opera: no hay reservas, ventas en el punto de venta ni accesos por QR
            durante todo el día.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-2xl border border-text-main/10 bg-club-surface px-4 py-3.5"
    >
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
      <div className="flex flex-col gap-1">
        <span className="text-xs font-black uppercase tracking-wider text-club-accent">
          Mantenimiento semanal
        </span>
        <span className="text-xs leading-relaxed text-text-muted">
          {DAY_LABELS[MAINTENANCE_DAY]} cerrado (o {DAY_LABELS[HOLIDAY_AFTER_MAINTENANCE_DAY]} si
          el {DAY_LABELS[MAINTENANCE_DAY].toLowerCase()} es festivo). Operación de 8:00 AM a 5:00
          PM, hora de Colombia.
        </span>
      </div>
    </div>
  );
}
