import { Activity, CalendarDays, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatCOP } from '@/lib/format';
import type { MetricsSummary } from '@/features/reports/types';

/**
 * Tarjetas del resumen del día. Todas salen de /api/reports/metrics?period=day; las tarjetas
 * de "Pendientes" y "Usuarios" se retiraron porque hoy no existe un endpoint que las alimente
 * (se retomarán en VCP-93).
 */
export function DashboardStats({ summary }: { summary: MetricsSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
