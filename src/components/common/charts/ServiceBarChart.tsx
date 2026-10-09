'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCOPShort } from '@/lib/format';
import { AXIS_TICK, CHART_COLORS, ChartTooltip } from './chart-utils';
import type { ChartPoint } from './RevenueChart';

interface ServiceBarChartProps {
  data: ChartPoint[];
  height?: number;
  currency?: boolean;
}

export function ServiceBarChart({ data, height = 280, currency = false }: ServiceBarChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={CHART_COLORS.grid} strokeOpacity={0.08} horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={currency ? formatCOPShort : undefined}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-club-bg)' }}
            content={<ChartTooltip currency={currency} />}
          />
          <Bar
            dataKey="value"
            name={currency ? 'Ingresos' : 'Reservas'}
            fill={CHART_COLORS.blue}
            radius={[0, 6, 6, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
