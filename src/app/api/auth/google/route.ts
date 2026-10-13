import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { encode } from "next-auth/jwt";
import { googleProfileSchema } from "@/features/auth/schemas/google-auth.schema";
import {
  GoogleAuthService,
  googleAuthService,
  GoogleEmailNotProvidedError,
  GoogleEmailNotVerifiedError,
  UserInactiveError,
  GoogleAuthError,
  GoogleAuthConfigError,
  type GoogleProfile,
  type GoogleAuthResult,
  normalizeRole,
} from "@/features/auth";
import { linkAccount } from "@/features/users/linked-accounts.repository";
import { resolveGoogleAuthErrorMessage } from "@/features/auth/utils/google-error-handler";
import { getAuthSecret, isGoogleOAuthConfigured } from "@/lib/auth";

const strictSchema = googleProfileSchema.strict();

export interface RouteContext {
  params?: Promise<Record<string, string | string[]>>;
  serviceOverride?: GoogleAuthService | { handleGoogleAuth: (profile: GoogleProfile) => Promise<GoogleAuthResult> };
}

/**
 * Endpoint POST /api/auth/google
 * Procesa la autenticación o registro federado con Google OAuth (HU05-B).
 * Si se envía un `idToken`, valida la autenticidad con los servidores de Google.
 * Establece una cookie de sesión cifrada de NextAuth compatible con el middleware.
 */
export async function POST(
  request: NextRequest,
  contextOrOverride?: RouteContext | GoogleAuthService | { handleGoogleAuth: (profile: GoogleProfile) => Promise<GoogleAuthResult> }
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
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
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

    // Manejo de error cuando el cliente reporta cancelación o error de Google
    const potentialError = body.error;
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

    // Resolver servicio (soporte para inyección en tests unitarios)
    const authService: {
      handleGoogleAuth: (profile: GoogleProfile) => Promise<GoogleAuthResult>;
      linkAccountFn?: typeof linkAccount;
    } =
      contextOrOverride && typeof (contextOrOverride as { handleGoogleAuth?: unknown }).handleGoogleAuth === "function"
        ? (contextOrOverride as {
            handleGoogleAuth: (profile: GoogleProfile) => Promise<GoogleAuthResult>;
            linkAccountFn?: typeof linkAccount;
          })
        : (contextOrOverride as RouteContext)?.serviceOverride ?? googleAuthService;

    let profileData: GoogleProfile;

    // 4. Verificación de token si se provee `idToken` (Google ID Token firmado)
    if (typeof body.idToken === "string" && body.idToken.trim()) {
      const rawToken = body.idToken.trim();
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(rawToken)}`
        );
        if (!verifyRes.ok) {
          return NextResponse.json(
            {
              success: false,
              error: "INVALID_GOOGLE_ID_TOKEN",
              message: "El token de identidad de Google no es válido o ha expirado",
            },
            { status: 401 }
          );
        }
        const tokenInfo = await verifyRes.json();
        if (!tokenInfo.email) {
          throw new GoogleEmailNotProvidedError();
        }
        profileData = {
          id: tokenInfo.sub,
          email: tokenInfo.email,
          name: tokenInfo.name || tokenInfo.email.split("@")[0],
          picture: tokenInfo.picture || null,
          email_verified: tokenInfo.email_verified === "true" || tokenInfo.email_verified === true,
        };
      } catch (err: unknown) {
        if (err instanceof GoogleEmailNotProvidedError) {
          throw err;
        }
        return NextResponse.json(
          {
            success: false,
            error: "GOOGLE_VERIFICATION_NETWORK_ERROR",
            message: "Error de red al verificar el token con los servidores de Google",
          },
          { status: 502 }
        );
      }
    } else {
      // Validación con Zod estricto para payloads de perfil directo
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

      // En producción estricta, rechazar perfiles sin token si no es entorno de pruebas
      if (
        process.env.NODE_ENV === "production" &&
        process.env.npm_lifecycle_event !== "test"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "UNVERIFIED_PROFILE_REJECTED",
            message:
              "En producción se requiere un token de identidad de Google (idToken) verificable en lugar de un perfil no firmado",
          },
          { status: 400 }
        );
      }

      profileData = result.data;
    }

    // 5. Delegación a la lógica de negocio (HU05-B LN)
    const authResult = await authService.handleGoogleAuth(profileData);

    // 6. Vinculación en linked_accounts si está disponible (HU05-BD)
    if (authResult?.user?.id && profileData.id) {
      try {
        const linkFn = typeof authService.linkAccountFn === "function" ? authService.linkAccountFn : linkAccount;
        const linkResult = await linkFn({
          userId: authResult.user.id,
          provider: "google",
          providerAccountId: profileData.id,
        });

        if (!linkResult.success && linkResult.reason === "ALREADY_LINKED_TO_OTHER_USER") {
          return NextResponse.json(
            {
              success: false,
              error: "ACCOUNT_ALREADY_LINKED",
              message: "Esta cuenta de Google ya se encuentra vinculada a otro usuario en el sistema",
            },
            { status: 409 }
          );
        }
      } catch (linkErr: unknown) {
        if ((linkErr as { code?: string })?.code === "ACCOUNT_ALREADY_LINKED") {
          return NextResponse.json(
            {
              success: false,
              error: "ACCOUNT_ALREADY_LINKED",
              message: "Esta cuenta de Google ya se encuentra vinculada a otro usuario en el sistema",
            },
            { status: 409 }
          );
        }
        // Silencioso en caso de tabla no migrada o entorno de pruebas
      }
    }

    // 7. Establecer sesión compatible con NextAuth y el Middleware
    let sessionToken: string | null = null;
    try {
      const secret = getAuthSecret();
      sessionToken = await encode({
        token: {
          id: authResult.user.id,
          email: authResult.user.email,
          name: authResult.user.full_name,
          role: normalizeRole(authResult.user.role) ?? "CLIENT",
          sub: authResult.user.id,
        },
        secret,
        maxAge: 8 * 60 * 60,
      });
    } catch {
      sessionToken = null;
    }

    const response = NextResponse.json(
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
          sessionEstablished: Boolean(sessionToken),
        },
      },
      { status: 200 }
    );

    // Emitir la cookie de sesión nativa de NextAuth
    if (sessionToken) {
      const isHttps = request.url.startsWith("https://") && process.env.NODE_ENV === "production";
      const cookieName = isHttps
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

      response.cookies.set(cookieName, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isHttps,
        maxAge: 8 * 60 * 60,
      });
    }

    return response;
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

    if (error instanceof GoogleEmailNotVerifiedError) {
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

    if (error instanceof GoogleAuthConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: 503 }
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

  // Comprobar si Google OAuth está configurado en el servidor
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "GOOGLE_OAUTH_NOT_CONFIGURED",
        message: "El servicio de autenticación con Google no está configurado en el servidor",
      },
      { status: 503 }
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
