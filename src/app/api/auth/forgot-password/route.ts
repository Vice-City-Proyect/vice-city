import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { forgotPasswordSchema } from "@/features/auth/schemas/forgot-password.schema";
import { passwordResetService } from "@/features/auth/services/password-reset.service";
import { UserNotFoundError } from "@/features/auth/errors/password-reset.errors";

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar enlace de recuperación de contraseña
 *     description: Recibe el correo electrónico del usuario, valida que exista una cuenta activa, genera un token criptográfico seguro de un solo uso con vigencia de 1 hora y despacha el correo de recuperación.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             additionalProperties: false
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico de la cuenta a recuperar
 *                 example: "usuario@ejemplo.com"
 *     responses:
 *       200:
 *         description: Enlace de recuperación despachado exitosamente
 *       400:
 *         description: Formato de correo inválido, cuerpo vacío o campos extra
 *       404:
 *         description: No se encontró ningún usuario con el correo proporcionado
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
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "email",
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de solicitud inválidos",
          details,
        },
        { status: 400 }
      );
    }

    // 4. Delegación a la capa de lógica de negocio (sin acceso directo a la BD)
    const service = context?.serviceOverride || passwordResetService;
    const result = await service.requestPasswordReset(validationResult.data.email);

    // 5. Respuesta exitosa (200 OK)
    return NextResponse.json(
      {
        success: true,
        message: result.message || "Se ha enviado un enlace de recuperación a tu correo electrónico.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code: unknown }).code
        : undefined;

    // Caso de error: Usuario no encontrado (404 Not Found)
    if (
      error instanceof UserNotFoundError ||
      (error instanceof Error &&
        (errorCode === "USER_NOT_FOUND" ||
          error.message.toLowerCase().includes("no existe una cuenta") ||
          error.message.toLowerCase().includes("no se encontró ningún usuario")))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message:
            (error as Error).message ||
            "No existe una cuenta registrada con el correo electrónico proporcionado.",
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

    // Error no controlado (500 Internal Server Error)
    console.error("[API_AUTH_FORGOT_PASSWORD_ERROR]", error);
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
