import type { ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon, hint, className = '' }: StatCardProps) {
  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            {label}
          </span>
          <span className="text-2xl font-black leading-none tracking-tight text-club-accent sm:text-3xl">
            {value}
          </span>
          {hint && <span className="text-xs leading-snug text-text-muted">{hint}</span>}
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-club-bg text-club-accent">
          {icon}
        </span>
      </div>
    </Card>
  );
}
