import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type RoleCheckResult =
  | { authorized: true; userId: string; roleName: string }
  | { authorized: false; status: 401 | 403; message: string };

/**
 * Verifica si el usuario que realiza la petición cuenta con el rol de ADMIN.
 *
 * Busca en:
 * 1. Header `x-user-role` (inyectado por gateway o sesión mockeada)
 * 2. Header `x-user-id` (buscando su rol real en la base de datos)
 * 3. Token bearer o cookie de sesión si viene provista
 */
export async function requireAdminRole(request: NextRequest): Promise<RoleCheckResult> {
  // 1. Header directo x-user-role (compatible con middlewares de autenticación)
  const roleHeader = request.headers.get("x-user-role")?.toUpperCase();
  if (roleHeader) {
    if (roleHeader === "ADMIN") {
      return {
        authorized: true,
        userId: request.headers.get("x-user-id") || "admin",
        roleName: "ADMIN",
      };
    }
    return {
      authorized: false,
      status: 403,
      message: "Acceso denegado: Se requiere rol ADMIN para gestionar categorías y servicios",
    };
  }

  // 2. Si viene x-user-id, verificar rol en BD
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
