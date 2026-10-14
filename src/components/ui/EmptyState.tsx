import type { ReactNode } from 'react';
import { CalendarX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-text-main/15 bg-club-surface/60 px-6 py-12 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-club-bg text-text-muted">
        {icon ?? <CalendarX className="h-5 w-5" />}
      </span>
      <p className="text-sm font-bold uppercase tracking-wider text-text-main">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
