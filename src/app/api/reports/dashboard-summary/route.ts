/**
 * VCP-93: GET /api/reports/dashboard-summary
 * Resumen del dashboard del administrador: reservas pendientes (HOLD vigente),
 * usuarios activos y próximas reservas confirmadas. Solo ADMIN (401 sin sesión, 403 otro rol).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";
import {
  dashboardSummaryService,
  type DashboardSummaryService,
} from "@/features/reservations/services/dashboard-summary.service";

interface RouteContext {
  params?: unknown;
  summaryServiceOverride?: Pick<DashboardSummaryService, "getAdminSummary">;
}

export async function GET(request: NextRequest, context?: RouteContext) {
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const service = context?.summaryServiceOverride ?? dashboardSummaryService;
    const data = await service.getAdminSummary();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    console.error("[API_DASHBOARD_SUMMARY_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar el resumen del dashboard",
      },
      { status: 500 }
    );
  }
}
