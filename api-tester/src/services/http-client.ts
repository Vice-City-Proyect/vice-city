import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { HttpMethod } from '../types/openapi';
import { AuthState } from '../types/auth';
import { HistoryItem, ErrorType } from '../types/history';

export interface ExecuteRequestOptions {
  baseUrl: string;
  method: HttpMethod;
  path: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  auth: AuthState;
  timeoutMs: number;
}

export interface ExecutionResult {
  success: boolean;
  status?: number;
  statusText?: string;
  durationMs: number;
  headers: Record<string, string>;
  data: any;
  sizeBytes: number;
  url: string;
  error?: {
    message: string;
    type: ErrorType;
    details?: string;
  };
}

/**
 * Reemplaza los parámetros de ruta en la URL (ej: /api/admin/users/{id} -> /api/admin/users/123)
 */
export function buildInterpolatedPath(
  pathTemplate: string,
  pathParams: Record<string, string>
): string {
  let resolved = pathTemplate;
  for (const [key, val] of Object.entries(pathParams)) {
    if (val !== undefined && val !== null && val.trim() !== '') {
      resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(val.trim()));
    }
  }
  return resolved;
}

/**
 * Construye la URL completa validada
 */
export function buildFullUrl(
  baseUrl: string,
  path: string,
  queryParams: Record<string, string>
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${cleanBase}${cleanPath}`);

  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null && v.trim() !== '') {
      url.searchParams.set(k.trim(), v.trim());
    }
  }

  return url.toString();
}

/**
 * Ejecuta una petición HTTP real contra el backend del desarrollador
 */
export async function executeHttpRequest(
  options: ExecuteRequestOptions
): Promise<ExecutionResult> {
  const {
    baseUrl,
    method,
    path,
    pathParams,
    queryParams,
    headers: rawHeaders,
    body,
    auth,
    timeoutMs,
  } = options;

  const interpolatedPath = buildInterpolatedPath(path, pathParams);
  const fullUrl = buildFullUrl(baseUrl, interpolatedPath, queryParams);

  // Construir cabeceras HTTP incluyendo la configuración de autenticación
  const requestHeaders: Record<string, string> = { ...rawHeaders };

  if (auth.mode === 'bearer' && auth.bearerToken.trim()) {
    requestHeaders['Authorization'] = `Bearer ${auth.bearerToken.trim()}`;
  } else if (auth.mode === 'mock-role') {
    requestHeaders['x-mock-role'] = auth.mockRole;
    if (auth.mockUserId) {
      requestHeaders['x-mock-user-id'] = auth.mockUserId;
    }
  }

  // Cabeceras personalizadas
  if (auth.customHeaders && auth.customHeaders.length > 0) {
    for (const ch of auth.customHeaders) {
      if (ch.enabled && ch.key.trim()) {
        requestHeaders[ch.key.trim()] = ch.value;
      }
    }
  }

  const startTime = performance.now();

  const config: AxiosRequestConfig = {
    method,
    url: fullUrl,
    headers: requestHeaders,
    timeout: timeoutMs || 15000,
    withCredentials: auth.mode === 'cookie',
    validateStatus: () => true, // Captura todos los códigos HTTP reales (200, 400, 401, 403, 500...)
  };

  if (body !== undefined && body !== null && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    config.data = body;
    if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }
  }

  try {
    const response: AxiosResponse = await axios(config);
    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    const stringData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');
    const sizeBytes = new Blob([stringData]).size;

    const responseHeaders: Record<string, string> = {};
    if (response.headers) {
      for (const [k, v] of Object.entries(response.headers)) {
        responseHeaders[k] = String(v);
      }
    }

    const isOk = response.status >= 200 && response.status < 400;

    return {
      success: isOk,
      status: response.status,
      statusText: response.statusText || (isOk ? 'OK' : 'Error'),
      durationMs,
      headers: responseHeaders,
      data: response.data,
      sizeBytes,
      url: fullUrl,
    };
  } catch (rawError: any) {
    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    let errorType: ErrorType = 'UNKNOWN';
    let errorMessage = rawError.message || 'Error desconocido al ejecutar la petición';
    let details = '';

    if (rawError.code === 'ECONNABORTED' || rawError.message?.includes('timeout')) {
      errorType = 'TIMEOUT';
      errorMessage = `Tiempo de espera agotado (${timeoutMs}ms). El backend tardó demasiado en responder.`;
      details = 'Verifica si el backend está congelado o si hay una consulta bloqueante.';
    } else if (rawError.code === 'ERR_NETWORK' || rawError.message === 'Network Error') {
      errorType = 'NETWORK_ERROR';
      errorMessage = `No se pudo conectar con el servidor en ${baseUrl}.`;
      details =
        'Comprueba que el backend de Vice City esté ejecutándose localmente (ej: npm run dev en puerto 3000) y que admita peticiones desde el navegador (CORS).';
    }

    return {
      success: false,
      durationMs,
      headers: {},
      data: null,
      sizeBytes: 0,
      url: fullUrl,
      error: {
        message: errorMessage,
        type: errorType,
        details,
      },
    };
  }
}
