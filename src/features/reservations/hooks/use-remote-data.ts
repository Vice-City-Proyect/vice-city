'use client';

import { useEffect, useRef, useState } from 'react';

export interface RemoteDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Result<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/**
 * Consulta un recurso del backend. Mientras se consulta (o se cambia de parámetros) no se
 * muestran datos anteriores y, si la consulta falla, `error` trae un mensaje claro en vez de
 * datos viejos o de ejemplo. `depsKey` identifica los parámetros de la consulta.
 */
export function useRemoteData<T>(
  load: () => Promise<T>,
  describeError: (error: unknown) => string,
  depsKey: string,
): RemoteDataState<T> {
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const requestKey = `${depsKey}:${reloadKey}`;

  // La última versión de las funciones se lee sin reiniciar la consulta en cada render.
  const loadRef = useRef(load);
  const describeRef = useRef(describeError);
  useEffect(() => {
    loadRef.current = load;
    describeRef.current = describeError;
  });

  useEffect(() => {
    let active = true;

    loadRef
      .current()
      .then((data) => {
        if (active) setResult({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (active) setResult({ key: requestKey, data: null, error: describeRef.current(err) });
      });

    return () => {
      active = false;
    };
  }, [requestKey]);

  const settled = result?.key === requestKey;

  return {
    data: settled ? result.data : null,
    loading: !settled,
    error: settled ? result.error : null,
    reload: () => setReloadKey((key) => key + 1),
  };
}
