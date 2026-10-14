/**
 * FT-08 / HU27: Endpoint Oficial de Métricas de Ventas y Ocupación
 * GET /api/reports/metrics
 *
 * Criterios de Aceptación:
 * - CA01: Las cifras coinciden con las reservas y pagos registrados.
 * - CA02: Cada filtro de período (?period=day|week|month|year) devuelve el rango correcto en America/Bogota.
 * - CA03: Caso de error: usuario sin rol ADMIN recibe 403 (o 401 si no autenticado).
 * - CA04: Caso límite: un período sin ventas devuelve ceros, no error.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";
import { metricsService, type MetricsPeriod } from "@/features/reports";

const VALID_PERIODS: MetricsPeriod[] = ["day", "week", "month", "year"];

interface RouteContext {
  params?: unknown;
  metricsServiceOverride?: Pick<typeof metricsService, "getMetrics">;
}

export async function GET(request: NextRequest, context?: RouteContext) {
  // 1. CA03: Restringir acceso exclusivamente a administradores (403 si no es ADMIN)
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    // 2. Extraer y validar el filtro de período (por defecto 'month')
    const searchParams = request.nextUrl.searchParams;
    const periodParam = (searchParams.get("period") || "month").toLowerCase() as MetricsPeriod;

    if (!VALID_PERIODS.includes(periodParam)) {
      return NextResponse.json(
        {
          success: false,
          error: "Período inválido",
          message: `El parámetro 'period' debe ser uno de: ${VALID_PERIODS.join(", ")}. Recibido: '${periodParam}'`,
        },
        { status: 400 }
      );
    }

    // 3. CA01, CA02, CA04: Obtener métricas consolidadas en America/Bogota
    const service = context?.metricsServiceOverride || metricsService;
    const metrics = await service.getMetrics(periodParam);

    return NextResponse.json(
      {
        success: true,
        data: metrics,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error al consultar métricas de ventas y ocupación:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno",
        message: "Ocurrió un error al procesar las métricas de ventas y ocupación.",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

