import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../src/app/api/auth/login/route.ts";
import { GET } from "../../src/app/api/auth/session/route.ts";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

describe("HU02-B: API Endpoints de login y sesión (/api/auth/login y /api/auth/session)", () => {
  function createLoginRequest(body, contentType = "application/json") {
    const headers = new Headers();
    if (contentType) {
      headers.set("content-type", contentType);
    }

    return new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  test("Criterio: Responde 400 si falta el encabezado Content-Type application/json", async () => {
    const req = createLoginRequest({ email: "test@vicecity.com", password: "Password123!" }, "text/plain");
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CONTENT_TYPE");
  });

  test("Criterio: Caso límite - Responde 400 si el cuerpo está completamente vacío", async () => {
    const req = createLoginRequest("", "application/json");
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "MALFORMED_JSON");
  });

  test("Criterio: Caso límite - Responde 400 si el JSON tiene campos extra no permitidos", async () => {
    const req = createLoginRequest({
      email: "test@vicecity.com",
      password: "Password123!",
      role: "ADMIN",
      extraProperty: "malicious_payload",
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: Responde 400 si faltan campos obligatorios o formato inválido", async () => {
    const req = createLoginRequest({
      email: "correo-invalido",
      password: "",
    });

    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
    assert.ok(data.details.length >= 1);
  });

  test("Criterio: Responde 401 si las credenciales son incorrectas", async () => {
    const req = createLoginRequest({
      email: "no_existe_usuario_test_999@vicecity.com",
      password: "PasswordInvalido123!",
    });

    const res = await POST(req);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CREDENTIALS");
    assert.ok(data.message.includes("Credenciales incorrectas"));
  });

  test("Criterio: /api/auth/session responde 200 con authenticated: false cuando no hay sesión activa", async () => {
    const res = await GET();
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.authenticated, false);
    assert.equal(data.data, null);
  });

  test("Criterio: /api/auth/session responde 200 con los datos del usuario (id, email, role) cuando hay sesión activa", async () => {
    const mockSession = {
      user: {
        id: "usr-active-uuid-99",
        email: "jandy@vicecity.com",
        name: "Jandy Peña",
        role: "ADMIN",
      },
    };

    const res = await GET(undefined, mockSession);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.authenticated, true);
    assert.deepEqual(data.data, {
      id: "usr-active-uuid-99",
      email: "jandy@vicecity.com",
      name: "Jandy Peña",
      role: "ADMIN",
    });
  });

  test("Criterio: El contrato OpenAPI / Swagger existe y documenta /api/auth/login y /api/auth/session", () => {
    const swaggerPath = path.resolve("docs/swagger/auth-login.swagger.json");
    assert.equal(fs.existsSync(swaggerPath), true);

    const content = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));
    assert.ok(content.paths["/api/auth/login"]);
    assert.ok(content.paths["/api/auth/login"].post);
    assert.ok(content.paths["/api/auth/login"].post.responses["200"]);
    assert.ok(content.paths["/api/auth/login"].post.responses["400"]);
    assert.ok(content.paths["/api/auth/login"].post.responses["401"]);

    assert.ok(content.paths["/api/auth/session"]);
    assert.ok(content.paths["/api/auth/session"].get);
    assert.ok(content.paths["/api/auth/session"].get.responses["200"]);
  });
});

