import { prisma } from "@/lib/prisma";
import type { services, Prisma } from "@prisma/client";
import { slugify } from "./categories.repository";
import type {
  CreateServiceInput,
  UpdateServiceInput,
  DeleteServiceResult,
} from "./types";

/**
 * Obtiene todos los servicios con su categoría asociada.
 */
export async function getServices(
  options: { includeInactive?: boolean; categoryId?: string } = {}
): Promise<services[]> {
  const where: Prisma.servicesWhereInput = {};

  if (!options.includeInactive) {
    where.is_active = true;
  }
  if (options.categoryId) {
    where.category_id = options.categoryId;
  }

  return prisma.services.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      categories: true,
    },
  });
}

/**
 * Obtiene un servicio por su ID o por su Slug.
 */
export async function getServiceById(idOrSlug: string): Promise<services | null> {
  if (!idOrSlug?.trim()) return null;

  return prisma.services.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      categories: true,
      service_schedules: true,
    },
  });
}

/**
 * Crea un nuevo servicio (FT-03 / RN-004).
 * Valida estrictamente que el aforo (capacity) sea mayor a cero.
 */
export async function createService(input: CreateServiceInput): Promise<services> {
  // Validación de aforo (Criterio de Aceptación: aforo menor o igual a cero es rechazado)
  if (!input.capacity || input.capacity <= 0) {
    throw new Error("El aforo (max_capacity) debe ser mayor a cero");
  }

  if (input.price < 0) {
    throw new Error("El precio no puede ser negativo");
  }

  const name = input.name.trim();
  const slug = input.slug?.trim() || slugify(name);

  const metadata = input.modality ? { modality: input.modality } : {};

  return prisma.services.create({
    data: {
      category_id: input.category_id,
      name,
      slug,
      description: input.description?.trim() || null,
      price: input.price,
      duration_minutes: input.duration_minutes ?? 60,
      capacity: input.capacity,
      image_url: input.image_url?.trim() || null,
      is_active: true,
      metadata,
    },
    include: {
      categories: true,
    },
  });
}

/**
 * Actualiza un servicio existente.
 * Valida aforo si se envía capacity.
 */
export async function updateService(
  id: string,
  input: UpdateServiceInput
): Promise<services | null> {
  if (!id?.trim()) return null;

  if (input.capacity !== undefined && input.capacity <= 0) {
    throw new Error("El aforo (max_capacity) debe ser mayor a cero");
  }

  if (input.price !== undefined && input.price < 0) {
    throw new Error("El precio no puede ser negativo");
  }

  const data: Prisma.servicesUpdateInput = {};

  if (input.category_id) {
    data.categories = { connect: { id: input.category_id } };
  }
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.slug !== undefined) data.slug = input.slug.trim();
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.price !== undefined) data.price = input.price;
  if (input.duration_minutes !== undefined) data.duration_minutes = input.duration_minutes;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.image_url !== undefined) data.image_url = input.image_url?.trim() || null;
  if (input.is_active !== undefined) data.is_active = input.is_active;
  if (input.modality !== undefined) {
    data.metadata = { modality: input.modality };
  }

  try {
    return await prisma.services.update({
      where: { id },
      data,
      include: {
        categories: true,
      },
    });
  } catch (error) {
    return null;
  }
}

/**
 * Desactiva un servicio (soft delete) garantizando RN-006.
 *
 * RN-006 / Caso límite: Desactivar un servicio con reservas futuras
 * no las borra ni las reasigna. Las reservas permanecen intactas.
 */
export async function deactivateService(id: string): Promise<services | null> {
  return updateService(id, { is_active: false });
}

/**
 * Intenta eliminar un servicio si no tiene reservas; si tiene reservas,
 * lo desactiva automáticamente para no romper la integridad ni borrar reservas (RN-006).
 */
export async function deleteOrDeactivateService(id: string): Promise<DeleteServiceResult> {
  if (!id?.trim()) {
    return {
      success: false,
      action: "DEACTIVATED",
      serviceId: id,
      message: "ID de servicio inválido",
    };
  }

  // 1. Verificar si existen reservas asociadas
  const bookingsCount = await prisma.bookings.count({
    where: { service_id: id },
  });

  if (bookingsCount > 0) {
    // Regla de Negocio RN-006: No eliminar servicios con reservas; desactivarlos.
    // Desactivar preserva todas las reservas existentes sin alterarlas.
    await prisma.services.update({
      where: { id },
      data: { is_active: false },
    });

    return {
      success: true,
      action: "DEACTIVATED",
      serviceId: id,
      activeBookingsCount: bookingsCount,
      message: `El servicio tiene ${bookingsCount} reserva(s) asociada(s). Fue desactivado de forma segura sin borrar ni reasignar las reservas (RN-006).`,
    };
  }

  // Si no tiene reservas, puede eliminarse limpiamente
  try {
    await prisma.services.delete({
      where: { id },
    });

    return {
      success: true,
      action: "DELETED",
      serviceId: id,
      message: "Servicio eliminado exitosamente.",
    };
  } catch (error) {
    // Si falla por foreign keys adicionales, desactivar como fallback seguro
    await prisma.services.update({
      where: { id },
      data: { is_active: false },
    });

    return {
      success: true,
      action: "DEACTIVATED",
      serviceId: id,
      message: "El servicio fue desactivado para proteger la integridad relacional.",
    };
  }
}
