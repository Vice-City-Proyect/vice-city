import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSwagger(relativePath) {
  const fullPath = path.resolve(relativePath);
  assert.equal(fs.existsSync(fullPath), true, `Falta el contrato ${relativePath}`);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

describe("Contratos OpenAPI 3.0.3 de los endpoints nuevos", () => {
  test("reservas: documenta POST /api/reservations con 201/400/401/403/409", () => {
    const doc = readSwagger("docs/swagger/reservations.swagger.json");
    const post = doc.paths["/api/reservations"].post;
    assert.ok(post);
    assert.equal(doc.openapi, "3.0.3");
    for (const code of ["201", "400", "401", "403", "409", "500"]) {
      assert.ok(post.responses[code], `Falta respuesta ${code}`);
    }
  });

  test("pagos: documenta checkout y webhook", () => {
    const doc = readSwagger("docs/swagger/payments.swagger.json");
    assert.ok(doc.paths["/api/payments/checkout"].post);
    assert.ok(doc.paths["/api/payments/webhook"].post);
    assert.ok(doc.paths["/api/payments/checkout"].post.responses["503"]);
    assert.ok(doc.paths["/api/payments/webhook"].post.responses["400"]);
  });

  test("confirmación de correo: documenta confirm-email y resend-confirmation", () => {
    const doc = readSwagger("docs/swagger/auth-email-confirmation.swagger.json");
    assert.ok(doc.paths["/api/auth/confirm-email"].post);
    assert.ok(doc.paths["/api/auth/resend-confirmation"].post);
    assert.ok(doc.paths["/api/auth/confirm-email"].post.responses["410"]);
  });
});