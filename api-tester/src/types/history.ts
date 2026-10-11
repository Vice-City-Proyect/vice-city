import { HttpMethod } from './openapi';

export type ErrorType = 'NETWORK_ERROR' | 'CORS_ERROR' | 'TIMEOUT' | 'UNKNOWN';

export interface HistoryItem {
  id: string;
  timestamp: string;
  method: HttpMethod;
  url: string;
  path: string;
  status?: number;
  statusText?: string;
  durationMs: number;
  success: boolean;
  request: {
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    pathParams: Record<string, string>;
    body?: any;
  };
  response?: {
    headers: Record<string, string>;
    data: any;
    sizeBytes: number;
  };
  error?: {
    message: string;
    type: ErrorType;
  };
}

