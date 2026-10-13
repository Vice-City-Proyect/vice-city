/**
 * API Route Handler: Previsualización de Venta y Ticket en POS (HU26 / RN-017, RN-019)
 * POST /api/pos/preview
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  posSaleService,
  posPreviewSchema,
  ForbiddenPosAccessError,
  PosCapacityExceededError,
  PosMaintenanceDayError,
  PosServiceNotFoundError,
  PosOperatingHoursError,
  PosPastSlotError,
} from "@/features/pos";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = posPreviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros de previsualización en POS inválidos",
          error: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const preview = await posSaleService.previewSale(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        message: "Previsualización del ticket generada exitosamente",
        data: preview,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof ForbiddenPosAccessError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 403 }
      );
    }

    if (error instanceof PosCapacityExceededError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 409 }
      );
    }

    if (error instanceof PosMaintenanceDayError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 422 }
      );
    }

    if (error instanceof PosServiceNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 404 }
      );
    }

    if (error instanceof PosOperatingHoursError || error instanceof PosPastSlotError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 400 }
      );
    }

    console.error("Error no controlado en POST /api/pos/preview:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor al previsualizar la venta en taquilla",
        error: { code: "INTERNAL_SERVER_ERROR" },
      },
      { status: 500 }
    );
  }
}

