import { Activity, CalendarClock, CalendarDays, Clock, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { toBogotaTime } from '@/lib/format';
import { getOperatingSlots } from '@/lib/schedule';
import type { EmployeeDashboardSummaryData } from '@/features/reservations/types/admin-reservations.types';

/**
 * Tarjetas del día para el panel de empleados. Las cifras salen de GET /api/employee/summary;
 * las franjas siguen el horario del complejo.
 */
export function EmployeeSummary({ summary }: { summary: EmployeeDashboardSummaryData }) {
  const slots = getOperatingSlots(summary.date);
  const now = toBogotaTime();
  const upcomingSlots = slots.filter((slot) => slot.end > now).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Reservas de hoy"
        value={summary.todayReservations}
        icon={<CalendarDays className="h-5 w-5" />}
        hint="Operación del día"
      />
      <StatCard
        label="Visitantes esperados"
        value={summary.expectedVisitors}
        icon={<Users className="h-5 w-5" />}
        hint="Suma de personas en reservas"
      />
      <StatCard
        label="Servicios activos"
        value={summary.activeServices}
        icon={<Activity className="h-5 w-5" />}
        hint="Instalaciones operando"
      />
      <StatCard
        label="Próximas franjas"
        value={upcomingSlots.length || slots.length}
        icon={<Clock className="h-5 w-5" />}
        hint={
          upcomingSlots.length > 0
            ? upcomingSlots.map((slot) => slot.start).join(' · ')
            : 'Jornada finalizada'
        }
      />
      <StatCard
        label="Por atender"
        value={summary.pendingEntry}
        icon={<CalendarClock className="h-5 w-5" />}
        hint="Sin registrar ingreso"
      />
    </div>
  );
}
