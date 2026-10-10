/**
 * Servicio de Lógica de Negocio: Cierre de Sesión (HU06-B LN)
 * Vice City - Features: Auth
 *
 * Criterios de Aceptación:
 * 1. La sesión y las cookies quedan eliminadas.
 * 2. Caso de error: un token ya vencido no genera error al cerrar sesión (idempotente).
 * 3. Caso límite: cerrar sesión en varias pestañas deja todas sin acceso.
 *
 * Con arquitectura JWT sin estado (stateless), no se requiere persistencia en BD (sin ORM),
 * ya que la invalidación consiste en limpiar las cookies de sesión en el cliente
 * y destruir el contexto de sesión en el servidor.
 */

import { NextResponse } from "next/server";

/**
 * Nombres oficiales de las cookies de sesión y tokens de NextAuth v4 en HTTP y HTTPS.
 */
export const AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.pkce.code_verifier",
] as const;

export interface ExpiredCookieDescriptor {
  name: string;
  value: string;
  options: {
    path: string;
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none";
    secure: boolean;
  };
}

export interface InvalidateSessionOptions {
  redirectTo?: string;
  isSecure?: boolean;
}

export interface LogoutResult {
  success: boolean;
  message: string;
  redirectTo: string;
  expiredCookies: ExpiredCookieDescriptor[];
}

export class LogoutService {
  /**
   * Genera los descriptores de cookies expiradas (Max-Age=0, Expires=1970)
   * para eliminar cualquier rastro de la sesión en el cliente.
   */
  generateExpiredCookies(isSecure = false): ExpiredCookieDescriptor[] {
    const epochDate = new Date(0); // 1 de enero de 1970 00:00:00 GMT

    return AUTH_COOKIE_NAMES.map((cookieName) => ({
      name: cookieName,
      value: "",
      options: {
        path: "/",
        expires: epochDate,
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure || cookieName.startsWith("__"),
      },
    }));
  }

  /**
   * Invalida la sesión del usuario de forma segura e idempotente.
   *
   * Cumple con:
   * - Criterio 1: Genera la eliminación de sesión y cookies.
   * - Criterio 2 (Caso de error): Si el token ya venció o no hay sesión activa,
   *   no lanza excepción y completa el proceso limpiamente.
   * - Criterio 3 (Caso límite): Al enviar la orden de expiración de cookies,
   *   todas las pestañas del navegador pierden sus credenciales compartidas.
   *
   * @param token Token JWT opcional (válido, expirado o nulo)
   * @param options Opciones de redirección y seguridad
   * @returns LogoutResult con el estado y las cookies a expirar
   */
  async invalidateSession(
    token?: string | null,
    options: InvalidateSessionOptions = {}
  ): Promise<LogoutResult> {
    const redirectTo = options.redirectTo || "/login";
    const expiredCookies = this.generateExpiredCookies(options.isSecure ?? false);

    // Si el token es provisto pero está expirado o malformado,
    // la operación no falla; es una invalidación segura e idempotente.
    if (token) {
      try {
        // En JWT no se muta base de datos; la expiración del cookie es definitiva.
        const isMalformedOrExpired = this.isTokenExpiredSafe(token);
        if (isMalformedOrExpired) {
          // Operación idempotente: limpiar cookies sin lanzar error
          return {
            success: true,
            message: "La sesión ya se encontraba vencida y fue purgada correctamente.",
            redirectTo,
            expiredCookies,
          };
        }
      } catch {
        // Fallback seguro: no lanzar error ante fallos de decodificación
      }
    }

    return {
      success: true,
      message: "Sesión cerrada exitosamente.",
      redirectTo,
      expiredCookies,
    };
  }

  /**
   * Aplica los encabezados Set-Cookie de expiración sobre una respuesta de Next.js.
   */
  applyExpiredCookies(
    response: NextResponse,
    expiredCookies: ExpiredCookieDescriptor[]
  ): NextResponse {
    for (const cookie of expiredCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  }

  /**
   * Chequeo seguro y defensivo para verificar si un token JWT plano ya expiró,
   * sin lanzar excepciones si es inválido.
   */
  private isTokenExpiredSafe(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return false;
      const payloadBase64 = parts[1];
      const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const payload = JSON.parse(payloadJson);
      if (typeof payload.exp === "number") {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        return payload.exp < nowInSeconds;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const logoutService = new LogoutService();

