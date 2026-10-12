/**
 * API Route Handler: Registro de Venta Presencial en POS (HU25 / RN-017)
 * POST /api/pos/sale
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  posSaleService,
  posSaleSchema,
  ForbiddenPosAccessError,
  PosCapacityExceededError,
  PosAvailabilityChangedError,
  PosMaintenanceDayError,
  PosServiceNotFoundError,
  PosOperatingHoursError,
  PosPastSlotError,
} from "@/features/pos";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = posSaleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros de venta en POS inválidos",
          error: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const saleResult = await posSaleService.processSale(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        message: "Venta presencial registrada exitosamente y ticket generado",
        data: saleResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // 1. Criterio 3: Control de Roles (TICKET_SELLER)
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

    // 2. HU26: Disponibilidad cambió entre previsualización y confirmación
    if (error instanceof PosAvailabilityChangedError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 409 }
      );
    }

    // 3. Aforo insuficiente (RN-004)
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

    // 3. Mantenimiento semanal cerrado (RN-003)
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

    // 4. Servicio no encontrado
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

    // 5. Horario o franja finalizada
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

    console.error("Error no controlado en POST /api/pos/sale:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor al procesar la venta en taquilla",
        error: { code: "INTERNAL_SERVER_ERROR" },
      },
      { status: 500 }
    );
  }
}

