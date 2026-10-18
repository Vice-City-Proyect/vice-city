import { apiRequest } from "@/lib/api-client";
import type { UserRole } from "@/types/user";
import type { BackendUserRecord } from "./user-mappers";

/**
 * Cliente de gestión de usuarios y empleados.
 *
 * Contratos consumidos:
 * - GET   /api/admin/users?page=&limit=&search=&role=
 * - PATCH /api/admin/users/[id]/role
 * - POST  /api/employees
 * - PATCH /api/employees/[id]
 */

export interface AdminUsersPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUsersPage {
  users: BackendUserRecord[];
  pagination: AdminUsersPagination;
}

export interface FetchAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export function fetchAdminUsers(
  params: FetchAdminUsersParams = {}
): Promise<AdminUsersPage> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.role?.trim()) searchParams.set("role", params.role.trim());

  const query = searchParams.toString();
  return apiRequest<AdminUsersPage>(
    `/api/admin/users${query ? `?${query}` : ""}`
  );
}

export const MAX_ADMIN_USERS_PAGES = 20;

/**
 * Recupera el listado completo de usuarios paginando hasta agotar `totalPages`
 * (con un tope defensivo para evitar bucles ante respuestas inesperadas).
 * Si el listado supera el tope, se advierte explícitamente en consola.
 */
export async function fetchAllAdminUsers(
  params: FetchAdminUsersParams = {}
): Promise<BackendUserRecord[]> {
  const pageSize = 100;
  const first = await fetchAdminUsers({ ...params, page: 1, limit: pageSize });
  const users = [...first.users];

  const totalPages = first.pagination?.totalPages ?? 1;
  const lastPage = Math.min(totalPages, MAX_ADMIN_USERS_PAGES);

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchAdminUsers({ ...params, page, limit: pageSize });
    users.push(...next.users);
  }

  if (totalPages > lastPage) {
    console.warn(
      `[fetchAllAdminUsers] El listado supera el tope defensivo: se devolvieron ${users.length} usuarios de ${totalPages * pageSize} totales (${MAX_ADMIN_USERS_PAGES} páginas × ${pageSize}).`
    );
  }

  return users;
}

export interface ChangeUserRoleResponse {
  user: BackendUserRecord;
  auditLog?: unknown;
}

export function changeUserRole(
  userId: string,
  role: UserRole
): Promise<ChangeUserRoleResponse> {
  return apiRequest<ChangeUserRoleResponse>(
    `/api/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }
  );
}

export interface CreateEmployeePayload {
  email: string;
  full_name: string;
  password: string;
  role: "TICKET_SELLER" | "QR_VALIDATOR";
  phone?: string;
  document_id?: string;
}

export function createEmployeeRecord(
  payload: CreateEmployeePayload
): Promise<BackendUserRecord> {
  return apiRequest<BackendUserRecord>("/api/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface UpdateEmployeePayload {
  full_name?: string;
  phone?: string | null;
  is_active?: boolean;
  role?: UserRole;
}

export function updateEmployeeRecord(
  employeeId: string,
  payload: UpdateEmployeePayload
): Promise<BackendUserRecord> {
  return apiRequest<BackendUserRecord>(
    `/api/employees/${encodeURIComponent(employeeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export interface UpdateAdminUserPayload {
  full_name?: string;
  phone?: string | null;
  document_id?: string | null;
  is_active?: boolean;
}

/**
 * Actualiza el estado (activo/inactivo) o los datos de cualquier usuario desde el panel de admin.
 */
export function updateAdminUser(
  userId: string,
  payload: UpdateAdminUserPayload
): Promise<BackendUserRecord> {
  return apiRequest<BackendUserRecord>(
    `/api/admin/users/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Activa o desactiva a cualquier usuario del sistema (clientes, empleados, administradores).
 */
export function toggleAdminUserStatus(
  userId: string,
  isActive: boolean
): Promise<BackendUserRecord> {
  return updateAdminUser(userId, { is_active: isActive });
}

