import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ReservationsService,
  reservationsService,
} from "@/features/reservations/services/reservations.service";
import { createReservationSchema } from "@/features/reservations/schemas/reservation.schema";
import { ReservationError } from "@/features/reservations/errors/reservations.errors";
import {
  resolveSession,
  hasAnyRole,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";

const strictSchema = createReservationSchema.strict();

export interface ReservationsRouteContext extends SessionAwareRouteContext {
  serviceOverride?: ReservationsService;
}

/**
 * Endpoint POST /api/reservations
 * Crea una reserva web en estado PENDING con HOLD de 10 minutos.
 * Requiere sesión activa (CLIENT o ADMIN). El precio y el aforo se validan
 * exclusivamente en el servidor.
 */
export async function POST(
  request: NextRequest,
  context?: ReservationsRouteContext
) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "INVALID_CONTENT_TYPE", message: "El encabezado Content-Type debe ser application/json" },
        { status: 400 }
      );
    }

    const session = await resolveSession(context);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Se requiere una sesión activa para reservar" },
        { status: 401 }
      );
    }
    if (!hasAnyRole(session, ["CLIENT", "ADMIN"])) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Tu rol no tiene permisos para crear reservas web" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "MALFORMED_JSON", message: "El cuerpo de la solicitud no es un JSON válido o está vacío" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY", message: "El cuerpo de la solicitud debe ser un objeto JSON" },
        { status: 400 }
      );
    }

    const result = strictSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de reserva inválidos",
          details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? reservationsService;
    const reservation = await service.createPendingReservation({
      userId: session.id,
      serviceId: result.data.serviceId,
      startAt: result.data.startAt,
      endAt: result.data.endAt,
      quantity: result.data.quantity,
      scheduleId: result.data.scheduleId ?? null,
      notes: result.data.notes ?? null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Reserva creada. Tienes 10 minutos para completar el pago.",
        data: reservation,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof ReservationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[API_RESERVATIONS_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Ocurrió un error interno al crear la reserva" },
      { status: 500 }
    );
  }
}