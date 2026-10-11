import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  roleManagementService,
  RoleManagementService,
} from "@/features/users/services/role-management.service";
import { listUsersQuerySchema } from "@/features/users/schemas/role-management.schema";
import {
  RoleManagementError,
  UnauthorizedRoleManagerError,
} from "@/features/users/errors/role-management.errors";

/**
 * Helper para verificar la autenticación y permisos de ADMIN
 */
async function resolveAdminSession(
  request: NextRequest,
  sessionOverride?: any
): Promise<{ id: string; role: string; email?: string } | null> {
  if (sessionOverride?.user) return sessionOverride.user;
  if (sessionOverride) return sessionOverride;

  try {
    const session = await getServerSession(authOptions);
    return (session?.user as any) ?? null;
  } catch {
    return null;
  }
}

/**
 * Endpoint GET /api/admin/users (HU07-B API)
 * Permite a los administradores listar los usuarios del sistema de forma paginada.
 *
 * Criterios de Aceptación:
 * - Criterio 1: Un ADMIN lista usuarios (200).
 * - Criterio 2: Sin sesión devuelve 401; sin rol ADMIN devuelve 403.
 */
export async function GET(
  request: NextRequest,
  sessionOverride?: any,
  serviceOverride?: RoleManagementService
) {
  try {
    // 1. Verificación de sesión activa
    const user = await resolveAdminSession(request, sessionOverride);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Se requiere una sesión activa para acceder a este recurso",
        },
        { status: 401 }
      );
    }

    // 2. Verificación de rol ADMIN
    if (user.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "Acceso denegado: se requieren permisos de administrador",
        },
        { status: 403 }
      );
    }

    // 3. Parsear y validar parámetros de consulta
    const url = new URL(request.url);
    const parseResult = listUsersQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
    });

    const queryParams = parseResult.success
      ? parseResult.data
      : { page: 1, limit: 10 };

    // 4. Delegar en la lógica de negocio (HU07-B LN)
    const service = serviceOverride ?? roleManagementService;
    const data = await service.listUsers(queryParams, {
      id: user.id,
      role: user.role,
      email: user.email,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Listado de usuarios recuperado exitosamente",
        data,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof UnauthorizedRoleManagerError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 403 }
      );
    }

    if (error instanceof RoleManagementError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[API_ADMIN_USERS_GET_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno al consultar el listado de usuarios",
      },
      { status: 500 }
    );
  }
}
