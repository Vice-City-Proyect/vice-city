import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/features/users/schemas/profile.schema";
import { normalizeRole } from "@/features/auth/permissions/route-permissions";

interface RouteContext {
  params?: unknown;
  sessionOverride?: Session | null;
  prismaOverride?: Pick<typeof defaultPrisma, "users">;
}

/**
 * Rol SRS del usuario: el de la BD (con alias legacy "customer" -> "CLIENT") y,
 * si no es válido, el de la sesión. Nunca inventa un rol que el usuario no tiene.
 */
function toSrsRole(dbRole?: string | null, sessionRole?: string | null) {
  return normalizeRole(dbRole) ?? normalizeRole(sessionRole);
}

async function resolveSession(request: NextRequest, context?: RouteContext) {
  if (context?.sessionOverride !== undefined) {
    return context.sessionOverride;
  }
  try {
    return await getServerSession(authOptions);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("outside a request scope")) {
      return null;
    }
    throw err;
  }
}

/**
 * GET /api/users/me
 * Obtiene la información del perfil del usuario autenticado en tiempo real desde la BD.
 */
export async function GET(request: NextRequest, context?: RouteContext) {
  try {
    const session = await resolveSession(request, context);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Se requiere una sesión activa para acceder a este recurso",
        },
        { status: 401 }
      );
    }

    const db = context?.prismaOverride || defaultPrisma;
    const sessionUserId = session.user.id;
    const sessionUserEmail = session.user.email;

    const user = await db.users.findFirst({
      where: {
        OR: [
          ...(sessionUserId ? [{ id: sessionUserId }] : []),
          ...(sessionUserEmail
            ? [{ email: { equals: sessionUserEmail, mode: "insensitive" as const } }]
            : []),
        ],
      },
      include: { roles: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "El usuario no fue encontrado en el sistema",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          full_name: user.full_name,
          name: user.full_name,
          email: user.email,
          phone: user.phone ?? null,
          document_id: user.document_id ?? null,
          role: toSrsRole(user.roles?.name, session.user.role),
          status: user.is_active ? "ACTIVE" : "INACTIVE",
          created_at: user.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API_USERS_ME_GET_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al obtener la información del perfil",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me
 * Actualiza la información personal del usuario autenticado (nombre y teléfono) en la BD.
 */
export async function PATCH(request: NextRequest, context?: RouteContext) {
  try {
    const session = await resolveSession(request, context);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Se requiere una sesión activa para realizar esta acción",
        },
        { status: 401 }
      );
    }

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

    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      const details = validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de perfil inválidos",
          details,
        },
        { status: 400 }
      );
    }

    const db = context?.prismaOverride || defaultPrisma;
    const sessionUserId = session.user.id;
    const sessionUserEmail = session.user.email;

    const user = await db.users.findFirst({
      where: {
        OR: [
          ...(sessionUserId ? [{ id: sessionUserId }] : []),
          ...(sessionUserEmail
            ? [{ email: { equals: sessionUserEmail, mode: "insensitive" as const } }]
            : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "El usuario no fue encontrado en el sistema",
        },
        { status: 404 }
      );
    }

    const newName = validation.data.full_name ?? validation.data.name;
    const updateData: { full_name?: string; phone?: string | null } = {};

    if (newName !== undefined) {
      updateData.full_name = newName.trim();
    }
    if (validation.data.phone !== undefined) {
      updateData.phone = validation.data.phone?.trim() || null;
    }

    const updatedUser = await db.users.update({
      where: { id: user.id },
      data: updateData,
      include: { roles: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Información de perfil actualizada exitosamente",
        data: {
          id: updatedUser.id,
          full_name: updatedUser.full_name,
          name: updatedUser.full_name,
          email: updatedUser.email,
          phone: updatedUser.phone ?? null,
          document_id: updatedUser.document_id ?? null,
          role: toSrsRole(updatedUser.roles?.name, session.user.role),
          status: updatedUser.is_active ? "ACTIVE" : "INACTIVE",
          created_at: updatedUser.created_at,
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

    console.error("[API_USERS_ME_PATCH_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error al actualizar la información del perfil",
      },
      { status: 500 }
    );
  }
}
