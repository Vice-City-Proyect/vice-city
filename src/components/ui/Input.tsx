import type { InputHTMLAttributes } from 'react';

const BASE =
  'w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none bg-club-surface placeholder:text-text-muted/60 disabled:opacity-50 disabled:cursor-not-allowed';

const STATES = {
  default: 'border-[#b0bf3f]/60 focus:border-[#b0bf3f] focus:ring-2 focus:ring-[#b0bf3f]/25',
  error: 'border-red-400 focus:ring-2 focus:ring-red-300',
} as const;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  className?: string;
}

export function Input({ error = false, className = '', ...props }: InputProps) {
  return (
    <input
      aria-invalid={error}
      className={`${BASE} ${error ? STATES.error : STATES.default} ${className}`}
      {...props}
    />
  );
}
