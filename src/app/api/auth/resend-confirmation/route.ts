import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  EmailConfirmationService,
  emailConfirmationService,
} from "@/features/auth/services/email-confirmation.service";
import {
  InvalidTokenError,
  UserAlreadyVerifiedError,
  UserNotFoundError,
} from "@/features/auth/errors/email-confirmation.errors";

const schema = z
  .object({
    email: z.string().trim().toLowerCase().email("El formato del correo electrónico es inválido"),
  })
  .strict();

export interface ResendConfirmationRouteContext {
  params?: unknown;
  serviceOverride?: EmailConfirmationService;
}

/**
 * Endpoint POST /api/auth/resend-confirmation
 * Reenvía el correo de confirmación. Invalida el token anterior (HU03-B).
 */
export async function POST(
  request: NextRequest,
  context?: ResendConfirmationRouteContext
) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "INVALID_CONTENT_TYPE", message: "El encabezado Content-Type debe ser application/json" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "MALFORMED_JSON", message: "El cuerpo de la solicitud no es un JSON válido o está vacío" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY", message: "El cuerpo de la solicitud debe ser un objeto JSON" },
        { status: 400 }
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos inválidos",
          details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? emailConfirmationService;
    const result = await service.resendVerificationEmail(parsed.data.email);

    return NextResponse.json(
      {
        success: true,
        message: "Se ha reenviado el correo de confirmación",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof UserAlreadyVerifiedError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 409 }
      );
    }
    if (error instanceof UserNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 404 }
      );
    }
    if (error instanceof InvalidTokenError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 400 }
      );
    }

    console.error("[API_AUTH_RESEND_CONFIRMATION_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Ocurrió un error interno al reenviar la confirmación" },
      { status: 500 }
    );
  }
}