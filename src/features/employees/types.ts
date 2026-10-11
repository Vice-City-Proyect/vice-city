import type { Prisma, role_name_enum } from "@prisma/client";

/**
 * Roles permitidos para los empleados del complejo deportivo (HU19)
 */
export type EmployeeRole = "TICKET_SELLER" | "QR_VALIDATOR";

/**
 * Roles reconocidos como personal/empleados en el sistema
 */
export const ALLOWED_EMPLOYEE_ROLES = ["TICKET_SELLER", "QR_VALIDATOR"] as const;

/**
 * Datos requeridos para crear un empleado (HU19)
 */
export type CreateEmployeeInput = {
  email: string;
  full_name: string;
  password: string;
  role: EmployeeRole | string;
  phone?: string | null;
  document_id?: string | null;
};

/**
 * Datos para actualizar un empleado (HU19)
 */
export type UpdateEmployeeInput = {
  full_name?: string;
  role?: EmployeeRole | string;
  password?: string;
  phone?: string | null;
  document_id?: string | null;
  is_active?: boolean;
};

/**
 * Filtros de consulta para listado de empleados
 */
export type EmployeeFilterOptions = {
  includeInactive?: boolean;
  role?: EmployeeRole | string;
  search?: string;
};

/**
 * Usuario empleado con su relación de rol incluida
 */
export type EmployeeWithRole = Prisma.usersGetPayload<{
  include: { roles: true };
}>;

/**
 * Registro de auditoría
 */
export type AuditLogEntry = {
  actor_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
};
