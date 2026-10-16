import { Activity, CalendarDays, Clock, Users, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatCOP } from '@/lib/format';
import type { MetricsSummary } from '@/features/reports/types';

interface DashboardStatsProps {
  summary: MetricsSummary;
  /** Reservas con HOLD vigente. Sale de /api/reports/dashboard-summary; sin dato, la tarjeta no se muestra. */
  pendingReservations?: number;
  /** Cuentas activas. Sale de /api/reports/dashboard-summary; sin dato, la tarjeta no se muestra. */
  activeUsers?: number;
}

/**
 * Tarjetas del resumen del día. "Reservas", "Ingresos" y "Ocupación" salen de
 * /api/reports/metrics?period=day; "Pendientes" y "Usuarios" de /api/reports/dashboard-summary.
 */
export function DashboardStats({ summary, pendingReservations, activeUsers }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="Reservas de hoy"
        value={summary.totalReservations}
        icon={<CalendarDays className="h-5 w-5" />}
        hint="Reservas confirmadas del día"
      />
      <StatCard
        label="Ingresos de hoy"
        value={formatCOP(summary.totalRevenue)}
        icon={<Wallet className="h-5 w-5" />}
        hint="Pagos confirmados"
      />
      <StatCard
        label="Ocupación de hoy"
        value={`${summary.averageOccupancy}%`}
        icon={<Activity className="h-5 w-5" />}
        hint="Promedio de todas las áreas"
      />
      {pendingReservations !== undefined && (
        <StatCard
          label="Pendientes"
          value={pendingReservations}
          icon={<Clock className="h-5 w-5" />}
          hint="Esperando pago (10 min)"
        />
      )}
      {activeUsers !== undefined && (
        <StatCard
          label="Usuarios"
          value={activeUsers}
          icon={<Users className="h-5 w-5" />}
          hint="Cuentas activas"
        />
      )}
    </div>
  );
}
