import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createEmployee,
  getEmployees,
} from "@/features/employees/employees.repository";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";

/**
 * GET /api/employees
 * Lista los empleados del complejo (TICKET_SELLER, QR_VALIDATOR).
 * Exclusivo para usuarios con rol ADMIN.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get("all") === "true" || searchParams.get("includeInactive") === "true";
    const role = searchParams.get("role") || undefined;
    const search = searchParams.get("search") || undefined;

    const employees = await getEmployees({
      includeInactive,
      role,
      search,
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al consultar la lista de empleados", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees
 * Crea un nuevo empleado con rol TICKET_SELLER o QR_VALIDATOR.
 * Exclusivo para usuarios con rol ADMIN.
 *
 * Rechaza:
 * - Roles no permitidos (ej. ADMIN, CLIENT) con 400 Bad Request.
 * - Correos duplicados con 400 Bad Request.
 * - Entradas vacías con 400 Bad Request.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const body = await request.json();

    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json({ error: "El correo electrónico es obligatorio" }, { status: 400 });
    }

    if (!body.full_name || typeof body.full_name !== "string" || !body.full_name.trim()) {
      return NextResponse.json({ error: "El nombre completo es obligatorio" }, { status: 400 });
    }

    if (!body.password || typeof body.password !== "string" || !body.password.trim()) {
      return NextResponse.json({ error: "La contraseña es obligatoria" }, { status: 400 });
    }

    if (!body.role || typeof body.role !== "string" || !body.role.trim()) {
      return NextResponse.json(
        { error: "El rol es obligatorio. Debe ser TICKET_SELLER o QR_VALIDATOR" },
        { status: 400 }
      );
    }

    const created = await createEmployee(
      {
        email: body.email,
        full_name: body.full_name,
        password: body.password,
        role: body.role,
        phone: body.phone,
        document_id: body.document_id,
      },
      auth.userId
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al crear empleado" },
      { status: 400 }
    );
  }
}
