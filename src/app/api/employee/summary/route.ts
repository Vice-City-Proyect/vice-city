/**
 * VCP-93: GET /api/employee/summary
 * Resumen operativo del día para el panel de empleados: reservas de hoy, visitantes
 * esperados, ingresos por registrar y servicios activos. Sin datos de contacto del cliente.
 * Roles: TICKET_SELLER, QR_VALIDATOR y ADMIN (401 sin sesión, 403 otro rol).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  resolveSession,
  hasAnyRole,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";
import {
  dashboardSummaryService,
  type DashboardSummaryService,
} from "@/features/reservations/services/dashboard-summary.service";

interface RouteContext extends SessionAwareRouteContext {
  summaryServiceOverride?: Pick<DashboardSummaryService, "getEmployeeSummary">;
}

export async function GET(_request: NextRequest, context?: RouteContext) {
  try {
    const session = await resolveSession(context);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Se requiere una sesión activa para acceder a este recurso" },
        { status: 401 }
      );
    }
    if (!hasAnyRole(session, ["TICKET_SELLER", "QR_VALIDATOR", "ADMIN"])) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Tu rol no tiene permisos para consultar el resumen de empleados" },
        { status: 403 }
      );
    }

    const service = context?.summaryServiceOverride ?? dashboardSummaryService;
    const data = await service.getEmployeeSummary();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    console.error("[API_EMPLOYEE_SUMMARY_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al consultar el resumen del día",
      },
      { status: 500 }
    );
  }
}
