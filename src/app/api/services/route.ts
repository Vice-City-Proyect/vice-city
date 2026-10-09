import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getServices,
  createService,
} from "@/features/services/services.repository";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";

/**
 * GET /api/services
 * Lista servicios. Clientes ven activos; ADMIN puede usar ?all=true
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get("all") === "true";
    const categoryId = searchParams.get("categoryId") || undefined;

    const services = await getServices({ includeInactive, categoryId });
    return NextResponse.json({ success: true, data: services });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al consultar servicios", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Crea un nuevo servicio (FT-03 / SRS).
 * Solo accesible para ADMIN (403 si no tiene rol ADMIN).
 * Rechaza aforos <= 0 con error 400.
 */
export async function POST(request: NextRequest) {
  // Verificación estricta de rol ADMIN (Criterio de Aceptación: usuario sin ADMIN recibe 403)
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const body = await request.json();

    // Validaciones de campos obligatorios
    if (!body.category_id || typeof body.category_id !== "string") {
      return NextResponse.json(
        { error: "El category_id es obligatorio" },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "El nombre del servicio es obligatorio" },
        { status: 400 }
      );
    }

    if (body.price === undefined || typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json(
        { error: "El precio debe ser un número mayor o igual a cero" },
        { status: 400 }
      );
    }

    // Criterio de Aceptación: Un aforo menor o igual a cero es rechazado
    if (body.capacity === undefined || typeof body.capacity !== "number" || body.capacity <= 0) {
      return NextResponse.json(
        { error: "El aforo (max_capacity) debe ser mayor a cero" },
        { status: 400 }
      );
    }

    const created = await createService({
      category_id: body.category_id,
      name: body.name,
      slug: body.slug,
      description: body.description,
      price: body.price,
      duration_minutes: body.duration_minutes,
      capacity: body.capacity,
      image_url: body.image_url,
      modality: body.modality,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al crear el servicio", details: error.message },
      { status: 400 }
    );
  }
}
