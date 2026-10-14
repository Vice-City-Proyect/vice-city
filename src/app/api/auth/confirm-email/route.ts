import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { confirmEmailSchema } from "@/features/auth/schemas/confirm-email.schema";
import {
  emailConfirmationService,
  EmailConfirmationService,
  confirmUserEmail,
} from "@/features/auth/services/email-confirmation.service";
import {
  TokenExpiredError,
  InvalidTokenError,
  UserAlreadyVerifiedError,
  TokenAlreadyUsedError,
  EmailAlreadyConfirmedError,
  UserNotFoundError,
} from "@/features/auth/errors/email-confirmation.errors";

export interface ConfirmEmailRouteContext {
  params?: unknown;
  serviceOverride?:
    | EmailConfirmationService
    | { confirmEmail: (token: string) => Promise<unknown> }
    | ((input: { token: string }) => Promise<{ email?: string; emailVerified?: boolean; message?: string; [key: string]: unknown }>);
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
    const validationResult = confirmEmailSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "token",
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de confirmación inválidos",
          details,
        },
        { status: 400 }
      );
    }

    // 4. Delegación a la capa de lógica de negocio (soporte dual para serviceOverride)
    let result: Record<string, unknown> = {};
    const serviceOverride = context?.serviceOverride;
    if (typeof serviceOverride === "function") {
      result = (await serviceOverride(validationResult.data)) as Record<string, unknown>;
    } else if (
      serviceOverride &&
      typeof (serviceOverride as { confirmEmail?: unknown }).confirmEmail === "function"
    ) {
      result = (await (serviceOverride as { confirmEmail: (token: string) => Promise<unknown> }).confirmEmail(
        validationResult.data.token
      )) as Record<string, unknown>;
    } else if (typeof confirmUserEmail === "function") {
      result = (await confirmUserEmail(validationResult.data)) as Record<string, unknown>;
    } else {
      result = (await emailConfirmationService.confirmEmail(validationResult.data.token)) as unknown as Record<string, unknown>;
    }

    // 5. Respuesta exitosa (200 OK)
    return NextResponse.json(
      {
        success: true,
        message: (result?.message as string) || "Correo electrónico confirmado exitosamente",
        data: {
          ...result,
          email: result?.email,
          emailVerified: (result?.emailVerified as boolean) ?? true,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleConfirmEmailError(error);
  }
}

/**
 * Endpoint GET /api/auth/confirm-email
 * Permite confirmar mediante clic directo en el enlace de correo.
 */
export async function GET(
  request: NextRequest,
  context?: ConfirmEmailRouteContext
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    // 1. Validación de parámetro de consulta
    const validationResult = confirmEmailSchema.safeParse({ token });
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "token",
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "El token de confirmación es obligatorio y debe ser válido",
          details,
        },
        { status: 400 }
      );
    }

    // 2. Delegación a la capa de lógica de negocio
    let result: Record<string, unknown> = {};
    const serviceOverride = context?.serviceOverride;
    if (typeof serviceOverride === "function") {
      result = (await serviceOverride(validationResult.data)) as Record<string, unknown>;
    } else if (
      serviceOverride &&
      typeof (serviceOverride as { confirmEmail?: unknown }).confirmEmail === "function"
    ) {
      result = (await (serviceOverride as { confirmEmail: (token: string) => Promise<unknown> }).confirmEmail(
        validationResult.data.token
      )) as Record<string, unknown>;
    } else if (typeof confirmUserEmail === "function") {
      result = (await confirmUserEmail(validationResult.data)) as Record<string, unknown>;
    } else {
      result = (await emailConfirmationService.confirmEmail(validationResult.data.token)) as unknown as Record<string, unknown>;
    }

    // 3. Respuesta exitosa (200 OK)
    return NextResponse.json(
      {
        success: true,
        message: (result?.message as string) || "Correo electrónico confirmado exitosamente",
        data: {
          ...result,
          email: result?.email,
          emailVerified: (result?.emailVerified as boolean) ?? true,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleConfirmEmailError(error);
  }
}

/**
 * Centralizador de mapeo de excepciones de dominio hacia respuestas HTTP semánticas.
 */
function handleConfirmEmailError(error: unknown) {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code: unknown }).code
      : undefined;

  // Caso de error: Token expirado (410 Gone)
  if (
    error instanceof TokenExpiredError ||
    (error instanceof Error &&
      (error.message.toLowerCase().includes("expirad") ||
        errorCode === "TOKEN_EXPIRED"))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "TOKEN_EXPIRED",
        message: (error as Error).message || "El enlace de confirmación ha expirado. Por favor, solicita uno nuevo.",
      },
      { status: 410 }
    );
  }

  // Caso de error: Correo ya verificado previamente (409 Conflict)
  if (
    error instanceof UserAlreadyVerifiedError ||
    (error instanceof Error && errorCode === "USER_ALREADY_VERIFIED")
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_ALREADY_VERIFIED",
        message: (error as Error).message || "El correo electrónico ya ha sido verificado previamente.",
      },
      { status: 409 }
    );
  }

  // Caso de error: Usuario no encontrado (404 Not Found)
  if (
    error instanceof UserNotFoundError ||
    (error instanceof Error && errorCode === "USER_NOT_FOUND")
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "USER_NOT_FOUND",
        message: (error as Error).message || "No se encontró ningún usuario asociado al correo electrónico.",
      },
      { status: 404 }
    );
  }

  // Caso límite: Token ya utilizado (400 Bad Request)
  if (
    error instanceof TokenAlreadyUsedError ||
    (error instanceof Error &&
      (error.message.toLowerCase().includes("ya ha sido utilizado") ||
        errorCode === "TOKEN_ALREADY_USED"))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "TOKEN_ALREADY_USED",
        message:
          (error as Error).message ||
          "El token de confirmación ya ha sido utilizado anteriormente",
      },
      { status: 400 }
    );
  }

  // Caso de error: Correo ya confirmado previamente alternativo (400 Bad Request)
  if (
    error instanceof EmailAlreadyConfirmedError ||
    (error instanceof Error &&
      (errorCode === "EMAIL_ALREADY_CONFIRMED" ||
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

  // Caso de error: Token inválido (400 Bad Request)
  if (
    error instanceof InvalidTokenError ||
    (error instanceof Error &&
      (error.message.toLowerCase().includes("no es válido") ||
        error.message.toLowerCase().includes("inválido") ||
        errorCode === "INVALID_TOKEN"))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_TOKEN",
        message:
          (error as Error).message || "El token de confirmación no es válido o ya fue utilizado.",
      },
      { status: 400 }
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
  console.error("[API_AUTH_CONFIRM_EMAIL_ERROR]", error);
  return NextResponse.json(
    {
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error interno en el servidor al confirmar el correo",
    },
    { status: 500 }
  );
}
