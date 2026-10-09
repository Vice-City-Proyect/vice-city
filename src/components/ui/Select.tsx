import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

const BASE =
  'w-full appearance-none rounded-xl border bg-club-surface px-4 py-3 pr-10 text-sm text-text-main transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed';

const STATES = {
  default: 'border-club-primary/60 focus:border-club-primary focus:ring-2 focus:ring-club-primary/25',
  error: 'border-red-400 focus:ring-2 focus:ring-red-300',
} as const;

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  className?: string;
}

export function Select({ error = false, className = '', ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={error}
        className={`${BASE} ${error ? STATES.error : STATES.default} ${className}`}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}
