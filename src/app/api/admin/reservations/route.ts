import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth";
import {
  resolveSession,
  readSessionOverride,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";
import {
  AdminReservationsService,
  adminReservationsService,
} from "@/features/reservations/services/admin-reservations.service";
import { adminReservationsQuerySchema } from "@/features/reservations/schemas/admin-reservations.schema";
import { ReservationError } from "@/features/reservations/errors/reservations.errors";

export interface AdminReservationsRouteContext
  extends SessionAwareRouteContext {
  params?: unknown;
  serviceOverride?: AdminReservationsService;
}

async function verifyAdminAuth(
  request: NextRequest,
  context?: AdminReservationsRouteContext
): Promise<{ authorized: true; userId: string } | { authorized: false; status: 401 | 403; message: string }> {
  // 1. Override inyectable para pruebas unitarias
  const override = readSessionOverride(context?.sessionOverride);
  if (override) {
    if (override.role?.toUpperCase() === "ADMIN") {
      return { authorized: true, userId: override.id };
    }
    return {
      authorized: false,
      status: 403,
      message: "Acceso denegado: se requieren permisos de administrador",
    };
  }

  // 2. Sesión activa vía NextAuth
  const session = await resolveSession(context);
  if (session) {
    if (session.role?.toUpperCase() === "ADMIN") {
      return { authorized: true, userId: session.id };
    }
    return {
      authorized: false,
      status: 403,
      message: "Acceso denegado: se requieren permisos de administrador",
    };
  }

  // 3. Fallback perimetral con getToken de NextAuth
  try {
    const token = await getToken({ req: request, secret: getAuthSecret() });
    if (token) {
      const tokenRole = (token.role as string)?.toUpperCase();
      if (tokenRole === "ADMIN") {
        return {
          authorized: true,
          userId: (token.id as string) || (token.sub as string) || "admin",
        };
      }
      return {
        authorized: false,
        status: 403,
        message: "Acceso denegado: se requieren permisos de administrador",
      };
    }
  } catch {
    // Continuar al fallo 401
  }

  return {
    authorized: false,
    status: 401,
    message: "Se requiere una sesión activa para acceder a este recurso",
  };
}

/**
 * GET /api/admin/reservations
 * Listado paginado de reservas con filtros y búsqueda administrativa.
 * Requiere rol ADMIN.
 */
export async function GET(
  request: NextRequest,
  context?: AdminReservationsRouteContext
) {
  try {
    const auth = await verifyAdminAuth(request, context);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.status === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
          message: auth.message,
        },
        { status: auth.status }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const rawQuery = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      serviceId: searchParams.get("serviceId") ?? undefined,
      date: searchParams.get("date") ?? undefined,
      slot: searchParams.get("slot") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const parsedQuery = adminReservationsQuerySchema.safeParse(rawQuery);
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Parámetros de consulta inválidos",
          details: parsedQuery.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? adminReservationsService;
    const result = await service.listReservations(parsedQuery.data);

    return NextResponse.json(
      {
        success: true,
        data: result.reservations,
        pagination: result.pagination,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API_ADMIN_RESERVATIONS_GET_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar las reservas administrativas",
      },
      { status: 500 }
    );
  }
}

