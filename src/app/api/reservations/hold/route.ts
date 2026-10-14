/**
 * API Route Handler: Creación de Reserva con Retención (HOLD) de 10 Minutos (HU21 / RN-011)
 * POST /api/reservations/hold
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  reservationHoldService,
  createHoldSchema,
  SlotFullConflictError,
  InvalidDurationError,
} from "@/features/reservations";
import {
  ServiceNotFoundError,
  OperatingHoursError,
  PastDateError,
  AdvanceBookingLimitError,
} from "@/features/services";
import {
  resolveSession,
  hasAnyRole,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";

export interface HoldRouteContext extends SessionAwareRouteContext {
  serviceOverride?: Pick<typeof reservationHoldService, "holdReservation">;
}

export async function POST(request: NextRequest, context?: HoldRouteContext) {
  try {
    const session = await resolveSession(context);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere una sesión activa para reservar",
          error: { code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }
    if (!hasAnyRole(session, ["CLIENT", "ADMIN"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Tu rol no tiene permisos para crear reservas web",
          error: { code: "FORBIDDEN" },
        },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "El cuerpo de la solicitud no es un JSON válido o está vacío",
          error: { code: "MALFORMED_JSON" },
        },
        { status: 400 }
      );
    }
    const parseResult = createHoldSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos de reserva inválidos",
          error: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    // La identidad la define la sesión: un cliente no puede retener cupos a nombre de otro usuario.
    const isAdmin = session.role.toUpperCase() === "ADMIN";
    if (!isAdmin && parseResult.data.userId !== session.id) {
      return NextResponse.json(
        {
          success: false,
          message: "No puedes reservar a nombre de otro usuario",
          error: { code: "FORBIDDEN_USER" },
        },
        { status: 403 }
      );
    }

    const service = context?.serviceOverride ?? reservationHoldService;
    const holdResult = await service.holdReservation(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        message: "Cupo retenido exitosamente por 10 minutos para realizar el pago",
        data: holdResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof SlotFullConflictError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 409 }
      );
    }

    if (error instanceof ServiceNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 404 }
      );
    }

    if (
      error instanceof InvalidDurationError ||
      error instanceof OperatingHoursError ||
      error instanceof PastDateError ||
      error instanceof AdvanceBookingLimitError
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 400 }
      );
    }

    console.error("Error al retener reserva (HOLD):", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error interno al procesar la retención de la reserva",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

