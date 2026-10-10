import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { googleProfileSchema } from "@/features/auth/schemas/google-auth.schema";
import {
  googleAuthService,
  GoogleEmailNotProvidedError,
  UserInactiveError,
  GoogleAuthError,
} from "@/features/auth";
import { linkAccount } from "@/features/users/linked-accounts.repository";
import { resolveGoogleAuthErrorMessage } from "@/features/auth/utils/google-error-handler";

const strictSchema = googleProfileSchema.strict();

export interface RouteContext {
  params?: Promise<Record<string, string>>;
}

/**
 * Endpoint POST /api/auth/google
 * Procesa la autenticación o registro federado con Google OAuth (HU05-B).
 * Cumple con el estándar de contratos de API de Vice City (vice-city-api-contracts).
 */
export async function POST(
  request: NextRequest,
  serviceOverride?: any
) {
  try {
    // 1. Content-Type validation
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

    // 2. Safe JSON parse
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

    // 3. Object type guard
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

    // Manejo de error cuando el frontend reporta cancelación o error de Google
    const potentialError = (body as any).error;
    if (potentialError) {
      const clearMessage = resolveGoogleAuthErrorMessage(String(potentialError));
      return NextResponse.json(
        {
          success: false,
          error: String(potentialError).toUpperCase(),
          message: clearMessage,
        },
        { status: 400 }
      );
    }

    // 4. Strict Zod validation (.strict() rechaza campos desconocidos)
    const result = strictSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de perfil de Google inválidos",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    // 5. Delegación a la lógica de negocio (HU05-B LN)
    const authService = serviceOverride ?? googleAuthService;
    const authResult = await authService.handleGoogleAuth(result.data);

    // Si hay persistencia en linked_accounts, registrar la vinculación ORM (HU05-BD)
    if (authResult?.user?.id && result.data.id) {
      try {
        await linkAccount({
          userId: authResult.user.id,
          provider: "google",
          providerAccountId: result.data.id,
        });
      } catch {
        // Silencioso en caso de tabla no migrada o entorno de pruebas
      }
    }

    // 6. Respuesta estándar exitosa con datos de sesión (Criterio 1 y Criterio 3)
    return NextResponse.json(
      {
        success: true,
        message: authResult.message,
        data: {
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            name: authResult.user.full_name,
            role: authResult.user.role,
          },
          isNewUser: authResult.isNewUser,
          isLinked: authResult.isLinked,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
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

    if (error instanceof GoogleEmailNotProvidedError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof UserInactiveError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: 403 }
      );
    }

    if (error instanceof GoogleAuthError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    console.error("[API_AUTH_GOOGLE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno al procesar el inicio de sesión con Google",
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint GET /api/auth/google
 * Permite manejar consultas de estado de error o redirección ante cancelación (Criterio 2).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const errorCode = searchParams.get("error");

  if (errorCode) {
    const friendlyMessage = resolveGoogleAuthErrorMessage(errorCode);
    return NextResponse.json(
      {
        success: false,
        error: errorCode,
        message: friendlyMessage,
        redirectUrl: `/login?error=${encodeURIComponent(errorCode)}`,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Endpoint de autenticación con Google activo",
      signInUrl: "/api/auth/signin/google",
    },
    { status: 200 }
  );
}

