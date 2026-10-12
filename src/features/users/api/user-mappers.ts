import type { User, UserRole, UserStatus } from "@/types/user";

/**
 * Registro de usuario tal como lo devuelve `GET /api/admin/users` o
 * `GET /api/employees`.
 */
export interface BackendUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_id?: string;
  is_active: boolean;
  phone?: string | null;
  document_id?: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

const VALID_ROLES: UserRole[] = [
  "ADMIN",
  "CLIENT",
  "TICKET_SELLER",
  "QR_VALIDATOR",
];

/**
 * Normaliza el nombre del rol a uno de los cuatro roles del SRS.
 */
export function normalizeUiRole(name?: string | null): UserRole {
  if (!name || typeof name !== "string") return "CLIENT";
  const upper = name.trim().toUpperCase();
  if (upper === "CUSTOMER" || upper === "CLIENTE") return "CLIENT";
  if (VALID_ROLES.includes(upper as UserRole)) {
    return upper as UserRole;
  }
  return "CLIENT";
}

function toIsoDate(value?: string | Date | null): string {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

/**
 * Convierte un registro del backend al modelo de UI `User`.
 */
export function mapBackendUserToUi(record: BackendUserRecord): User {
  const status: UserStatus = record.is_active ? "ACTIVE" : "INACTIVE";
  return {
    id: record.id,
    name: record.full_name,
    email: record.email,
    phone: record.phone?.trim() || "",
    role: normalizeUiRole(record.role),
    status,
    registeredAt: toIsoDate(record.created_at),
  };
}

/**
 * Indica si un rol corresponde a un empleado gestionable por `/api/employees`.
 */
export function isEmployeeRole(role: UserRole): boolean {
  return role === "TICKET_SELLER" || role === "QR_VALIDATOR";
}
