import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getServiceById,
  updateService,
  deactivateService,
  deleteOrDeactivateService,
} from "@/features/services/services.repository";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";

/**
 * GET /api/services/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await getServiceById(id);

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al consultar el servicio", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/services/[id]
 * Edita un servicio. Solo accesible para ADMIN.
 * Rechaza aforos <= 0.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Criterio de Aceptación: Aforo <= 0 rechazado
    if (body.capacity !== undefined && (typeof body.capacity !== "number" || body.capacity <= 0)) {
      return NextResponse.json(
        { error: "El aforo (max_capacity) debe ser mayor a cero" },
        { status: 400 }
      );
    }

    const updated = await updateService(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al actualizar el servicio", details: error.message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/services/[id]
 * Desactiva o elimina un servicio de forma segura (RN-006 / FT-03).
 *
 * Criterio de aceptación / Caso límite:
 * Desactivar un servicio con reservas futuras no las borra ni las reasigna.
 * Si tiene reservas, no se elimina; se desactiva.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const { id } = await params;
    const result = await deleteOrDeactivateService(id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al procesar el servicio", details: error.message },
      { status: 500 }
    );
  }
}
