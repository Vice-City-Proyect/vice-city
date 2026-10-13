/**
 * Endpoint de Confirmación de Ingreso por Código QR (HU13 - VCP-57)
 * POST /api/qr/[code]/entry
 * 
 * Marca el ticket como USED de forma atómica en base de datos,
 * registra en access_logs y audit_logs, e impide reingresos o accesos concurrentes.
 */

import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { qrCodeParamSchema } from "@/features/qr/schemas/qr.schema";
import { QRScannerService } from "@/features/qr/services/qr-scanner.service";
import { QRError } from "@/features/qr/errors/qr.errors";
import { requireQrValidator } from "@/features/qr/auth/qr-validator.guard";

/** Primera IP válida de la petición (x-forwarded-for puede traer una lista); null si no hay. */
function getClientIp(request: NextRequest): string | null {
  const raw = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  const first = raw?.split(",")[0]?.trim();
  return first && isIP(first) ? first : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Solo sesiones reales con rol QR_VALIDATOR (401 sin sesión, 403 otro rol)
    const auth = await requireQrValidator(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error, message: auth.message },
        { status: auth.status }
      );
    }

    const resolvedParams = await params;
    const parseParamResult = qrCodeParamSchema.safeParse(resolvedParams);

    if (!parseParamResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_QR_CODE",
          message: parseParamResult.error.issues[0]?.message || "Formato de código QR inválido",
        },
        { status: 400 }
      );
    }

    const { code } = parseParamResult.data;

    // El validador sale de la sesión; el punto de acceso es opcional en el cuerpo
    const ipAddress = getClientIp(request);

    let accessPoint = "Torniquete Principal";
    try {
      const body = await request.json();
      if (body?.accessPoint && typeof body.accessPoint === "string") {
        accessPoint = body.accessPoint.trim().slice(0, 50) || accessPoint;
      }
    } catch {
      // Si no envía cuerpo o está vacío, se toma el valor por defecto
    }

    const scannerService = new QRScannerService();
    const result = await scannerService.confirmEntry(
      code,
      auth.userId,
      auth.roleName,
      accessPoint,
      ipAddress
    );

    return NextResponse.json(
      {
        success: true,
        message: "Ingreso registrado y franqueado exitosamente",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof QRError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error("[API_QR_POST_ENTRY_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error inesperado al registrar el ingreso",
      },
      { status: 500 }
    );
  }
}
