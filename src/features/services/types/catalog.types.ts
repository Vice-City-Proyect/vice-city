/**
 * Tipos para el Catálogo de Servicios y Categorías (HU20)
 * Vice City - Features: Services
 */

export interface ServiceItem {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  duration_minutes: number;
  capacity: number;
  image_url: string | null;
  is_active: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CategoryWithServices {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  services: ServiceItem[];
}

export interface CatalogResponseData {
  categories: CategoryWithServices[];
  totalServices: number;
}

