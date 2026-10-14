import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth";
import { allowsMockAuthHeaders } from "@/features/auth/mock-auth";

export type RoleCheckResult =
  | { authorized: true; userId: string; roleName: string }
  | { authorized: false; status: 401 | 403; message: string };

/**
 * Las cabeceras `x-user-id` / `x-user-role` provienen del cliente y, por tanto,
 * son falsificables. Solo se aceptan cuando `ENABLE_MOCK_AUTH_HEADERS=true`
 * (deshabilitado por defecto) como apoyo a pruebas y herramientas internas. En
 * cualquier entorno la autorización se basa exclusivamente en el token JWT
 * firmado por NextAuth (evita escalamiento de privilegios).
 */

/**
 * Verifica si el usuario que realiza la petición cuenta con el rol de ADMIN.
 *
 * Busca en:
 * 1. Token JWT de sesión de NextAuth (getToken)
 * 2. Header `x-user-id` (buscando su rol real en la base de datos) — solo no-producción
 * 3. Header `x-user-role` (para compatibilidad con tests) — solo no-producción
 */
export async function requireAdminRole(request: NextRequest): Promise<RoleCheckResult> {
  // 1. Verificar sesión JWT real vía NextAuth (entornos de producción y navegador)
  try {
    const token = await getToken({ req: request, secret: getAuthSecret() });
    if (token) {
      const tokenRole = (token.role as string)?.toUpperCase();
      if (tokenRole === "ADMIN") {
        return {
          authorized: true,
          userId: (token.id as string) || (token.sub as string) || "admin",
          roleName: "ADMIN",
        };
      }
      return {
        authorized: false,
        status: 403,
        message: "Acceso denegado: Se requiere rol ADMIN para gestionar categorías y servicios",
      };
    }
  } catch {
    // Si no se puede extraer el token JWT, continuar con fallbacks de encabezados
  }

  // 2. Fallbacks por encabezado (solo si el flag explícito está habilitado)
  if (allowsMockAuthHeaders()) {
    // 2.1. Si viene x-user-id, verificar rol en BD de forma segura
    const userId = request.headers.get("x-user-id");
    if (userId) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: { roles: true },
      });

      if (!user) {
        return { authorized: false, status: 401, message: "Usuario no autenticado o no encontrado" };
      }

      const userRole = user.roles?.name?.toUpperCase();
      if (userRole === "ADMIN") {
        return { authorized: true, userId: user.id, roleName: "ADMIN" };
      }

      return {
        authorized: false,
        status: 403,
        message: "Acceso denegado: Se requiere rol ADMIN para gestionar categorías y servicios",
      };
    }

    // 2.2. Header directo x-user-role (compatible con tests de simulación de roles)
    const roleHeader = request.headers.get("x-user-role")?.toUpperCase();
    if (roleHeader) {
      if (roleHeader === "ADMIN") {
        return {
          authorized: true,
          userId: "admin",
          roleName: "ADMIN",
        };
      }
      return {
        authorized: false,
        status: 403,
        message: "Acceso denegado: Se requiere rol ADMIN para gestionar categorías y servicios",
      };
    }
  }

  // Si no se proporcionaron credenciales o headers de sesión
  return {
    authorized: false,
    status: 401,
    message: "No autenticado: Se requiere iniciar sesión con cuenta ADMIN",
  };
}

/**
 * Helper para generar respuesta JSON estándar de error de autorización
 */
export function unauthorizedResponse(check: { status: 401 | 403; message: string }) {
  return NextResponse.json(
    {
      error: check.status === 403 ? "Forbidden" : "Unauthorized",
      message: check.message,
    },
    { status: check.status }
  );
}
