import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  resolveSession,
  hasAnyRole,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";

const updateUserSchema = z
  .object({
    is_active: z.boolean().optional(),
    full_name: z.string().min(1, "El nombre completo no puede estar vacío").optional(),
    phone: z.string().nullable().optional(),
    document_id: z.string().nullable().optional(),
  })
  .strict();

export interface AdminUserRouteContext extends SessionAwareRouteContext {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Endpoint GET /api/admin/users/[id]
 * Consulta un usuario por ID. Exclusivo para ADMIN.
 */
export async function GET(
  _request: NextRequest,
  context: AdminUserRouteContext
) {
  try {
    const session = await resolveSession(context);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Se requiere una sesión activa" },
        { status: 401 }
      );
    }
    if (!hasAnyRole(session, ["ADMIN"])) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Acceso denegado: se requieren permisos de administrador" },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await context.params;
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST", message: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.users.findUnique({
      where: { id: targetUserId },
      include: { roles: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        phone: targetUser.phone,
        document_id: targetUser.document_id,
        is_active: targetUser.is_active,
        role: targetUser.roles?.name || "CLIENT",
        created_at: targetUser.created_at,
        updated_at: targetUser.updated_at,
      },
    });
  } catch (error: any) {
    console.error("[API_ADMIN_USER_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Error al consultar usuario" },
      { status: 500 }
    );
  }
}

/**
 * Endpoint PATCH /api/admin/users/[id]
 * Permite a un administrador actualizar el estado (activar/desactivar) y datos de cualquier usuario.
 * Exclusivo para ADMIN.
 */
export async function PATCH(
  request: NextRequest,
  context: AdminUserRouteContext
) {
  try {
    const session = await resolveSession(context);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Se requiere una sesión activa" },
        { status: 401 }
      );
    }
    if (!hasAnyRole(session, ["ADMIN"])) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Acceso denegado: se requieren permisos de administrador" },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await context.params;
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST", message: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_JSON", message: "Cuerpo JSON inválido o vacío" },
        { status: 400 }
      );
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de usuario inválidos",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const targetUser = await prisma.users.findUnique({
      where: { id: targetUserId },
      include: { roles: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const { is_active, full_name, phone, document_id } = parsed.data;

    // Regla de seguridad: el administrador no puede desactivarse a sí mismo
    if (
      is_active === false &&
      (session.id === targetUserId ||
        (session.email && session.email.toLowerCase() === targetUser.email.toLowerCase()))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "SELF_DEACTIVATION_PROHIBITED",
          message: "No puedes desactivar tu propia cuenta de administrador",
        },
        { status: 400 }
      );
    }

    // Regla de seguridad: no desactivar al último administrador activo del sistema
    if (is_active === false && targetUser.roles?.name?.toUpperCase() === "ADMIN") {
      const activeAdminsCount = await prisma.users.count({
        where: {
          roles: { name: { equals: "ADMIN", mode: "insensitive" } },
          is_active: true,
        },
      });

      if (activeAdminsCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: "CANNOT_DEACTIVATE_LAST_ADMIN",
            message: "No se puede desactivar al único administrador activo del sistema",
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = { updated_at: new Date() };
    if (is_active !== undefined) updateData.is_active = is_active;
    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (document_id !== undefined) updateData.document_id = document_id ? document_id.trim() : null;

    const updated = await prisma.users.update({
      where: { id: targetUserId },
      data: updateData,
      include: { roles: true },
    });

    // Registrar en audit_logs
    try {
      let auditAction = "USER_UPDATED";
      if (is_active === false) auditAction = "USER_DEACTIVATED";
      if (is_active === true) auditAction = "USER_ACTIVATED";

      await prisma.audit_logs.create({
        data: {
          user_id: session.id || null,
          action: auditAction,
          entity: "users",
          entity_id: targetUserId,
          details: {
            previous_is_active: targetUser.is_active,
            new_is_active: updated.is_active,
            role: targetUser.roles?.name,
            email: targetUser.email,
            performed_by: session.id,
          },
        },
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar la acción en audit_logs:", auditErr);
    }

    const message =
      is_active === false
        ? "Usuario desactivado exitosamente"
        : is_active === true
        ? "Usuario activado exitosamente"
        : "Usuario actualizado exitosamente";

    return NextResponse.json({
      success: true,
      message,
      data: {
        id: updated.id,
        email: updated.email,
        full_name: updated.full_name,
        phone: updated.phone,
        document_id: updated.document_id,
        is_active: updated.is_active,
        role: updated.roles?.name || "CLIENT",
        updated_at: updated.updated_at,
      },
    });
  } catch (error: any) {
    console.error("[API_ADMIN_USER_UPDATE_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Error al actualizar el usuario" },
      { status: 500 }
    );
  }
}

/**
 * Endpoint DELETE /api/admin/users/[id]
 * Desactiva un usuario. Exclusivo para ADMIN.
 */
export async function DELETE(
  request: NextRequest,
  context: AdminUserRouteContext
) {
  // Reutiliza la lógica de desactivación
  return PATCH(
    new NextRequest(request.url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    }),
    context
  );
}

