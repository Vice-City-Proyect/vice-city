import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isEmployeeRoleName } from "../../src/features/employees/employees.repository.ts";

describe("Seguridad empleados: frontera de rol gestionable (HU19)", () => {
  test("Reconoce los roles de empleado válidos (con casos y espacios)", () => {
    assert.equal(isEmployeeRoleName("TICKET_SELLER"), true);
    assert.equal(isEmployeeRoleName("QR_VALIDATOR"), true);
    assert.equal(isEmployeeRoleName("ticket_seller"), true);
    assert.equal(isEmployeeRoleName("  qr_validator  "), true);
  });

  test("Rechaza roles que no son de empleado (impide tocar ADMIN/CLIENT)", () => {
    assert.equal(isEmployeeRoleName("ADMIN"), false);
    assert.equal(isEmployeeRoleName("admin"), false);
    assert.equal(isEmployeeRoleName("CLIENT"), false);
    assert.equal(isEmployeeRoleName("CUSTOMER"), false);
    assert.equal(isEmployeeRoleName(""), false);
    assert.equal(isEmployeeRoleName(null), false);
    assert.equal(isEmployeeRoleName(undefined), false);
  });
});
