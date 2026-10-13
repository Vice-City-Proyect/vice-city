import type { User, UserRole } from "@/types/user";
import { isEmployeeRole } from "./user-mappers";
import type { UpdateEmployeePayload } from "./users.api";

export const NON_EMPLOYEE_EDIT_NOTICE =
  "El rol se actualizó, pero los endpoints actuales solo permiten editar nombre, teléfono y estado de empleados (Vendedor / Validador QR).";

export interface UserUpdatePlan {
  roleChange: UserRole | null;
  employeeUpdate: UpdateEmployeePayload | null;
  notice: string | null;
}

/**
 * Decide QUÉ operaciones requiere una edición de usuario del panel admin.
 *
 * El rol debe persistirse ANTES de actualizar los datos del empleado: los
 * endpoints de empleados rechazan cuentas que todavía no tienen rol de
 * empleado (frontera `isEmployeeRoleName`). Por eso el plan se ejecuta de forma
 * secuencial y este módulo es la parte testeable sin depender de la UI.
 */
export function planUserUpdate(
  original: User | undefined,
  updated: User
): UserUpdatePlan {
  const roleChanged =
    !!original && original.role !== updated.role;
  const fieldsChanged =
    !!original &&
    (original.name !== updated.name ||
      (original.phone ?? "") !== (updated.phone ?? ""));
  const statusChanged = !!original && original.status !== updated.status;

  const plan: UserUpdatePlan = {
    roleChange: roleChanged ? updated.role : null,
    employeeUpdate: null,
    notice: null,
  };

  if (isEmployeeRole(updated.role)) {
    const employeeUpdate: UpdateEmployeePayload = {};
    if (fieldsChanged) {
      employeeUpdate.full_name = updated.name;
      employeeUpdate.phone = updated.phone || null;
    }
    if (statusChanged) {
      employeeUpdate.is_active = updated.status === "ACTIVE";
    }
    if (Object.keys(employeeUpdate).length > 0) {
      plan.employeeUpdate = employeeUpdate;
    }
  } else if (fieldsChanged || statusChanged) {
    plan.notice = NON_EMPLOYEE_EDIT_NOTICE;
  }

  return plan;
}

export interface UserUpdateDeps {
  changeRole: (userId: string, role: UserRole) => Promise<unknown>;
  updateEmployee: (
    userId: string,
    payload: UpdateEmployeePayload
  ) => Promise<unknown>;
}

/**
 * Ejecuta la actualización de forma SECUENCIAL: primero el rol y después los
 * datos del empleado. Ejecutar ambos en paralelo (`Promise.all`) puede fallar
 * porque el guard de empleados rechaza la edición si el rol todavía no se ha
 * persistido. Si la segunda operación falla, el error se propaga y la UI recarga
 * datos para reflejar el estado parcial real.
 */
export async function applyUserUpdate(
  updated: User,
  original: User | undefined,
  deps: UserUpdateDeps
): Promise<UserUpdatePlan> {
  const plan = planUserUpdate(original, updated);

  if (plan.roleChange) {
    await deps.changeRole(updated.id, plan.roleChange);
  }
  if (plan.employeeUpdate) {
    await deps.updateEmployee(updated.id, plan.employeeUpdate);
  }

  return plan;
}