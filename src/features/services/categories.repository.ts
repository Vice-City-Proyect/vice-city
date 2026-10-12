import { prisma } from "@/lib/prisma";
import type { categories, Prisma } from "@prisma/client";
import type { CreateCategoryInput, UpdateCategoryInput } from "./types";

/**
 * Genera un slug seguro a partir de un texto.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve acentos
    .replace(/\s+/g, "-") // Espacios a guiones
    .replace(/[^\w\-]+/g, "") // Remueve caracteres no alfanuméricos
    .replace(/\-\-+/g, "-") // Múltiples guiones a uno
    .replace(/^-+/, "") // Remueve guiones iniciales
    .replace(/-+$/, ""); // Remueve guiones finales
}

/**
 * Obtiene todas las categorías (activas y/o todas para ADMIN).
 */
export async function getCategories(includeInactive = false): Promise<categories[]> {
  const where: Prisma.categoriesWhereInput = includeInactive ? {} : { is_active: true };
  return prisma.categories.findMany({
    where,
    orderBy: { sort_order: "asc" },
    include: {
      services: {
        where: includeInactive ? {} : { is_active: true },
      },
    },
  });
}

/**
 * Obtiene una categoría por su ID o por su Slug.
 */
export async function getCategoryById(idOrSlug: string): Promise<categories | null> {
  if (!idOrSlug?.trim()) return null;

  return prisma.categories.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      services: true,
    },
  });
}

/**
 * Crea una nueva categoría.
 */
export async function createCategory(input: CreateCategoryInput): Promise<categories> {
  const name = input.name.trim();
  const slug = input.slug?.trim() || slugify(name);

  return prisma.categories.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      sort_order: input.sort_order ?? 0,
      is_active: true,
    },
  });
}

/**
 * Actualiza una categoría existente.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<categories | null> {
  if (!id?.trim()) return null;

  const data: Prisma.categoriesUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.slug !== undefined) data.slug = input.slug.trim();
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.sort_order !== undefined) data.sort_order = input.sort_order;
  if (input.is_active !== undefined) data.is_active = input.is_active;

  try {
    return await prisma.categories.update({
      where: { id },
      data,
    });
  } catch (error) {
    return null;
  }
}

/**
 * Desactiva una categoría (soft delete) en lugar de destruirla.
 */
export async function deactivateCategory(id: string): Promise<categories | null> {
  return updateCategory(id, { is_active: false });
}
