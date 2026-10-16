/**
 * Cliente HTTP compartido para consumir los Route Handlers del backend.
 *
 * Normaliza el manejo de:
 * - Envoltura estándar de respuesta `{ success, data, message, error }`.
 * - Errores HTTP (401, 403, 404, 400, 500) y errores de red.
 *
 * No contiene lógica de negocio: la autoridad de precios, aforos, permisos y
 * reglas de reserva permanece en el backend.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance !== null &&
      typeof instance === "object" &&
      (instance instanceof Error || "message" in instance) &&
      typeof (instance as any).status === "number"
    );
  }
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
}

/**
 * Ejecuta una petición HTTP y devuelve el campo `data` de la respuesta.
 *
 * @throws {ApiError} si la red falla o el servidor responde con error.
 */
export async function apiRequest<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const hasBody = init.body !== undefined && init.body !== null;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica tu conexión.",
      0,
      "NETWORK_ERROR"
    );
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.message ||
      payload?.error ||
      `Error ${response.status} al procesar la solicitud`;
    throw new ApiError(message, response.status, payload?.error);
  }

  // Respuesta exitosa con cuerpo no-JSON: contrato inválido, no usar `null` con
  // la forma del tipo (evita que el consumidor reciba un resultado inválido).
  if (payload === null) {
    throw new ApiError(
      `Respuesta inválida del servidor (${response.status}): el cuerpo no es JSON`,
      response.status,
      "INVALID_RESPONSE"
    );
  }

  if ("data" in payload) {
    return payload.data as T;
  }

  return payload as unknown as T;
}

/**
 * Devuelve un mensaje legible a partir de un error desconocido.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado.";
}
