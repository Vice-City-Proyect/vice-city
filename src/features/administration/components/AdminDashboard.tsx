'use client';

import { useMetrics } from '@/features/reports/hooks/use-metrics';
import { MetricsFallback } from '@/features/reports/components/MetricsFallback';
import { DashboardStats } from './DashboardStats';
import { OccupancyPanel } from './OccupancyPanel';
import { QuickActions } from './QuickActions';
import { RevenuePanel } from './RevenuePanel';

/** Cuerpo del dashboard del administrador: una sola consulta de métricas del día. */
export function AdminDashboard() {
  const metrics = useMetrics('day');
  const data = metrics.data;

  return (
    <div className="flex flex-col gap-6">
      <MetricsFallback loading={metrics.loading} error={metrics.error} onRetry={metrics.reload} />

      {data && <DashboardStats summary={data.summary} />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">{data && <OccupancyPanel items={data.occupancyByService} />}</div>
        <QuickActions />
      </div>

      <RevenuePanel />
    </div>
  );
}
