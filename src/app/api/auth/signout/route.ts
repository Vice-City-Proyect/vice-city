import { NextRequest, NextResponse } from "next/server";
import { logoutService, LogoutService } from "@/features/auth/services/logout.service";

export interface SignoutRouteContext {
  params?: Promise<Record<string, string | string[]>>;
  serviceOverride?: LogoutService;
}

/**
 * Route Handler para POST /api/auth/signout y GET /api/auth/signout (Cookies: F1C)
 *
 * Atiende nativamente la solicitud de cierre de sesión enviada por NextAuth (signOut).
 * Garantiza la purga inmediata de todas las cookies de autenticación (JWT, CSRF, Callback).
 */
export async function POST(
  request: NextRequest,
  context?: SignoutRouteContext
) {
  try {
    const service: LogoutService =
      context?.serviceOverride && typeof context.serviceOverride.invalidateSession === "function"
        ? context.serviceOverride
        : logoutService;

    let callbackUrl = "/login";

    // Extraer callbackUrl si fue enviado en la petición
    const searchParamUrl = request.nextUrl.searchParams.get("callbackUrl");
    if (searchParamUrl) {
      callbackUrl = searchParamUrl;
    } else {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        try {
          const formData = await request.formData();
          const formCallback = formData.get("callbackUrl");
          if (typeof formCallback === "string" && formCallback.trim()) {
            callbackUrl = formCallback;
          }
        } catch {
          // Ignorar fallo al parsear formData
        }
      } else if (contentType.includes("application/json")) {
        try {
          const json = await request.json();
          if (json?.callbackUrl && typeof json.callbackUrl === "string") {
            callbackUrl = json.callbackUrl;
          }
        } catch {
          // Ignorar fallo al parsear JSON
        }
      }
    }

    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value ||
      null;

    const isSecure = request.nextUrl.protocol === "https:";

    const result = await service.invalidateSession(sessionToken, {
      redirectTo: callbackUrl,
      isSecure,
    });

    const response = NextResponse.json(
      {
        url: result.redirectTo,
        success: true,
        message: result.message,
        data: {
          loggedOut: true,
          redirectTo: result.redirectTo,
        },
      },
      { status: 200 }
    );

    return service.applyExpiredCookies(response, result.expiredCookies);
  } catch (error: unknown) {
    console.error("[API_AUTH_SIGNOUT_ERROR]", error);
    const fallbackResponse = NextResponse.json(
      {
        url: "/login",
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Error al procesar el cierre de sesión",
      },
      { status: 200 }
    );

    const expiredCookies = logoutService.generateExpiredCookies(
      request.nextUrl.protocol === "https:"
    );
    return logoutService.applyExpiredCookies(fallbackResponse, expiredCookies);
  }
}

export async function GET(
  request: NextRequest,
  context?: SignoutRouteContext
) {
  try {
    const service: LogoutService =
      context?.serviceOverride && typeof context.serviceOverride.invalidateSession === "function"
        ? context.serviceOverride
        : logoutService;

    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/login";
    const isSecure = request.nextUrl.protocol === "https:";

    const result = await service.invalidateSession(null, {
      redirectTo: callbackUrl,
      isSecure,
    });

    const redirectUrl = new URL(result.redirectTo, request.url);
    const response = NextResponse.redirect(redirectUrl);

    return service.applyExpiredCookies(response, result.expiredCookies);
  } catch (error: unknown) {
    console.error("[API_AUTH_SIGNOUT_GET_ERROR]", error);
    const redirectUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(redirectUrl);

    const expiredCookies = logoutService.generateExpiredCookies(
      request.nextUrl.protocol === "https:"
    );
    return logoutService.applyExpiredCookies(response, expiredCookies);
  }
}
