import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { EmailNotVerifiedError } from "@/features/auth/errors/auth.errors";
import {
  authenticateUser,
  createSessionToken,
  getSessionCookieConfig,
  isSecureAuthContext,
} from "@/lib/auth";

/**
 * Permite inyectar la función de autenticación en pruebas unitarias aisladas,
 * sin depender de una base de datos real. En producción (Next.js invoca el
 * handler con request y context de ruta) siempre se usa `authenticateUser`.
 */
export interface LoginRouteContext {
  params?: Promise<Record<string, string>>;
  authenticateUserOverride?: typeof authenticateUser;
}

export async function POST(
  request: NextRequest,
  contextOrOverride?: LoginRouteContext | typeof authenticateUser | unknown
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
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de inicio de sesión inválidos",
          details,
        },
        { status: 400 }
      );
    }

    // 4. Delegación a la capa de lógica de negocio (sin acceso directo a Prisma)
    const authFn: typeof authenticateUser =
      typeof contextOrOverride === "function"
        ? (contextOrOverride as typeof authenticateUser)
        : typeof (contextOrOverride as LoginRouteContext)?.authenticateUserOverride === "function"
        ? (contextOrOverride as LoginRouteContext).authenticateUserOverride!
        : typeof (contextOrOverride as { authenticateUser?: unknown })?.authenticateUser === "function"
        ? ((contextOrOverride as { authenticateUser: typeof authenticateUser }).authenticateUser)
        : authenticateUser;

    const user = await authFn(validationResult.data);

    // 5. Generar token de sesión NextAuth (JWE) y configuración de cookie
    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email ?? validationResult.data.email,
      name: user.name ?? undefined,
      role: (user as { role?: string }).role || "CLIENT",
    });
    const isSecure = isSecureAuthContext(request);
    const cookieConfig = getSessionCookieConfig({ isSecure });

    // 6. Respuesta exitosa (200 OK con id, email, name, role y Set-Cookie)
    const response = NextResponse.json(
      {
        success: true,
        message: "Inicio de sesión exitoso",
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

    // Adjuntar la cookie de sesión compatible con NextAuth y middleware
    response.cookies.set({
      name: cookieConfig.name,
      value: sessionToken,
      ...cookieConfig.options,
    });

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

    if (
      error instanceof EmailNotVerifiedError ||
      (error instanceof Error &&
        ((error as { code?: string }).code === "EMAIL_NOT_VERIFIED" ||
          error.message.includes("Debes confirmar tu correo") ||
          error.message.includes("EMAIL_NOT_VERIFIED")))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_NOT_VERIFIED",
          message: error instanceof Error ? error.message : "Debes confirmar tu correo electrónico antes de iniciar sesión.",
        },
        { status: 403 }
      );
    }

    if (error instanceof Error) {
      // Errores de credenciales inválidas o rol no autorizado (401 Unauthorized)
      if (
        error.message.includes("Credenciales incorrectas") ||
        error.message.includes("no posee un rol válido")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_CREDENTIALS",
            message: error.message,
          },
          { status: 401 }
        );
      }

      // Errores de validación disparados por la lógica de negocio (400 Bad Request)
      if (
        error.message.includes("obligatorio") ||
        error.message.includes("no puede estar vací")
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
    }

    // Error no controlado (500 Internal Server Error)
    console.error("[API_AUTH_LOGIN_ERROR]", error);
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
