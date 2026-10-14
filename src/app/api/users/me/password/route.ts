import { NextRequest, NextResponse } from "next/server";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/password";
import { changePasswordSchema } from "@/features/users/schemas/password.schema";
import {
  resolveSession,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";

interface PasswordRouteContext extends SessionAwareRouteContext {
  prismaOverride?: Pick<typeof defaultPrisma, "users">;
}

function errorResponse(status: number, error: string, message: string, details?: unknown) {
  return NextResponse.json(
    { success: false, error, message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * PATCH /api/users/me/password
 * Cambia la contraseña del usuario autenticado. Exige la contraseña actual y
 * guarda la nueva con bcrypt. Las cuentas creadas solo con Google no tienen
 * contraseña local, así que no pueden cambiarla desde aquí.
 */
export async function PATCH(request: NextRequest, context?: PasswordRouteContext) {
  try {
    const session = await resolveSession(context);
    if (!session) {
      return errorResponse(
        401,
        "UNAUTHORIZED",
        "Se requiere una sesión activa para realizar esta acción"
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        400,
        "MALFORMED_JSON",
        "El cuerpo de la solicitud no es un JSON válido o está vacío"
      );
    }

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        validation.error.issues[0]?.message ?? "Datos de contraseña inválidos",
        validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      );
    }

    const db = context?.prismaOverride ?? defaultPrisma;
    const user = await db.users.findUnique({
      where: { id: session.id },
      select: { id: true, password_hash: true },
    });

    if (!user) {
      return errorResponse(404, "USER_NOT_FOUND", "El usuario no fue encontrado en el sistema");
    }

    if (!user.password_hash) {
      return errorResponse(
        400,
        "PASSWORD_NOT_SET",
        "Tu cuenta usa inicio de sesión con Google y no tiene contraseña local para cambiar"
      );
    }

    const matches = await comparePassword(validation.data.current_password, user.password_hash);
    if (!matches) {
      return errorResponse(400, "INVALID_CURRENT_PASSWORD", "La contraseña actual no es correcta");
    }

    await db.users.update({
      where: { id: user.id },
      data: { password_hash: await hashPassword(validation.data.new_password) },
      select: { id: true },
    });

    return NextResponse.json(
      { success: true, message: "Contraseña actualizada exitosamente" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API_USERS_ME_PASSWORD_ERROR]", error);
    return errorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "Ocurrió un error al actualizar la contraseña"
    );
  }
}
