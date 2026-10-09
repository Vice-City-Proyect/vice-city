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
import {
  MOCK_REVENUE,
  MOCK_REVENUE_DISTRIBUTION,
  MOCK_REVENUE_SUMMARY,
  MOCK_RESERVATIONS_BY_SERVICE,
  REVENUE_PERIODS,
  type RevenuePeriod,
} from '@/features/reports/data/mock-revenue';

export default function AdminRevenuePage() {
  const [period, setPeriod] = useState<RevenuePeriod>('month');

  const summary = MOCK_REVENUE_SUMMARY;

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

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Ingresos totales"
            value={formatCOP(summary.totalRevenue)}
            icon={<Wallet className="h-5 w-5" />}
          />
          <StatCard
            label="Reservas totales"
            value={summary.totalReservations}
            icon={<CalendarCheck className="h-5 w-5" />}
          />
          <StatCard
            label="Servicio top"
            value={summary.topService}
            icon={<Crown className="h-5 w-5" />}
            hint="Mayor facturación"
          />
          <StatCard
            label="Día top"
            value={summary.topDay}
            icon={<CalendarDays className="h-5 w-5" />}
            hint="Mayor volumen de ventas"
          />
          <StatCard
            label="Ocupación promedio"
            value={`${summary.averageOccupancy}%`}
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
                Facturación registrada por {REVENUE_PERIODS.find((p) => p.value === period)?.label.toLowerCase()}.
              </p>
            </div>
          </div>
          <RevenueChart data={MOCK_REVENUE[period]} height={300} />
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                Reservas por <span className="text-club-primary">servicio</span>
              </h2>
              <p className="text-xs text-text-muted">Comparativo de reservas por instalación.</p>
            </div>
            <ServiceBarChart data={MOCK_RESERVATIONS_BY_SERVICE} height={300} />
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
            <DistributionDonut data={MOCK_REVENUE_DISTRIBUTION} height={300} />
          </Card>
        </div>
      </div>
    </>
  );
}
