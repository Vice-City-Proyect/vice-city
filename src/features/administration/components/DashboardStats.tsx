import { Activity, CalendarDays, Clock, Users, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatCOP, toISODate } from '@/lib/format';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';
import { MOCK_USERS } from '@/features/users/data/mock-users';
import { MOCK_OCCUPANCY, occupancyPercent } from '../data/mock-occupancy';

export function DashboardStats() {
  const today = toISODate(new Date());
  const todayReservations = MOCK_RESERVATIONS.filter((reservation) => reservation.date === today);
  const pending = MOCK_RESERVATIONS.filter((reservation) => reservation.status === 'PENDING');
  const revenueToday = todayReservations
    .filter((reservation) => reservation.paymentStatus === 'CONFIRMED')
    .reduce((sum, reservation) => sum + reservation.total, 0);
  const occupancy = Math.round(
    MOCK_OCCUPANCY.reduce((sum, item) => sum + occupancyPercent(item), 0) / MOCK_OCCUPANCY.length,
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Reservas de hoy"
        value={todayReservations.length}
        icon={<CalendarDays className="h-5 w-5" />}
        hint="Franja 8:00 AM – 5:00 PM"
      />
      <StatCard
        label="Pendientes"
        value={pending.length}
        icon={<Clock className="h-5 w-5" />}
        hint="Esperando confirmación de pago"
      />
      <StatCard
        label="Ingresos de hoy"
        value={formatCOP(revenueToday)}
        icon={<Wallet className="h-5 w-5" />}
        hint="Pagos confirmados"
      />
      <StatCard
        label="Usuarios"
        value={MOCK_USERS.length}
        icon={<Users className="h-5 w-5" />}
        hint="Registrados en la plataforma"
      />
      <StatCard
        label="Ocupación actual"
        value={`${occupancy}%`}
        icon={<Activity className="h-5 w-5" />}
        hint="Promedio de todas las áreas"
      />
    </div>
  );
}
