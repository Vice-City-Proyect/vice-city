import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware global de protección de rutas y control de acceso (RBAC) (HU06-B y VCP-21)
 *
 * Criterio de Aceptación HU06:
 * - Caso límite: Después de cerrar sesión, las cookies quedan eliminadas y
 *   las rutas protegidas (/client/*, /admin/*, /employee/*) ya no son accesibles,
 *   redirigiendo inmediatamente a /login.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que requieren sesión activa obligatoria
  const isProtectedPath =
    pathname.startsWith("/client") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/employee");

  if (isProtectedPath) {
    // Detección de token de sesión en cookies de NextAuth
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken || !sessionToken.trim()) {
      // Redirigir al login si no hay sesión activa o las cookies fueron eliminadas
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto archivos estáticos, api pública y assets de Next
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
