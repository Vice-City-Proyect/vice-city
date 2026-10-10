import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  roleManagementService,
  RoleManagementService,
} from "@/features/users/services/role-management.service";
import { changeUserRoleSchema } from "@/features/users/schemas/role-management.schema";
import {
  RoleManagementError,
  UnauthorizedRoleManagerError,
  InvalidRoleError,
  CannotDemoteLastAdminError,
  TargetUserNotFoundError,
} from "@/features/users/errors/role-management.errors";

export interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

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
 * Endpoint PATCH /api/admin/users/[id]/role (HU07-B API)
 * Permite a un administrador cambiar el rol de un usuario del sistema.
 *
 * Criterios de Aceptación:
 * - Criterio 1: Un ADMIN cambia el rol de otro usuario (200).
 * - Criterio 2: Caso de error: usuario sin rol ADMIN recibe 403 y sin sesión recibe 401.
 * - Criterio 3: Caso límite: enviar un rol que no existe devuelve 400.
 */
export async function PATCH(
  request: NextRequest,
  contextOrSession?: RouteContext | any,
  serviceOverride?: RoleManagementService
) {
  try {
    // Manejo flexible para pruebas unitarias con override o contexto de Next.js
    let targetUserId: string | undefined;
    let sessionOverride: any;

    if (contextOrSession && "params" in contextOrSession) {
      const resolvedParams = await contextOrSession.params;
      targetUserId = resolvedParams?.id;
    } else if (contextOrSession && typeof contextOrSession === "object") {
      sessionOverride = contextOrSession;
      targetUserId = (sessionOverride as any)?.targetUserId;
    }

    if (!targetUserId) {
      // Intentar extraer de la URL /api/admin/users/:id/role
      const pathnameParts = request.nextUrl.pathname.split("/");
      const idIndex = pathnameParts.indexOf("users") + 1;
      if (idIndex > 0 && idIndex < pathnameParts.length) {
        targetUserId = pathnameParts[idIndex];
      }
    }

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

    // 3. Validación de Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CONTENT_TYPE",
          message: "El encabezado Content-Type debe ser application/json",
        },
        { status: 400 }
      );
    }

    // 4. Parseo seguro de JSON
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "MALFORMED_JSON",
          message: "El cuerpo de la solicitud no es un JSON válido o está vacío",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "El cuerpo de la solicitud debe ser un objeto JSON",
        },
        { status: 400 }
      );
    }

    // 5. Validación con Zod estricto (.strict() rechaza campos desconocidos)
    const validationResult = changeUserRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de cambio de rol inválidos",
          details: validationResult.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "El identificador del usuario objetivo es requerido",
        },
        { status: 400 }
      );
    }

    // 6. Delegar en la capa de lógica de negocio (HU07-B LN)
    const service = serviceOverride ?? roleManagementService;
    const clientIp = request.headers.get("x-forwarded-for") || null;

    const result = await service.changeUserRole(
      {
        targetUserId,
        newRole: validationResult.data.role,
        reason: validationResult.data.reason,
        ipAddress: clientIp,
      },
      {
        id: user.id,
        role: user.role,
        email: user.email,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: {
          user: result.user,
          auditLog: result.auditLog,
        },
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

    if (
      error instanceof InvalidRoleError ||
      error instanceof CannotDemoteLastAdminError
    ) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 400 }
      );
    }

    if (error instanceof TargetUserNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 404 }
      );
    }

    if (error instanceof RoleManagementError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[API_CHANGE_USER_ROLE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno al actualizar el rol del usuario",
      },
      { status: 500 }
    );
  }
}

export { PATCH as PUT };
