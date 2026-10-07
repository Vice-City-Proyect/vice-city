import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { resendConfirmationSchema } from "@/features/auth/schemas/resend-confirmation.schema";
import { resendConfirmationEmail } from "@/features/auth/services/confirm-email.service";
import {
  UserNotFoundError,
  EmailAlreadyConfirmedError,
} from "@/features/auth/errors/auth.errors";

/**
 * @openapi
 * /api/auth/resend-confirmation:
 *   post:
 *     summary: Reenviar correo de confirmación de cuenta
 *     description: Permite solicitar un nuevo token/correo de confirmación para una cuenta de usuario que aún no ha verificado su correo.
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
 *                 description: Correo electrónico registrado pendiente de verificación
 *                 example: "usuario@ejemplo.com"
 *     responses:
 *       200:
 *         description: Correo de confirmación reenviado exitosamente
 *       400:
 *         description: Correo inválido, ya confirmado previamente o payload malformado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */

interface RouteContext {
  serviceOverride?: typeof resendConfirmationEmail;
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
          message: "Datos de solicitud inválidos",
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
          email: validationResult.data.email,
        },
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

    // Caso de error: El correo ya está confirmado (400 Bad Request)
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

    // Errores de validación de Zod o negocio (400 Bad Request)
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

    if (
      error instanceof Error &&
      (error.message.includes("obligatorio") ||
        error.message.includes("inválido") ||
        error.message.includes("formato"))
    ) {
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
