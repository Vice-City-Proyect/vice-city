import type {
  BookingModality,
  PriceUnit,
  Service,
  ServiceCategory,
} from "@/types/service";

/**
 * Registro de categoría tal como lo devuelve `GET /api/categories`.
 */
export interface BackendCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Registro de servicio tal como lo devuelve `GET /api/services`.
 */
export interface BackendServiceRecord {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number | string;
  currency?: string;
  duration_minutes?: number;
  capacity: number;
  image_url?: string | null;
  is_active: boolean;
  metadata?: unknown;
  created_at?: string;
  updated_at?: string;
  categories?: BackendCategoryRecord | null;
}

export type BackendServiceModality = "PER_PERSON_HOUR" | "EXCLUSIVE_RESERVATION";

/**
 * Payload aceptado por `POST /api/services` y `PATCH /api/services/[id]`.
 */
export interface ServiceMutationPayload {
  category_id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  image_url: string;
  modality: BackendServiceModality;
}

const DEFAULT_SCHEDULE = { open: "08:00", close: "17:00", closedDays: [1] };

const FALLBACK_IMAGE_BY_CATEGORY: Record<ServiceCategory, string> = {
  POOL: "/piscina-adultos.jpeg",
  SOCCER_LARGE: "/cancha-11.jpeg",
  SOCCER_MICRO: "/cancha-micro.jpeg",
  MULTI_COURT: "/polideportiva.jpeg",
  GYM: "/gym.jpeg",
  WET_AREA: "/sauna.jpeg",
};

/**
 * Slug de la categoría del backend asociado a cada categoría de la UI.
 * Las canchas (fútbol grande, microfútbol y multipropósito) comparten la
 * categoría "canchas" en la base de datos.
 */
const CATEGORY_SLUG_BY_UI: Record<ServiceCategory, string> = {
  POOL: "piscinas",
  SOCCER_LARGE: "canchas",
  SOCCER_MICRO: "canchas",
  MULTI_COURT: "canchas",
  GYM: "gimnasio",
  WET_AREA: "zona-humeda",
};

function readModality(metadata: unknown): BackendServiceModality {
  if (metadata && typeof metadata === "object" && "modality" in metadata) {
    const value = (metadata as Record<string, unknown>).modality;
    if (value === "EXCLUSIVE_RESERVATION" || value === "PER_PERSON_HOUR") {
      return value;
    }
  }
  return "PER_PERSON_HOUR";
}

function resolveUiModality(modality: BackendServiceModality): BookingModality {
  return modality === "EXCLUSIVE_RESERVATION" ? "FIXED_HOUR" : "PER_PERSON_HOUR";
}

/**
 * Convierte un valor a número finito; si no es numérico devuelve el respaldo.
 * Evita propagar `NaN` a la UI cuando el backend envía un precio inválido.
 */
function toFiniteNumber(
  value: number | string | undefined | null,
  fallback = 0
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolvePriceUnit(modality: BookingModality): PriceUnit {
  return modality === "FIXED_HOUR" ? "HOUR" : "PERSON_HOUR";
}

function resolveUiCategory(
  record: BackendServiceRecord
): ServiceCategory {
  const slug = record.categories?.slug?.toLowerCase() ?? "";

  if (slug === "canchas") {
    const text = `${record.slug ?? ""} ${record.name ?? ""}`.toLowerCase();
    if (text.includes("micro")) return "SOCCER_MICRO";
    if (text.includes("futbol") && text.includes("grande")) return "SOCCER_LARGE";
    if (text.includes("fútbol") && text.includes("grande")) return "SOCCER_LARGE";
    return "MULTI_COURT";
  }

  switch (slug) {
    case "piscinas":
      return "POOL";
    case "gimnasio":
      return "GYM";
    case "zona-humeda":
      return "WET_AREA";
    default:
      return fallbackCategoryFromText(record);
  }
}

function fallbackCategoryFromText(record: BackendServiceRecord): ServiceCategory {
  const text = `${record.slug ?? ""} ${record.name ?? ""}`.toLowerCase();
  if (text.includes("piscina")) return "POOL";
  if (text.includes("gimnasio") || text.includes("gym")) return "GYM";
  if (text.includes("sauna") || text.includes("humeda") || text.includes("húmeda")) {
    return "WET_AREA";
  }
  if (text.includes("micro")) return "SOCCER_MICRO";
  if (text.includes("futbol") || text.includes("fútbol")) return "SOCCER_LARGE";
  return "MULTI_COURT";
}

/**
 * Convierte un registro del backend al modelo de UI `Service`.
 *
 * Nota: el backend no expone horarios ni "recurso físico" en el listado, por lo
 * que se aplican valores por defecto coherentes con la operación (8:00–17:00,
 * mantenimiento los lunes) y el nombre del servicio como recurso.
 */
export function mapServiceRecordToUi(record: BackendServiceRecord): Service {
  const modality = resolveUiModality(readModality(record.metadata));
  const category = resolveUiCategory(record);

  return {
    id: record.id,
    name: record.name,
    category,
    description: record.description ?? "",
    price: toFiniteNumber(record.price),
    priceUnit: resolvePriceUnit(modality),
    modality,
    capacity: record.capacity,
    status: record.is_active ? "ACTIVE" : "INACTIVE",
    schedule: { ...DEFAULT_SCHEDULE },
    image: record.image_url?.trim() || FALLBACK_IMAGE_BY_CATEGORY[category],
    resource: record.name,
  };
}

/**
 * Obtiene el `category_id` del backend correspondiente a la categoría de la UI.
 * Devuelve `null` si no existe una categoría compatible.
 */
export function resolveCategoryId(
  category: ServiceCategory,
  categories: BackendCategoryRecord[]
): string | null {
  const slug = CATEGORY_SLUG_BY_UI[category];
  const match = categories.find((item) => item.slug?.toLowerCase() === slug);
  return match?.id ?? null;
}

/**
 * Construye el payload de creación/actualización a partir del modelo de UI.
 */
export function buildServiceMutationPayload(
  service: Service,
  categories: BackendCategoryRecord[]
): ServiceMutationPayload {
  const categoryId = resolveCategoryId(service.category, categories);
  if (!categoryId) {
    throw new Error(
      `No se encontró la categoría "${service.category}" en el catálogo del backend.`
    );
  }

  return {
    category_id: categoryId,
    name: service.name.trim(),
    description: service.description.trim(),
    price: Number(service.price),
    capacity: Number(service.capacity),
    image_url: service.image.trim(),
    modality: service.modality === "FIXED_HOUR" ? "EXCLUSIVE_RESERVATION" : "PER_PERSON_HOUR",
  };
}
