import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  isPublicRoute,
  isRouteAllowed,
  getAllowedRolesForRoute,
  normalizeRole,
} from "@/features/auth/permissions/route-permissions";
import { allowsMockAuthHeaders } from "@/features/auth/mock-auth";
import {
  DASHBOARD_BY_ROLE,
  GUEST_ONLY_ROUTE,
} from "@/features/auth/utils/role-home";

function getMiddlewareSecret(): string {
  let secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
      secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
    } catch {
      // Si .env no existe, continuar con la validación estricta
    }
  }
  if (!secret) {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.npm_lifecycle_event === "test"
    ) {
      return "vice-city-unit-tests-isolated-secret-key-32chars";
    }
    throw new Error(
      "Configuración de seguridad faltante: NEXTAUTH_SECRET (o JWT_SECRET) no está definida en las variables de entorno."
    );
  }
  return secret;
}

/**
 * Middleware de Next.js para Protección de Rutas y Permisos (HU08-B API)
 *
 * Criterios de Aceptación:
 * 1. Usuario sin sesión es redirigido al login (o 401 en API).
 * 2. Cada rol solo accede a sus rutas autorizadas (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR).
 * 3. Caso de error: Un rol sin permiso no accede (403 en API o redirección a /unauthorized).
 * 4. Caso límite: Un token vencido o manipulado se trata como sin sesión.
 * 5. Protege /admin, /client, /employee/pos, vista de escáner QR y endpoints API.
 */
export async function middleware(
  request: NextRequest,
  tokenOverride?: Record<string, unknown> | null
) {
  // Next.js invoca middleware(request, event): el 2.º argumento es su NextFetchEvent, no un token.
  // Sin este descarte se tomaba el evento como "token ya resuelto" (sin rol) y toda ruta
  // protegida respondía 403 incluso con sesión válida. Solo se acepta un override inyectado (pruebas).
  let resolvedOverride: Record<string, unknown> | null | undefined = tokenOverride;
  if (
    tokenOverride &&
    typeof tokenOverride === "object" &&
    "waitUntil" in tokenOverride &&
    typeof (tokenOverride as { waitUntil?: unknown }).waitUntil === "function"
  ) {
    resolvedOverride = undefined;
  }

  // Por seguridad, en entorno de producción no se aceptan tokens arbitrarios como argumento
  if (
    process.env.NODE_ENV === "production" &&
    resolvedOverride !== undefined
  ) {
    resolvedOverride = undefined;
  }

  const { pathname } = request.nextUrl;

  // 1. Ignorar assets estáticos de Next.js, imágenes y favicons
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1b. /login y /register no se muestran con sesión activa (VCP-104): se redirige a la
  // pantalla del rol. Solo cuenta un token real y vigente (nunca x-mock-role); un token
  // vencido, manipulado o sin rol válido se trata como sin sesión y deja ver el login.
  if (GUEST_ONLY_ROUTE.test(pathname)) {
    let sessionToken: Record<string, unknown> | null = resolvedOverride ?? null;
    if (resolvedOverride === undefined) {
      try {
        sessionToken = await getToken({
          req: request,
          secret: getMiddlewareSecret(),
        });
      } catch {
        sessionToken = null;
      }
    }
    const role = normalizeRole(sessionToken?.role as string | undefined);
    if (role) {
      return NextResponse.redirect(
        new URL(DASHBOARD_BY_ROLE[role] ?? "/", request.url)
      );
    }
    return NextResponse.next();
  }

  // 2. Si la ruta es pública, permitir el acceso sin consultar sesión
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 3. Obtener el token de sesión validando firma y vigencia (NextAuth JWT)
  let token: Record<string, unknown> | null = resolvedOverride ?? null;

  if (resolvedOverride === undefined) {
    // Cabecera de simulación de rol: proviene del cliente y es falsificable,
    // por lo que solo se acepta si el flag ENABLE_MOCK_AUTH_HEADERS está
    // explícitamente activo (pruebas y api-tester). Deshabilitado por defecto.
    const mockRole = allowsMockAuthHeaders()
      ? request.headers.get("x-mock-role")
      : null;
    if (mockRole) {
      token = { role: mockRole, id: "mock-user-id" };
    } else {
      try {
        token = await getToken({
          req: request,
          secret: getMiddlewareSecret(),
        });
      } catch {
        // Criterio límite: Token manipulado o corrupto genera null (sin sesión)
        token = null;
      }
    }
  }

  const isApiRoute = pathname.startsWith("/api/");

  // 4. Criterio 1: Usuario sin sesión activa (o token vencido / manipulado)
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Se requiere una sesión activa para acceder a este recurso",
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Criterio 2: Verificar permisos por rol con la matriz de negocio (HU08-B LN)
  const userRole = normalizeRole(token.role as string);
  const isAllowed = isRouteAllowed(userRole, pathname);

  // 6. Criterio 3 (Caso de error): Rol sin permiso
  if (!isAllowed) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "Acceso denegado: tu rol no tiene permisos para acceder a esta ruta",
          requiredRoles: getAllowedRolesForRoute(pathname),
        },
        { status: 403 }
      );
    }

    const unauthorizedUrl = new URL("/unauthorized", request.url);
    unauthorizedUrl.searchParams.set("error", "AccessDenied");
    unauthorizedUrl.searchParams.set("path", pathname);
    return NextResponse.redirect(unauthorizedUrl);
  }

  // 7. Acceso autorizado
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto archivos estáticos de Next.js
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
