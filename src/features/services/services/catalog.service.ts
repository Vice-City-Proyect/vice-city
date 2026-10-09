/**
 * Servicio de Lógica de Negocio: Catálogo de Servicios y Categorías (HU20)
 * Vice City - Features: Services
 */

import { prisma } from "@/lib/prisma";
import type {
  CategoryWithServices,
  CatalogResponseData,
  ServiceItem,
} from "../types/catalog.types";

export interface CatalogServiceDependencies {
  findCategoriesFn?: (includeInactive?: boolean) => Promise<any[]>;
  findServicesFn?: (categoryId?: string, includeInactive?: boolean) => Promise<any[]>;
}

export class CatalogService {
  private findCategoriesFn: (includeInactive?: boolean) => Promise<any[]>;
  private findServicesFn: (categoryId?: string, includeInactive?: boolean) => Promise<any[]>;

  constructor(dependencies: CatalogServiceDependencies = {}) {
    this.findCategoriesFn =
      dependencies.findCategoriesFn ??
      (async (includeInactive = false) => {
        return prisma.categories.findMany({
          where: includeInactive ? {} : { is_active: true },
          orderBy: { sort_order: "asc" },
          include: {
            services: {
              where: includeInactive ? {} : { is_active: true },
              orderBy: { name: "asc" },
            },
          },
        });
      });

    this.findServicesFn =
      dependencies.findServicesFn ??
      (async (categoryId?: string, includeInactive = false) => {
        return prisma.services.findMany({
          where: {
            ...(includeInactive ? {} : { is_active: true }),
            ...(categoryId ? { category_id: categoryId } : {}),
          },
          include: { categories: true },
          orderBy: { name: "asc" },
        });
      });
  }

  /**
   * Obtiene el catálogo público completo de categorías y sus servicios activos asociados con precio (RN-004).
   *
   * @param includeInactive Si es true, incluye registros inactivos (por defecto false)
   * @returns CatalogResponseData con las categorías estructuradas y conteo de servicios
   */
  async getPublicCatalog(includeInactive = false): Promise<CatalogResponseData> {
    const rawCategories = await this.findCategoriesFn(includeInactive);

    let totalServices = 0;
    const categories: CategoryWithServices[] = rawCategories.map((cat) => {
      const services: ServiceItem[] = (cat.services || []).map((srv: any) => {
        totalServices++;
        return {
          id: srv.id,
          category_id: srv.category_id,
          name: srv.name,
          slug: srv.slug,
          description: srv.description,
          price: Number(srv.price),
          currency: srv.currency || "COP",
          duration_minutes: srv.duration_minutes || 60,
          capacity: srv.capacity || 1,
          image_url: srv.image_url,
          is_active: Boolean(srv.is_active),
          category: {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
          },
        };
      });

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sort_order: cat.sort_order,
        is_active: Boolean(cat.is_active),
        services,
      };
    });

    return {
      categories,
      totalServices,
    };
  }

  /**
   * Obtiene la lista plana de servicios activos, opcionalmente filtrados por categoría.
   */
  async getServices(
    categoryId?: string,
    includeInactive = false
  ): Promise<ServiceItem[]> {
    const rawServices = await this.findServicesFn(categoryId, includeInactive);

    return rawServices.map((srv) => ({
      id: srv.id,
      category_id: srv.category_id,
      name: srv.name,
      slug: srv.slug,
      description: srv.description,
      price: Number(srv.price),
      currency: srv.currency || "COP",
      duration_minutes: srv.duration_minutes || 60,
      capacity: srv.capacity || 1,
      image_url: srv.image_url,
      is_active: Boolean(srv.is_active),
      category: srv.categories
        ? {
            id: srv.categories.id,
            name: srv.categories.name,
            slug: srv.categories.slug,
          }
        : undefined,
    }));
  }
}

// Instancia singleton por defecto
export const catalogService = new CatalogService();

