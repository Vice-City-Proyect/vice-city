import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { authenticateUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
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
    const user = await authenticateUser(validationResult.data);

    // 5. Respuesta exitosa (200 OK con id, email, name y role)
    return NextResponse.json(
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

    // 6. Error no controlado (500 Internal Server Error)
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

