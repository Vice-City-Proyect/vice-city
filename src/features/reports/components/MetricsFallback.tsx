'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MetricsFallbackProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  className?: string;
}

/** Estado de carga o de error de las métricas; no renderiza nada cuando ya hay datos. */
export function MetricsFallback({ loading, error, onRetry, className = '' }: MetricsFallbackProps) {
  if (loading) {
    return (
      <div
        role="status"
        className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-club-accent" />
        <p className="text-sm font-semibold text-text-muted">Cargando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center ${className}`}
      >
        <AlertCircle className="h-9 w-9 text-red-500" />
        <h2 className="text-base font-bold text-red-600 dark:text-red-400">
          No se pudieron cargar las métricas
        </h2>
        <p className="max-w-md text-sm text-text-muted">{error}</p>
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  return null;
}
