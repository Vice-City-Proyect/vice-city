/**
 * API Route Handler: Catálogo Público de Servicios (HU20)
 * GET /api/catalog
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import { catalogService, catalogQuerySchema } from "@/features/services";

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parseResult = catalogQuerySchema.safeParse(searchParams);

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

    const { includeInactive } = parseResult.data;
    const catalogData = await catalogService.getPublicCatalog(includeInactive);

    return NextResponse.json({
      success: true,
      message: "Catálogo de servicios obtenido exitosamente",
      data: catalogData,
    });
  } catch (error: any) {
    console.error("Error al obtener catálogo público:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al consultar el catálogo de servicios",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

