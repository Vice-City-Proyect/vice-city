'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCOP } from '@/lib/format';
import { CHART_COLORS, ChartTooltip } from './chart-utils';

export interface DistributionPoint {
  label: string;
  value: number;
}

const SLICE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.blue,
  CHART_COLORS.yellow,
  CHART_COLORS.accent,
  CHART_COLORS.muted,
];

interface DistributionDonutProps {
  data: DistributionPoint[];
  height?: number;
  currency?: boolean;
}

export function DistributionDonut({
  data,
  height = 280,
  currency = true,
}: DistributionDonutProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-main">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <p className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-text-muted">
        Total: {formatCOP(total)}
      </p>
    </div>
  );
}
