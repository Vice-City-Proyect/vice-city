import type { HTMLAttributes, ReactNode } from 'react';

const TONES = {
  light: 'bg-club-surface text-text-main',
  dark: 'bg-club-accent text-white',
} as const;

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: keyof typeof TONES;
  children: ReactNode;
}

export function Card({ tone = 'light', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-3xl border border-text-main/10 shadow-xs ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}