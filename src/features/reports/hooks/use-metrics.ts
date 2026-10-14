'use client';

import { useEffect, useState } from 'react';
import type { MetricsPeriod, MetricsResponseData } from '../types';
import { describeMetricsError } from '../utils/chart-data';

export interface MetricsState {
  data: MetricsResponseData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface MetricsResult {
  key: string;
  data: MetricsResponseData | null;
  error: string | null;
}

/**
 * Métricas de ventas y ocupación (GET /api/reports/metrics) para un período.
 * Mientras se consulta un período nuevo no se muestran datos del anterior, y si el backend falla
 * se expone un mensaje claro en vez de datos viejos o de ejemplo.
 */
export function useMetrics(period: MetricsPeriod): MetricsState {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<MetricsResult | null>(null);
  const requestKey = `${period}:${reloadKey}`;

  useEffect(() => {
    let active = true;

    async function load() {
      let status: number | null = null;
      try {
        const response = await fetch(`/api/reports/metrics?period=${period}`, { cache: 'no-store' });
        status = response.status;
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success || !json.data) {
          throw new Error(describeMetricsError(status));
        }
        if (active) setResult({ key: requestKey, data: json.data as MetricsResponseData, error: null });
      } catch (err: unknown) {
        if (!active) return;
        const message =
          err instanceof Error && status !== null ? err.message : describeMetricsError(null);
        setResult({ key: requestKey, data: null, error: message });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [period, requestKey]);

  const settled = result?.key === requestKey;

  return {
    data: settled ? result.data : null,
    loading: !settled,
    error: settled ? result.error : null,
    reload: () => setReloadKey((key) => key + 1),
  };
}
