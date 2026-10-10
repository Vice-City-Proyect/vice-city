import { NextRequest, NextResponse } from "next/server";
import { logoutService, LogoutService } from "@/features/auth/services/logout.service";

/**
 * Endpoint POST /api/auth/logout (HU06-B API)
 *
 * Realiza el cierre de sesión invalidando y expirando todas las cookies de sesión (JWT)
 * tanto para HTTP como HTTPS, delegando en la capa de lógica de negocio (logoutService).
 *
 * Criterios de Aceptación:
 * - Criterio 1: Cerrar sesión elimina la sesión y redirige al login.
 * - Criterio 2 (Caso de error): Cerrar sesión sin una sesión activa no produce error (200 OK).
 * - Criterio 3 (Caso límite): Después de cerrar sesión, las cookies quedan eliminadas (Max-Age=0)
 *   y las rutas protegidas dejan de ser accesibles.
 */
export async function POST(
  request: NextRequest,
  contextOrService?: any,
  serviceOverride?: LogoutService
) {
  try {
    const service =
      serviceOverride ??
      (contextOrService && typeof contextOrService === "object" && "invalidateSession" in contextOrService
        ? (contextOrService as LogoutService)
        : logoutService);

    // Obtener token opcional de los headers de cookies o Authorization
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value ||
      null;

    const isSecure = request.nextUrl.protocol === "https:";

    // 1. Delegar en la lógica de negocio (HU06-B LN)
    const result = await service.invalidateSession(sessionToken, {
      redirectTo: "/login",
      isSecure,
    });

    // 2. Construir respuesta estándar de Vice City
    const response = NextResponse.json(
      {
        success: true,
        message: result.message,
        data: {
          loggedOut: true,
          redirectTo: result.redirectTo,
        },
      },
      { status: 200 }
    );

    // 3. Aplicar encabezados Set-Cookie de expiración inmediata
    return service.applyExpiredCookies(response, result.expiredCookies);
  } catch (error: unknown) {
    console.error("[API_AUTH_LOGOUT_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error inesperado al procesar el cierre de sesión",
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint GET /api/auth/logout (HU06-B API)
 * Permite navegaciones directas o redirecciones limpiando cookies y enviando 302/307 hacia /login.
 */
export async function GET(
  request: NextRequest,
  contextOrService?: any,
  serviceOverride?: LogoutService
) {
  try {
    const service =
      serviceOverride ??
      (contextOrService && typeof contextOrService === "object" && "invalidateSession" in contextOrService
        ? (contextOrService as LogoutService)
        : logoutService);
    const isSecure = request.nextUrl.protocol === "https:";

    const result = await service.invalidateSession(null, {
      redirectTo: "/login",
      isSecure,
    });

    // Redirección hacia /login según el criterio de aceptación
    const redirectUrl = new URL(result.redirectTo, request.url);
    const response = NextResponse.redirect(redirectUrl);

    return service.applyExpiredCookies(response, result.expiredCookies);
  } catch (error: unknown) {
    console.error("[API_AUTH_LOGOUT_GET_ERROR]", error);
    const fallbackRedirect = new URL("/login", request.url);
    return NextResponse.redirect(fallbackRedirect);
  }
}

