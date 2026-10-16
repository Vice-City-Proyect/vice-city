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

function collectRefs(node, refs = []) {
  if (Array.isArray(node)) node.forEach((item) => collectRefs(item, refs));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") refs.push(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
}

function assertRefsResolve(doc, name) {
  for (const ref of collectRefs(doc)) {
    const target = ref.replace(/^#\//, "").split("/").reduce((acc, part) => acc?.[part], doc);
    assert.ok(target, `${name}: la referencia ${ref} no existe`);
  }
}

describe("VCP-93: contratos OpenAPI de listados y resúmenes", () => {
  test("reservas: documenta GET /api/reservations con 200/400/401/403/500 y sus parámetros", () => {
    const doc = readSwagger("docs/swagger/reservations.swagger.json");
    const get = doc.paths["/api/reservations"].get;
    assert.ok(get);
    assert.ok(doc.paths["/api/reservations"].post, "No se debe perder el POST existente");
    for (const code of ["200", "400", "401", "403", "500"]) {
      assert.ok(get.responses[code], `Falta respuesta ${code}`);
    }
    const params = get.parameters.map((p) => p.name);
    for (const name of ["page", "limit", "status", "serviceId", "dateFrom", "dateTo", "order"]) {
      assert.ok(params.includes(name), `Falta el parámetro ${name}`);
    }
    assert.equal(params.includes("userId"), false, "El usuario sale de la sesión, no de la URL");
    assertRefsResolve(doc, "reservations");
  });

  test("resúmenes: documentan el dashboard del admin y el de empleados", () => {
    const doc = readSwagger("docs/swagger/dashboard-summary.swagger.json");
    assert.equal(doc.openapi, "3.0.3");
    for (const route of ["/api/reports/dashboard-summary", "/api/employee/summary"]) {
      const get = doc.paths[route]?.get;
      assert.ok(get, `Falta GET ${route}`);
      for (const code of ["200", "401", "403", "500"]) {
        assert.ok(get.responses[code], `${route}: falta respuesta ${code}`);
      }
    }
    assertRefsResolve(doc, "dashboard-summary");
  });

  test("resumen de empleados: el esquema no expone datos de contacto del cliente", () => {
    const doc = readSwagger("docs/swagger/dashboard-summary.swagger.json");
    const props = Object.keys(doc.components.schemas.EmployeeReservation.properties);
    for (const field of ["clientEmail", "clientPhone", "notes", "cancellationReason", "cancelledAt"]) {
      assert.equal(props.includes(field), false, field);
    }
    assert.ok(props.includes("clientName"));
  });
});