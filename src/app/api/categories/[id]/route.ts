import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getCategoryById,
  updateCategory,
  deactivateCategory,
} from "@/features/services/categories.repository";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";

/**
 * GET /api/categories/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await getCategoryById(id);

    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al consultar la categoría", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH / PUT /api/categories/[id]
 * Edita una categoría. Solo accesible para ADMIN.
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

    const updated = await updateCategory(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al actualizar la categoría", details: error.message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Desactiva una categoría (soft delete). Solo accesible para ADMIN.
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
    const deactivated = await deactivateCategory(id);

    if (!deactivated) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Categoría desactivada exitosamente.",
      data: deactivated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al desactivar la categoría", details: error.message },
      { status: 500 }
    );
  }
}
