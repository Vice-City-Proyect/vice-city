import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  mapBackendUserToUi,
  normalizeUiRole,
  isEmployeeRole,
} from "../../src/features/users/api/user-mappers.ts";

describe("Integración usuarios: mapeo backend → UI", () => {
  test("Mapea los campos del endpoint /api/admin/users al modelo de UI", () => {
    const user = mapBackendUserToUi({
      id: "usr-1",
      email: "jandy@vicecity.com",
      full_name: "Jandy Peña",
      role: "ADMIN",
      is_active: true,
      created_at: "2025-03-14T10:20:30.000Z",
    });

    assert.equal(user.id, "usr-1");
    assert.equal(user.name, "Jandy Peña");
    assert.equal(user.email, "jandy@vicecity.com");
    assert.equal(user.phone, "");
    assert.equal(user.role, "ADMIN");
    assert.equal(user.status, "ACTIVE");
    assert.equal(user.registeredAt, "2025-03-14");
  });

  test("is_active=false se traduce a INACTIVE", () => {
    const user = mapBackendUserToUi({
      id: "usr-2",
      email: "x@vicecity.com",
      full_name: "X",
      role: "CLIENT",
      is_active: false,
      created_at: "2024-12-01T00:00:00.000Z",
    });
    assert.equal(user.status, "INACTIVE");
  });

  test("normalizeUiRole resuelve alias y roles desconocidos", () => {
    assert.equal(normalizeUiRole("CUSTOMER"), "CLIENT");
    assert.equal(normalizeUiRole("cliente"), "CLIENT");
    assert.equal(normalizeUiRole("admin"), "ADMIN");
    assert.equal(normalizeUiRole("ticket_seller"), "TICKET_SELLER");
    assert.equal(normalizeUiRole("HACKER"), "CLIENT");
    assert.equal(normalizeUiRole(null), "CLIENT");
  });

  test("isEmployeeRole identifica únicamente roles de empleado", () => {
    assert.equal(isEmployeeRole("TICKET_SELLER"), true);
    assert.equal(isEmployeeRole("QR_VALIDATOR"), true);
    assert.equal(isEmployeeRole("ADMIN"), false);
    assert.equal(isEmployeeRole("CLIENT"), false);
  });
});
