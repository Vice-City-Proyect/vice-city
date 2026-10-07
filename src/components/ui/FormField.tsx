import type { ReactNode } from 'react';
import { Label } from './Label';

interface FormFieldProps {
  htmlFor: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ htmlFor, label, error, className = '', children }: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-1.5 text-xs text-red-500 font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
}
