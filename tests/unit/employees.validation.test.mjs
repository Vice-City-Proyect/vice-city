import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateEmployeePassword,
  validateEmployeeForm,
  EMPLOYEE_ROLE_OPTIONS,
} from "../../src/features/employees/employee-validation.ts";

const { createEmployee } = await import("../../src/features/employees/employees.repository.ts");

const VALID_FORM = {
  fullName: "Laura Pérez",
  email: "laura@vicecity.com",
  password: "ClaveSegura123",
  role: "TICKET_SELLER",
  phone: "",
  documentId: "",
};

describe("VCP-78 / HU19: validación de altas de empleados", () => {
  describe("validateEmployeePassword", () => {
    it("rechaza vacía, solo espacios o que no sea texto", () => {
      assert.match(validateEmployeePassword(""), /obligatoria/);
      assert.match(validateEmployeePassword("     "), /obligatoria/);
      assert.match(validateEmployeePassword(undefined), /obligatoria/);
      assert.match(validateEmployeePassword(12345678), /obligatoria/);
    });

    it("rechaza menos de 8 caracteres (límite exacto: 7 falla, 8 pasa)", () => {
      assert.match(validateEmployeePassword("1234567"), /al menos 8/);
      assert.equal(validateEmployeePassword("12345678"), null);
    });

    it("rechaza más de 72 caracteres, el límite real de bcrypt (72 pasa, 73 falla)", () => {
      assert.equal(validateEmployeePassword("a".repeat(72)), null);
      assert.match(validateEmployeePassword("a".repeat(73)), /exceder 72/);
    });
  });

  describe("validateEmployeeForm", () => {
    it("un formulario correcto no tiene errores (los opcionales pueden ir vacíos)", () => {
      assert.deepEqual(validateEmployeeForm(VALID_FORM), {});
    });

    it("exige nombre de al menos 2 caracteres", () => {
      assert.ok(validateEmployeeForm({ ...VALID_FORM, fullName: " L " }).fullName);
      assert.ok(validateEmployeeForm({ ...VALID_FORM, fullName: "" }).fullName);
    });

    it("exige un correo con forma válida", () => {
      for (const email of ["", "sin-arroba", "a@b", "a b@c.com"]) {
        assert.ok(validateEmployeeForm({ ...VALID_FORM, email }).email, email);
      }
    });

    it("solo permite los roles de empleado, nunca ADMIN ni CLIENT", () => {
      assert.deepEqual(
        EMPLOYEE_ROLE_OPTIONS.map((o) => o.value),
        ["TICKET_SELLER", "QR_VALIDATOR"]
      );
      assert.ok(validateEmployeeForm({ ...VALID_FORM, role: "ADMIN" }).role);
      assert.ok(validateEmployeeForm({ ...VALID_FORM, role: "CLIENT" }).role);
      assert.equal(validateEmployeeForm({ ...VALID_FORM, role: "QR_VALIDATOR" }).role, undefined);
    });

    it("reporta todos los errores a la vez", () => {
      const errors = validateEmployeeForm({
        fullName: "",
        email: "x",
        password: "1",
        role: "ADMIN",
        phone: "9".repeat(30),
        documentId: "",
      });
      assert.deepEqual(Object.keys(errors).sort(), ["email", "fullName", "password", "phone", "role"]);
    });
  });

  describe("createEmployee (servidor)", () => {
    it("rechaza una contraseña corta antes de tocar la base de datos", async () => {
      await assert.rejects(
        () =>
          createEmployee({
            email: "nuevo@vicecity.com",
            full_name: "Nuevo Empleado",
            password: "1234567",
            role: "TICKET_SELLER",
          }),
        /al menos 8 caracteres/
      );
    });

    it("rechaza una contraseña de más de 72 caracteres (límite de bcrypt)", async () => {
      await assert.rejects(
        () =>
          createEmployee({
            email: "nuevo@vicecity.com",
            full_name: "Nuevo Empleado",
            password: "a".repeat(73),
            role: "QR_VALIDATOR",
          }),
        /exceder 72/
      );
    });

    it("rechaza el rol ADMIN aunque la contraseña sea válida", async () => {
      await assert.rejects(
        () =>
          createEmployee({
            email: "nuevo@vicecity.com",
            full_name: "Nuevo Empleado",
            password: "ClaveSegura123",
            role: "ADMIN",
          }),
        /TICKET_SELLER o QR_VALIDATOR/
      );
    });
  });
});
