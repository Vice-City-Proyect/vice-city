import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { resendConfirmationSchema } from "@/features/auth/schemas/resend-confirmation.schema";
import { resendConfirmationEmail } from "@/features/auth/services/email-confirmation.service";
import {
  UserNotFoundError,
  EmailAlreadyConfirmedError,
  UserAlreadyVerifiedError,
} from "@/features/auth/errors/email-confirmation.errors";

interface RouteContext {
  params?: Promise<Record<string, string | string[]>>;
  serviceOverride?: (input: { email: string }) => Promise<{ success: boolean; message: string; email?: string }>;
}

export async function POST(request: NextRequest, context?: RouteContext) {
  try {
    // 1. Validar Content-Type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CONTENT_TYPE",
          message: "El encabezado Content-Type debe ser application/json",
        },
        { status: 400 }
      );
    }

    // 2. Parseo seguro del cuerpo (manejo de cuerpo vacío o JSON inválido)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "MALFORMED_JSON",
          message: "El cuerpo de la solicitud no es un JSON válido o está vacío",
        },
        { status: 400 }
      );
    }

    // Caso límite: cuerpo nulo o que no sea objeto
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "El cuerpo de la solicitud debe ser un objeto JSON",
        },
        { status: 400 }
      );
    }

    // 3. Validación de entrada con Zod (rechaza campos extra con .strict())
    const validationResult = resendConfirmationSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "email",
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de reenvío inválidos",
          details,
        },
        { status: 400 }
      );
    }

    // 4. Delegación a la capa de lógica de negocio (sin acceso directo a la BD)
    const service = context?.serviceOverride || resendConfirmationEmail;
    const result = await service(validationResult.data);

    // 5. Respuesta exitosa (200 OK)
    return NextResponse.json(
      {
        success: true,
        message: result.message || "Correo de confirmación reenviado exitosamente",
        data: {
          email: result.email || validationResult.data.email,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code: unknown }).code
        : undefined;

    // Caso de error: Correo ya confirmado previamente (400 Bad Request)
    if (
      error instanceof EmailAlreadyConfirmedError ||
      error instanceof UserAlreadyVerifiedError ||
      (error instanceof Error &&
        (errorCode === "EMAIL_ALREADY_CONFIRMED" ||
          errorCode === "USER_ALREADY_VERIFIED" ||
          error.message.toLowerCase().includes("ya ha sido verificado") ||
          error.message.toLowerCase().includes("ya ha sido confirmado")))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_ALREADY_CONFIRMED",
          message:
            (error as Error).message ||
            "El correo electrónico ya ha sido confirmado previamente",
        },
        { status: 400 }
      );
    }

    // Caso de error: Usuario no encontrado (404 Not Found)
    if (
      error instanceof UserNotFoundError ||
      (error instanceof Error &&
        (errorCode === "USER_NOT_FOUND" ||
          error.message.toLowerCase().includes("no se encontró ningún usuario")))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message:
            (error as Error).message ||
            "No se encontró ningún usuario con el correo electrónico proporcionado",
        },
        { status: 404 }
      );
    }

    // Errores de validación de Zod (400 Bad Request)
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: error.message,
        },
        { status: 400 }
      );
    }

    // Error genérico no controlado (500 Internal Server Error)
    console.error("[API_AUTH_RESEND_CONFIRMATION_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno en el servidor",
      },
      { status: 500 }
    );
  }
}
