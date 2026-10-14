/**
 * Endpoint de Consulta de Ticket por Código QR (HU13 - VCP-57)
 * GET /api/qr/[code]
 * 
 * Permite a los validadores autorizados consultar los datos de un ticket al portador,
 * ver el servicio y cliente, y conocer de antemano si el acceso es válido.
 */

import { NextRequest, NextResponse } from "next/server";
import { qrCodeParamSchema } from "@/features/qr/schemas/qr.schema";
import { QRScannerService } from "@/features/qr/services/qr-scanner.service";
import { QRError } from "@/features/qr/errors/qr.errors";
import { requireQrValidator } from "@/features/qr/auth/qr-validator.guard";

export async function GET(
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
    const parseResult = qrCodeParamSchema.safeParse(resolvedParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_QR_CODE",
          message: parseResult.error.issues[0]?.message || "Formato de código QR inválido",
        },
        { status: 400 }
      );
    }

    const { code } = parseResult.data;

    const scannerService = new QRScannerService();
    const result = await scannerService.validateQRCode(code, auth.roleName);

    return NextResponse.json(
      {
        success: true,
        message: result.accessValidation.canEnter
          ? "Código QR consultado exitosamente - Acceso autorizado"
          : "Código QR consultado - Acceso denegado según reglas de negocio",
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

    console.error("[API_QR_GET_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error inesperado al consultar el código QR",
      },
      { status: 500 }
    );
  }
}
