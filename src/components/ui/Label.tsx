import type { LabelHTMLAttributes, ReactNode } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label className={`block text-sm font-semibold text-text-main mb-1.5 ${className}`} {...props}>
      {children}
    </label>
  );
}
