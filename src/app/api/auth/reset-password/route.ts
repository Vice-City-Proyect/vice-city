import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  resetPasswordSchema,
  validateResetTokenSchema,
} from "@/features/auth/schemas/reset-password.schema";
import { passwordResetService } from "@/features/auth/services/password-reset.service";
import {
  PasswordResetTokenExpiredError,
  InvalidPasswordResetTokenError,
  WeakPasswordError,
} from "@/features/auth/errors/password-reset.errors";

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token de recuperación
 *     description: Recibe el token y la nueva contraseña, valida fortaleza mínima (8 caracteres), ejecuta la transacción atómica en la BD invalidando el token y actualizando la contraseña con hash seguro (bcrypt).
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             additionalProperties: false
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de recuperación recibido por el usuario
 *                 example: "vcp_token_abc123xyz789"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: Nueva contraseña del usuario (mínimo 8 caracteres)
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *       400:
 *         description: Token inválido, contraseña débil (< 8 chars), campos extra o JSON malformado
 *       410:
 *         description: Token de recuperación expirado (superó ventana de 1 hora)
 *       500:
 *         description: Error interno del servidor
 *   get:
 *     summary: Validar estado de vigencia del token de recuperación (UI Pre-check)
 *     description: Permite a la interfaz de usuario verificar si el token recibido en la URL sigue activo antes de desplegar el formulario de nueva contraseña.
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de recuperación recibido en el enlace
 *         example: "vcp_token_abc123xyz789"
 *     responses:
 *       200:
 *         description: Token vigente y válido para su consumo
 *       400:
 *         description: Token no encontrado o ya consumido
 *       410:
 *         description: Token expirado
 *       500:
 *         description: Error interno del servidor
 */

interface RouteContext {
  serviceOverride?: typeof passwordResetService;
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
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "field",
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de restablecimiento inválidos",
          details,
        },
        { status: 400 }
      );
    }

    // 4. Delegación a la capa de lógica de negocio (sin acceso directo a la BD)
    const service = context?.serviceOverride || passwordResetService;
    const result = await service.resetPassword(
      validationResult.data.token,
      validationResult.data.newPassword
    );

    // 5. Respuesta exitosa (200 OK)
    return NextResponse.json(
      {
        success: true,
        message: result.message || "Tu contraseña ha sido restablecida exitosamente.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleResetPasswordError(error);
  }
}

export async function GET(request: NextRequest, context?: RouteContext) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    // 1. Validación de parámetro de consulta
    const validationResult = validateResetTokenSchema.safeParse({ token });
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "token",
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "El token de recuperación es obligatorio y debe ser válido",
          details,
        },
        { status: 400 }
      );
    }

    // 2. Consulta de vigencia a la capa de lógica de negocio
    const service = context?.serviceOverride || passwordResetService;
    const status = await service.validateTokenStatus(validationResult.data.token);

    if (status.isValid) {
      return NextResponse.json(
        {
          success: true,
          message: "Token de recuperación válido.",
          data: {
            isValid: true,
          },
        },
        { status: 200 }
      );
    }

    // Si no es válido, mapear según el motivo
    if (status.reason === "EXPIRED") {
      return NextResponse.json(
        {
          success: false,
          error: "TOKEN_EXPIRED",
          message: "El enlace de recuperación ha expirado.",
          data: {
            isValid: false,
            reason: "EXPIRED",
          },
        },
        { status: 410 }
      );
    }

    if (status.reason === "ALREADY_USED") {
      return NextResponse.json(
        {
          success: false,
          error: "TOKEN_ALREADY_USED",
          message: "El token de recuperación ya fue utilizado.",
          data: {
            isValid: false,
            reason: "ALREADY_USED",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "INVALID_TOKEN",
        message: "El token de recuperación no es válido.",
        data: {
          isValid: false,
          reason: status.reason || "INVALID_TOKEN",
        },
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    return handleResetPasswordError(error);
  }
}

/**
 * Centralizador de excepciones de dominio hacia códigos HTTP semánticos.
 */
function handleResetPasswordError(error: unknown) {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code: unknown }).code
      : undefined;

  // Caso de error: Token expirado (410 Gone)
  if (
    error instanceof PasswordResetTokenExpiredError ||
    (error instanceof Error &&
      (errorCode === "TOKEN_EXPIRED" ||
        error.message.toLowerCase().includes("ha expirado")))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "TOKEN_EXPIRED",
        message:
          (error as Error).message ||
          "El enlace de recuperación ha expirado. Por favor, solicita uno nuevo.",
      },
      { status: 410 }
    );
  }

  // Caso de error: Contraseña débil (< 8 caracteres) (400 Bad Request)
  if (
    error instanceof WeakPasswordError ||
    (error instanceof Error &&
      (errorCode === "WEAK_PASSWORD" ||
        error.message.toLowerCase().includes("al menos 8 caracteres")))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "WEAK_PASSWORD",
        message:
          (error as Error).message ||
          "La nueva contraseña debe tener al menos 8 caracteres.",
      },
      { status: 400 }
    );
  }

  // Caso de error: Token inválido o ya utilizado (400 Bad Request)
  if (
    error instanceof InvalidPasswordResetTokenError ||
    (error instanceof Error &&
      (errorCode === "INVALID_TOKEN" ||
        error.message.toLowerCase().includes("no es válido") ||
        error.message.toLowerCase().includes("ya fue utilizado")))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_TOKEN",
        message:
          (error as Error).message ||
          "El enlace de recuperación no es válido o ya fue utilizado.",
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
  console.error("[API_AUTH_RESET_PASSWORD_ERROR]", error);
  return NextResponse.json(
    {
      success: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error interno en el servidor",
    },
    { status: 500 }
  );
}
