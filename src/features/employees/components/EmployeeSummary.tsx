import { Activity, CalendarClock, CalendarDays, Clock, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { toISODate } from '@/lib/format';
import { getOperatingSlots } from '@/lib/schedule';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';
import { MOCK_SERVICES } from '@/features/services/data/mock-services';

export function EmployeeSummary() {
  const today = toISODate(new Date());
  const todayReservations = MOCK_RESERVATIONS.filter(
    (reservation) => reservation.date === today && reservation.status !== 'CANCELLED',
  );
  const expectedVisitors = todayReservations.reduce(
    (sum, reservation) => sum + reservation.guests,
    0,
  );
  const activeServices = MOCK_SERVICES.filter((service) => service.status === 'ACTIVE').length;
  const slots = getOperatingSlots(today);
  const now = new Date().toTimeString().slice(0, 5);
  const upcomingSlots = slots.filter((slot) => slot.end > now).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Reservas de hoy"
        value={todayReservations.length}
        icon={<CalendarDays className="h-5 w-5" />}
        hint="Operación del día"
      />
      <StatCard
        label="Visitantes esperados"
        value={expectedVisitors}
        icon={<Users className="h-5 w-5" />}
        hint="Suma de personas en reservas"
      />
      <StatCard
        label="Servicios activos"
        value={activeServices}
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
        value={todayReservations.filter((reservation) => reservation.accessStatus === 'NOT_ENTERED')
          .length}
        icon={<CalendarClock className="h-5 w-5" />}
        hint="Sin registrar ingreso"
      />
    </div>
  );
}
