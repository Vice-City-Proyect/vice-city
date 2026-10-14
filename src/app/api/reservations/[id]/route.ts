/**
 * API Route Handler: Consulta de Estado y Tiempo de HOLD de una Reserva (HU21)
 * GET /api/reservations/:id
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  reservationHoldService,
  BookingNotFoundError,
} from "@/features/reservations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "El ID de la reserva es obligatorio.",
        },
        { status: 400 }
      );
    }

    const bookingDetails = await reservationHoldService.getBookingDetails(id);

    return NextResponse.json({
      success: true,
      message: "Detalles de la reserva obtenidos exitosamente",
      data: bookingDetails,
    });
  } catch (error: any) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 404 }
      );
    }

    console.error("Error al consultar reserva:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al consultar la reserva",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

