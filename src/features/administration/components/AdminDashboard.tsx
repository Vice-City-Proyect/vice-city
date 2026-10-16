'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useMetrics } from '@/features/reports/hooks/use-metrics';
import { MetricsFallback } from '@/features/reports/components/MetricsFallback';
import { useAdminDashboardSummary } from '@/features/reservations/hooks/use-admin-dashboard-summary';
import { DashboardStats } from './DashboardStats';
import { OccupancyPanel } from './OccupancyPanel';
import { QuickActions } from './QuickActions';
import { RevenuePanel } from './RevenuePanel';
import { UpcomingReservations } from './UpcomingReservations';

/**
 * Cuerpo del dashboard del administrador: métricas del día (ventas y ocupación) y resumen de
 * reservas (pendientes, usuarios y próximas reservas). Cada consulta falla por separado.
 */
export function AdminDashboard() {
  const metrics = useMetrics('day');
  const summary = useAdminDashboardSummary();
  const data = metrics.data;

  return (
    <div className="flex flex-col gap-6">
      <MetricsFallback loading={metrics.loading} error={metrics.error} onRetry={metrics.reload} />

      {data && (
        <DashboardStats
          summary={data.summary}
          pendingReservations={summary.data?.pendingReservations}
          activeUsers={summary.data?.activeUsers}
        />
      )}

      {summary.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="font-bold">{summary.error}</span>
            <button
              type="button"
              onClick={summary.reload}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-400/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-red-500/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">{data && <OccupancyPanel items={data.occupancyByService} />}</div>
        <QuickActions />
      </div>

      {summary.loading && (
        <div className="flex items-center gap-3 text-text-muted" role="status">
          <RefreshCw className="h-5 w-5 animate-spin text-club-primary" />
          <span className="text-xs font-bold uppercase tracking-wider">Cargando reservas...</span>
        </div>
      )}
      {summary.data && <UpcomingReservations reservations={summary.data.upcomingReservations} />}

      <RevenuePanel />
    </div>
  );
}
