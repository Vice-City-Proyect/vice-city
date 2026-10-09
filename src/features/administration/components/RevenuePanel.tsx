'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { RevenueChart } from '@/components/common/charts/RevenueChart';
import {
  MOCK_REVENUE,
  REVENUE_PERIODS,
  type RevenuePeriod,
} from '@/features/reports/data/mock-revenue';

export function RevenuePanel() {
  const [period, setPeriod] = useState<RevenuePeriod>('week');

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

      <RevenueChart data={MOCK_REVENUE[period]} />
    </Card>
  );
}
