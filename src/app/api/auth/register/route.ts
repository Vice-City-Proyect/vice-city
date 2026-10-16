import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerUser } from "@/features/auth/services/register.service";
import { registerSchema } from "@/features/auth/schemas/register.schema";
import {
  UserAlreadyExistsError,
  RoleNotFoundError,
  AuthValidationError,
} from "@/features/auth/errors/auth.errors";
import {
  EmailConfirmationService,
  emailConfirmationService,
} from "@/features/auth/services/email-confirmation.service";

// Esquema estricto para rechazar campos extra no reconocidos
const strictRegisterSchema = registerSchema.strict();

export interface RegisterRouteContext {
  params?: unknown;
  emailServiceOverride?: EmailConfirmationService;
  registerServiceOverride?: typeof registerUser;
}

export async function POST(request: NextRequest, context?: RegisterRouteContext) {
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

    // 2. Parseo seguro del cuerpo (manejo de cuerpo vacío o JSON inválido sin romper el servidor)
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

    // 3. Validación de entrada (campos obligatorios, formato y rechazo de campos extra)
    const validationResult = strictRegisterSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de registro inválidos",
          details,
        },
        { status: 400 }
      );
    }

    // 4. Delegación a la capa de lógica de negocio (sin acceso directo a la BD)
    const registerFn = context?.registerServiceOverride ?? registerUser;
    const newUser = await registerFn(validationResult.data);

    // 4.b Despacho del correo de verificación (HU03-B). Un fallo de correo no
    //     debe impedir el registro: se registra y el usuario puede reenviar luego.
    try {
      const emailService = context?.emailServiceOverride ?? emailConfirmationService;
      await emailService.sendVerificationEmail(newUser.id, newUser.email);
    } catch (mailError) {
      console.error("[API_AUTH_REGISTER_EMAIL_ERROR]", mailError);
    }

    // 5. Respuesta exitosa (201 Created)
    return NextResponse.json(
      {
        success: true,
        message:
          "Usuario registrado exitosamente. Revisa tu correo para confirmar tu cuenta.",
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // 6. Manejo de error de negocio: Correo ya registrado (409 Conflict)
    if (error instanceof UserAlreadyExistsError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code || "USER_ALREADY_EXISTS",
          message: error.message,
        },
        { status: 409 }
      );
    }

    // Manejo de error de validación de negocio (400 Bad Request)
    if (error instanceof AuthValidationError || error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: error.message,
        },
        { status: 400 }
      );
    }

    // Manejo de rol no encontrado (500 Internal Server Error)
    if (error instanceof RoleNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code || "ROLE_NOT_FOUND",
          message: error.message,
        },
        { status: 500 }
      );
    }

    // 7. Error no controlado (500 Internal Server Error)
    console.error("[API_AUTH_REGISTER_ERROR]", error);
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

