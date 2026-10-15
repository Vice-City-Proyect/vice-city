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
import {
  adminReservationIdSchema,
  updateAdminReservationSchema,
} from "@/features/reservations/schemas/admin-reservations.schema";
import {
  BookingNotFoundError,
  InvalidDurationError,
} from "@/features/reservations/errors/reservation.errors";
import {
  ReservationError,
  CapacityExceededError,
  SlotUnavailableError,
  MaintenanceDayClosedError,
  OperatingHoursError,
  DurationLimitError,
  AdvanceWindowExceededError,
} from "@/features/reservations/errors/reservations.errors";

export interface AdminReservationDetailRouteContext
  extends SessionAwareRouteContext {
  params?: Promise<{ id: string }> | { id: string };
  serviceOverride?: AdminReservationsService;
}

async function verifyAdminAuth(
  request: NextRequest,
  context?: AdminReservationDetailRouteContext
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

async function extractId(
  context?: AdminReservationDetailRouteContext
): Promise<string | null> {
  if (!context?.params) return null;
  const resolved =
    typeof (context.params as any).then === "function"
      ? await (context.params as Promise<{ id: string }>)
      : (context.params as { id: string });
  return resolved?.id ?? null;
}

/**
 * GET /api/admin/reservations/[id]
 * Consulta el detalle administrativo completo de una reserva.
 * Requiere rol ADMIN.
 */
export async function GET(
  request: NextRequest,
  context?: AdminReservationDetailRouteContext
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

    const rawId = await extractId(context);
    const parsedId = adminReservationIdSchema.safeParse({ id: rawId });
    if (!parsedId.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "El parámetro id debe ser un UUID válido",
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? adminReservationsService;
    const reservation = await service.getReservationById(parsedId.data.id);

    return NextResponse.json(
      {
        success: true,
        data: reservation,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: "BOOKING_NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

    console.error("[API_ADMIN_RESERVATIONS_ID_GET_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar el detalle de la reserva",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/reservations/[id]
 * Modifica o cancela lógicamente una reserva existente.
 * Requiere rol ADMIN.
 */
export async function PATCH(
  request: NextRequest,
  context?: AdminReservationDetailRouteContext
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

    const rawId = await extractId(context);
    const parsedId = adminReservationIdSchema.safeParse({ id: rawId });
    if (!parsedId.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "El parámetro id debe ser un UUID válido",
        },
        { status: 400 }
      );
    }

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

    const parsedBody = updateAdminReservationSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de actualización inválidos",
          details: parsedBody.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? adminReservationsService;
    const updated = await service.updateReservation(
      parsedId.data.id,
      parsedBody.data
    );

    const isCancel =
      parsedBody.data.status === "CANCELLED" ||
      Boolean(parsedBody.data.cancellationReason);

    return NextResponse.json(
      {
        success: true,
        message: isCancel
          ? "Reserva cancelada exitosamente"
          : "Reserva actualizada exitosamente",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: "BOOKING_NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

    if (
      error instanceof CapacityExceededError ||
      error instanceof SlotUnavailableError ||
      error instanceof MaintenanceDayClosedError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "SLOT_NOT_AVAILABLE",
          message:
            "El horario solicitado no cuenta con aforo disponible o se cruza con otra reserva confirmada.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof InvalidDurationError ||
      error instanceof DurationLimitError ||
      error instanceof OperatingHoursError ||
      error instanceof AdvanceWindowExceededError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SCHEDULE",
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof ReservationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error("[API_ADMIN_RESERVATIONS_ID_PATCH_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al actualizar la reserva administrativa",
      },
      { status: 500 }
    );
  }
}

