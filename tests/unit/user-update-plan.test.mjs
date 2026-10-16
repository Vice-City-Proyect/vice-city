import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  applyUserUpdate,
  planUserUpdate,
  NON_EMPLOYEE_EDIT_NOTICE,
} from "../../src/features/users/api/user-update-plan.ts";

function baseUser(overrides = {}) {
  return {
    id: "usr-1",
    name: "Ana Pérez",
    email: "ana@vicecity.com",
    phone: "3001112233",
    role: "CLIENT",
    status: "ACTIVE",
    registeredAt: "2024-01-05",
    ...overrides,
  };
}

describe("Plan de actualización de usuario (panel admin)", () => {
  test("Cambio de rol a empleado + edición de datos genera rol y datos", () => {
    const plan = planUserUpdate(
      baseUser(),
      baseUser({ role: "TICKET_SELLER", name: "Ana López" })
    );

    assert.equal(plan.roleChange, "TICKET_SELLER");
    assert.deepEqual(plan.employeeUpdate, {
      full_name: "Ana López",
      phone: "3001112233",
    });
    assert.equal(plan.notice, null);
  });

  test("Cambio de rol a empleado + cambio de estado incluye is_active", () => {
    const plan = planUserUpdate(
      baseUser(),
      baseUser({ role: "QR_VALIDATOR", status: "INACTIVE" })
    );

    assert.equal(plan.roleChange, "QR_VALIDATOR");
    assert.deepEqual(plan.employeeUpdate, { is_active: false });
  });

  test("Solo cambio de rol: sin actualización de datos de empleado", () => {
    const plan = planUserUpdate(
      baseUser(),
      baseUser({ role: "TICKET_SELLER" })
    );

    assert.equal(plan.roleChange, "TICKET_SELLER");
    assert.equal(plan.employeeUpdate, null);
    assert.equal(plan.notice, null);
  });

  test("Rol no empleado con edición de datos: aviso, sin operación de empleado", () => {
    const plan = planUserUpdate(
      baseUser(),
      baseUser({ name: "Ana Ruiz" })
    );

    assert.equal(plan.roleChange, null);
    assert.equal(plan.employeeUpdate, null);
    assert.equal(plan.notice, NON_EMPLOYEE_EDIT_NOTICE);
  });

  test("Sin cambios: no genera ninguna operación", () => {
    const plan = planUserUpdate(baseUser(), baseUser());
    assert.deepEqual(plan, { roleChange: null, employeeUpdate: null, notice: null });
  });
});

describe("Aplicación secuencial de la actualización (MEDIO-1)", () => {
  test("Ejecuta primero el rol y después los datos del empleado (sin Promise.all)", async () => {
    const calls = [];

    await applyUserUpdate(
      baseUser({ role: "TICKET_SELLER", name: "Ana López" }),
      baseUser(),
      {
        changeRole: async (userId, role) => {
          calls.push(`role:${userId}:${role}`);
        },
        updateEmployee: async (userId, payload) => {
          calls.push(`employee:${userId}:${JSON.stringify(payload)}`);
        },
      }
    );

    assert.deepEqual(calls, [
      "role:usr-1:TICKET_SELLER",
      'employee:usr-1:{"full_name":"Ana López","phone":"3001112233"}',
    ]);
  });

  test("Solo cambia datos sin tocar el rol", async () => {
    const calls = [];
    await applyUserUpdate(
      baseUser({ name: "Ana López" }),
      baseUser(),
      {
        changeRole: async () => calls.push("role"),
        updateEmployee: async () => calls.push("employee"),
      }
    );

    assert.deepEqual(calls, []);
  });

  test("Si la edición de datos falla, el rol ya persistido se mantiene (error parcial propagado)", async () => {
    const calls = [];
    await assert.rejects(
      applyUserUpdate(
        baseUser({ role: "TICKET_SELLER", name: "Ana López" }),
        baseUser(),
        {
          changeRole: async () => calls.push("role"),
          updateEmployee: async () => {
            calls.push("employee");
            throw new Error("Error al actualizar el empleado");
          },
        }
      ),
      /Error al actualizar el empleado/
    );

    assert.deepEqual(calls, ["role", "employee"]);
  });
});