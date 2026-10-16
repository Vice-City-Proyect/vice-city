'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { RevenueChart } from '@/components/common/charts/RevenueChart';
import { REVENUE_PERIODS, type RevenuePeriod } from '@/features/reports/constants';
import { useMetrics } from '@/features/reports/hooks/use-metrics';
import { MetricsFallback } from '@/features/reports/components/MetricsFallback';

export function RevenuePanel() {
  const [period, setPeriod] = useState<RevenuePeriod>('week');
  const metrics = useMetrics(period);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
            Ingresos <span className="text-club-primary">del complejo</span>
          </h2>
          <p className="text-xs text-text-muted">Comportamiento de ventas por periodo.</p>
        </div>

        <SegmentedTabs
          ariaLabel="Periodo de ingresos"
          options={REVENUE_PERIODS.map((option) => ({ ...option }))}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <MetricsFallback loading={metrics.loading} error={metrics.error} onRetry={metrics.reload} />

      {metrics.data && (
        <RevenueChart
          data={metrics.data.revenueFlow.map((point) => ({ label: point.label, value: point.value }))}
        />
      )}
    </Card>
  );
}
