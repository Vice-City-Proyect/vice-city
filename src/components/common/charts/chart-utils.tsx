import { formatCOP } from '@/lib/format';

export const CHART_COLORS = {
  primary: 'var(--color-club-primary)',
  accent: 'var(--color-club-accent)',
  blue: 'var(--color-brand-blue)',
  yellow: 'var(--color-brand-yellow)',
  muted: 'var(--color-text-muted)',
  grid: 'var(--color-text-main)',
} as const;

/** Estado vacío de una gráfica: un período sin datos se muestra así, no como una gráfica rota. */
export function ChartEmpty({ height }: { height: number }) {
  return (
    <div
      role="status"
      style={{ height }}
      className="flex w-full items-center justify-center rounded-xl border border-dashed border-text-main/15 px-4 text-center text-xs font-semibold text-text-muted"
    >
      Sin datos en este período
    </div>
  );
}

export const AXIS_TICK = {
  fill: 'var(--color-text-muted)',
  fontSize: 11,
} as const;

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  currency?: boolean;
}

export function ChartTooltip({ active, payload, label, currency = true }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-text-main/10 bg-club-surface px-3 py-2 shadow-md">
      {label !== undefined && (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          {label}
        </p>
      )}
      {payload.map((entry, index) => (
        <p key={`${String(entry.dataKey)}-${index}`} className="text-xs font-bold text-text-main">
          {entry.name && <span className="text-text-muted">{entry.name}: </span>}
          {currency && typeof entry.value === 'number' ? formatCOP(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}
