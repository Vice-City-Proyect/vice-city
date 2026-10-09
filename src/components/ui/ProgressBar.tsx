interface ProgressBarProps {
  value: number;
  label?: string;
  detail?: string;
  showValue?: boolean;
  className?: string;
}

function toneFor(value: number): string {
  if (value >= 90) return 'bg-red-500';
  if (value >= 70) return 'bg-brand-yellow';
  return 'bg-club-primary';
}

export function ProgressBar({
  value,
  label,
  detail,
  showValue = true,
  className = '',
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <span className="truncate text-xs font-bold uppercase tracking-wider text-text-main">
              {label}
            </span>
          )}
          {showValue && (
            <span className="shrink-0 text-xs font-bold text-text-muted">{safeValue}%</span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full bg-club-bg"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${toneFor(safeValue)}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>

      {detail && <span className="text-[11px] leading-snug text-text-muted">{detail}</span>}
    </div>
  );
}
