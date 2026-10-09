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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    const holdResult = await reservationHoldService.holdReservation(parseResult.data);

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

