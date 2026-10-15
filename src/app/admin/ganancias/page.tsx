'use client';

import { useState } from 'react';
import { CalendarCheck, Crown, CalendarDays, Percent, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StatCard } from '@/components/ui/StatCard';
import { RevenueChart } from '@/components/common/charts/RevenueChart';
import { ServiceBarChart } from '@/components/common/charts/ServiceBarChart';
import { DistributionDonut } from '@/components/common/charts/DistributionDonut';
import { formatCOP } from '@/lib/format';
import { REVENUE_PERIODS, type RevenuePeriod } from '@/features/reports/constants';
import { useMetrics } from '@/features/reports/hooks/use-metrics';
import { MetricsFallback } from '@/features/reports/components/MetricsFallback';

export default function AdminRevenuePage() {
  const [period, setPeriod] = useState<RevenuePeriod>('month');
  const metrics = useMetrics(period);
  const data = metrics.data;

  return (
    <>
      <PageHeader
        eyebrow="Analítica"
        title="Ingresos y"
        highlightedTitle="métricas"
        description="Comportamiento de ventas, reservas por servicio y distribución de ingresos."
        actions={
          <SegmentedTabs
            ariaLabel="Filtro de periodo"
            options={REVENUE_PERIODS.map((option) => ({ ...option }))}
            value={period}
            onChange={setPeriod}
          />
        }
      />

      <MetricsFallback loading={metrics.loading} error={metrics.error} onRetry={metrics.reload} />

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Ingresos totales"
              value={formatCOP(data.summary.totalRevenue)}
              icon={<Wallet className="h-5 w-5" />}
              hint={`Web ${formatCOP(data.summary.webRevenue)} · POS ${formatCOP(data.summary.posRevenue)}`}
            />
            <StatCard
              label="Reservas totales"
              value={data.summary.totalReservations}
              icon={<CalendarCheck className="h-5 w-5" />}
              hint={`Web ${data.summary.webReservations} · POS ${data.summary.posReservations}`}
            />
            <StatCard
              label="Servicio top"
              value={data.summary.topService}
              icon={<Crown className="h-5 w-5" />}
              hint="Mayor facturación"
            />
            <StatCard
              label="Día top"
              value={data.summary.topDay}
              icon={<CalendarDays className="h-5 w-5" />}
              hint="Mayor volumen de ventas"
            />
            <StatCard
              label="Ocupación promedio"
              value={`${data.summary.averageOccupancy}%`}
              icon={<Percent className="h-5 w-5" />}
            />
          </div>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                  Comportamiento de <span className="text-club-primary">ingresos</span>
                </h2>
                <p className="text-xs text-text-muted">
                  Facturación registrada · {data.range.label}.
                </p>
              </div>
            </div>
            <RevenueChart
              data={data.revenueFlow.map((point) => ({ label: point.label, value: point.value }))}
              height={300}
            />
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                  Reservas por <span className="text-club-primary">servicio</span>
                </h2>
                <p className="text-xs text-text-muted">Comparativo de reservas por instalación.</p>
              </div>
              <ServiceBarChart data={data.reservationsByService} height={300} />
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                  Distribución de <span className="text-club-primary">ingresos</span>
                </h2>
                <p className="text-xs text-text-muted">
                  Participación de cada servicio en la facturación total.
                </p>
              </div>
              <DistributionDonut data={data.revenueDistribution} height={300} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
