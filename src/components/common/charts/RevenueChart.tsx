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

export interface ChartPoint {
  label: string;
  value: number;
}

interface RevenueChartProps {
  data: ChartPoint[];
  height?: number;
}

export function RevenueChart({ data, height = 260 }: RevenueChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={formatCOPShort}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-club-bg)' }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="value"
            name="Ingresos"
            fill={CHART_COLORS.primary}
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
