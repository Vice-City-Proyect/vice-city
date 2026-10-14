import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { validateAdminSeedPassword, MIN_ADMIN_PASSWORD_LENGTH } from "../../scripts/seed-admin-password.mjs";

describe("VCP-86: validación de ADMIN_SEED_PASSWORD del seed", () => {
  test("rechaza variable ausente (undefined / null)", () => {
    assert.throws(() => validateAdminSeedPassword(undefined), /debe definirse/);
    assert.throws(() => validateAdminSeedPassword(null), /debe definirse/);
  });

  test("rechaza cadena vacía", () => {
    assert.throws(() => validateAdminSeedPassword(""), /debe definirse/);
  });

  test("rechaza contraseñas compuestas solo por espacios (incluida una de 12 espacios)", () => {
    assert.throws(() => validateAdminSeedPassword(" "), /solo espacios/);
    assert.throws(() => validateAdminSeedPassword(" ".repeat(12)), /solo espacios/);
    assert.throws(() => validateAdminSeedPassword("\t\n  "), /solo espacios/);
  });

  test("rechaza longitudes inferiores a 12", () => {
    assert.equal(MIN_ADMIN_PASSWORD_LENGTH, 12);
    assert.throws(() => validateAdminSeedPassword("a".repeat(11)), /al menos 12/);
  });

  test("no cuenta los espacios al inicio o al final para la longitud", () => {
    assert.throws(() => validateAdminSeedPassword("  " + "a".repeat(10) + "  "), /al menos 12/);
  });

  test("acepta exactamente 12 caracteres", () => {
    assert.equal(validateAdminSeedPassword("Xk9#mQ2$vL7!"), "Xk9#mQ2$vL7!");
  });

  test("acepta más de 12 caracteres", () => {
    const value = "Xk9#mQ2$vL7!pR4&zT8";
    assert.equal(validateAdminSeedPassword(value), value);
  });

  test("rechaza el marcador de ejemplo de .env.example y valores conocidos", () => {
    assert.throws(
      () => validateAdminSeedPassword("<define-una-contraseña-segura-de-12+-caracteres>"),
      /valor de ejemplo/
    );
    assert.throws(() => validateAdminSeedPassword("vicecity123*"), /al menos 12|valor de ejemplo/);
    assert.throws(() => validateAdminSeedPassword("<mi-clave-de-ejemplo>"), /valor de ejemplo/);
  });

  test("una configuración inválida detiene el seed antes de acceder a la base de datos", () => {
    // DATABASE_URL apunta a un puerto cerrado: si el script intentara conectarse, el error
    // sería de Prisma/conexión. Con la validación previa el error es de seguridad.
    const env = {
      ...process.env,
      DATABASE_URL: "postgresql://x:x@127.0.0.1:1/x",
      DIRECT_URL: "postgresql://x:x@127.0.0.1:1/x",
      ADMIN_SEED_PASSWORD: " ".repeat(12),
    };
    const result = spawnSync(process.execPath, ["scripts/seed-admin.mjs"], {
      env,
      encoding: "utf8",
    });
    const output = `${result.stdout}${result.stderr}`;

    assert.notEqual(result.status, 0);
    assert.match(output, /Seguridad: ADMIN_SEED_PASSWORD/);
    assert.doesNotMatch(output, /Iniciando siembra/);
    assert.doesNotMatch(output, /Can't reach database|PrismaClient/);
  });
});
