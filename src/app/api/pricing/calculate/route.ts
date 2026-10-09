/**
 * API Route Handler: Cálculo Oficial de Tarifas y Descuentos (HU22)
 * POST /api/pricing/calculate
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  discountCalculatorService,
  calculatePricingSchema,
  FullPoolDayRestrictedError,
} from "@/features/pricing";
import { ServiceNotFoundError } from "@/features/services";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = calculatePricingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros de cotización inválidos",
          error: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const calculation = await discountCalculatorService.calculatePricing(parseResult.data);

    return NextResponse.json({
      success: true,
      message: "Tarifa y descuentos calculados exitosamente",
      data: calculation,
    });
  } catch (error: any) {
    if (error instanceof FullPoolDayRestrictedError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 422 }
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

    console.error("Error al calcular tarifa y descuentos:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al calcular la tarifa del servicio",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

