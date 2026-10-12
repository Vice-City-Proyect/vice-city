import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  EmailConfirmationService,
  emailConfirmationService,
} from "@/features/auth/services/email-confirmation.service";
import {
  InvalidTokenError,
  TokenExpiredError,
  UserAlreadyVerifiedError,
  UserNotFoundError,
} from "@/features/auth/errors/email-confirmation.errors";

const schema = z
  .object({
    token: z.string().min(1, "El token de confirmación es obligatorio"),
  })
  .strict();

export interface ConfirmEmailRouteContext {
  params?: unknown;
  serviceOverride?: EmailConfirmationService;
}

/**
 * Endpoint POST /api/auth/confirm-email
 * Confirma la cuenta del usuario a partir del token enviado por correo (HU03-B).
 */
export async function POST(
  request: NextRequest,
  context?: ConfirmEmailRouteContext
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
          message: "Datos de confirmación inválidos",
          details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? emailConfirmationService;
    const result = await service.confirmEmail(parsed.data.token);

    return NextResponse.json(
      {
        success: true,
        message: "Correo electrónico confirmado exitosamente",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof TokenExpiredError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 410 }
      );
    }
    if (error instanceof UserAlreadyVerifiedError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 409 }
      );
    }
    if (error instanceof InvalidTokenError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof UserNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 404 }
      );
    }

    console.error("[API_AUTH_CONFIRM_EMAIL_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Ocurrió un error interno al confirmar el correo" },
      { status: 500 }
    );
  }
}