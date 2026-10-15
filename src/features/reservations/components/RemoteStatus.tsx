'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RemoteStatusProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  loadingLabel?: string;
}

/**
 * Estado de carga o de error de una consulta al backend. No renderiza nada cuando ya hay datos,
 * para que la pantalla nunca muestre información vieja o de ejemplo mientras tanto.
 */
export function RemoteStatus({
  loading,
  error,
  onRetry,
  loadingLabel = 'Cargando...',
}: RemoteStatusProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 text-text-muted" role="status">
        <RefreshCw className="h-5 w-5 animate-spin text-club-primary" />
        <span className="text-xs font-bold uppercase tracking-wider">{loadingLabel}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <span className="font-bold">{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-400/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-red-500/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return null;
}
