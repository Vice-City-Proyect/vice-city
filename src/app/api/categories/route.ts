import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getCategories,
  createCategory,
} from "@/features/services/categories.repository";
import { requireAdminRole, unauthorizedResponse } from "@/features/services/auth-guard";

/**
 * GET /api/categories
 * Lista todas las categorías (público / cliente ve activas; ADMIN puede ver todas con ?all=true)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get("all") === "true";

    const categories = await getCategories(includeInactive);
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al consultar categorías", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Crea una nueva categoría. Solo accesible para ADMIN (403 si no es ADMIN).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request);
  if (!auth.authorized) {
    return unauthorizedResponse(auth);
  }

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "El nombre de la categoría es obligatorio" },
        { status: 400 }
      );
    }

    const created = await createCategory({
      name: body.name,
      slug: body.slug,
      description: body.description,
      sort_order: body.sort_order,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al crear la categoría", details: error.message },
      { status: 400 }
    );
  }
}
