import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getEmployeeById,
  updateEmployee,
  setEmployeeStatus,
} from "@/features/employees/employees.repository";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";

/**
 * GET /api/employees/[id]
 * Consulta un empleado por su ID. Exclusivo para ADMIN.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const { id } = await params;
    const employee = await getEmployeeById(id);

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al consultar el empleado", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employees/[id]
 * Actualiza o cambia el estado (desactivar/reactivar) de un empleado.
 * Exclusivo para ADMIN.
 *
 * Rechaza autodesactivación del administrador con 400 Bad Request.
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

    const updated = await updateEmployee(id, body, auth.userId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar el empleado" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/employees/[id]
 * Desactiva un empleado. Exclusivo para ADMIN.
 *
 * Caso límite: El administrador no puede desactivarse a sí mismo.
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
    const deactivated = await setEmployeeStatus(id, false, auth.userId);

    return NextResponse.json({
      success: true,
      message: "Empleado desactivado exitosamente",
      data: deactivated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al desactivar el empleado" },
      { status: 400 }
    );
  }
}
