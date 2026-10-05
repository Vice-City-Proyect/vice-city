import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../src/app/api/auth/register/route.ts";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

describe("HU01-B: API Endpoint de registro (/api/auth/register)", () => {
  function createRequest(body, contentType = "application/json") {
    const headers = new Headers();
    if (contentType) {
      headers.set("content-type", contentType);
    }

    return new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  test("Criterio: Responde 400 si falta el encabezado Content-Type application/json", async () => {
    const req = createRequest({ fullName: "Test" }, "text/plain");
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CONTENT_TYPE");
  });

  test("Criterio: Caso límite - Responde 400 si el cuerpo está completamente vacío", async () => {
    const req = createRequest("", "application/json");
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "MALFORMED_JSON");
  });

  test("Criterio: Caso límite - Responde 400 si el JSON tiene campos extra no permitidos", async () => {
    const req = createRequest({
      fullName: "Jandy Peña",
      email: "jandy@test.com",
      password: "Password123!",
      role: "ADMIN",
      extraField: "hacker",
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: Responde 400 si faltan campos obligatorios o formato inválido", async () => {
    const req = createRequest({
      fullName: "J",
      email: "correo-invalido",
      password: "123",
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
    assert.ok(data.details.length >= 3);
  });

  test("Criterio: El contrato OpenAPI / Swagger existe y documenta el endpoint", () => {
    const swaggerPath = path.resolve("docs/swagger/auth-register.swagger.json");
    assert.equal(fs.existsSync(swaggerPath), true);

    const content = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));
    assert.ok(content.paths["/api/auth/register"]);
    assert.ok(content.paths["/api/auth/register"].post);
    assert.ok(content.paths["/api/auth/register"].post.responses["201"]);
    assert.ok(content.paths["/api/auth/register"].post.responses["400"]);
    assert.ok(content.paths["/api/auth/register"].post.responses["409"]);
  });
});
