/**
 * API Route Handler: Disponibilidad y Aforo por Franja Horaria (HU20 / RN-012)
 * GET /api/availability?serviceId=UUID&date=YYYY-MM-DD
 *
 * Misma fuente de disponibilidad para Web y POS (RN-012).
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  availabilityService,
  availabilityQuerySchema,
  ServiceNotFoundError,
  AdvanceBookingLimitError,
  PastDateError,
  InvalidDateFormatError,
} from "@/features/services";

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parseResult = availabilityQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros de consulta inválidos",
          error: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { serviceId, date } = parseResult.data;
    const availabilityData = await availabilityService.getServiceAvailability(
      serviceId,
      date
    );

    return NextResponse.json({
      success: true,
      message: "Disponibilidad calculada exitosamente",
      data: availabilityData,
    });
  } catch (error: any) {
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
      error instanceof AdvanceBookingLimitError ||
      error instanceof PastDateError ||
      error instanceof InvalidDateFormatError
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

    console.error("Error al calcular disponibilidad:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al calcular la disponibilidad del servicio",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

