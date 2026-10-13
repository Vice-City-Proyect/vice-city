import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { POST as confirmEmailPOST, GET as confirmEmailGET } from "../../src/app/api/auth/confirm-email/route.ts";
import { POST as resendConfirmationPOST } from "../../src/app/api/auth/resend-confirmation/route.ts";
import {
  InvalidTokenError,
  TokenExpiredError,
  TokenAlreadyUsedError,
  EmailAlreadyConfirmedError,
  UserNotFoundError,
} from "../../src/features/auth/errors/auth.errors.ts";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

describe("HU03-B: API Endpoints de confirmación de correo (/api/auth/confirm-email y /api/auth/resend-confirmation)", () => {
  function createJsonRequest(url, body, contentType = "application/json", method = "POST") {
    const headers = new Headers();
    if (contentType) {
      headers.set("content-type", contentType);
    }

    return new NextRequest(url, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  // --- Tests para POST /api/auth/confirm-email ---

  test("Criterio: Responde 400 si falta el encabezado Content-Type application/json en POST", async () => {
    const req = createJsonRequest(
      "http://localhost:3000/api/auth/confirm-email",
      { token: "valid-token-123" },
      "text/plain"
    );
    const res = await confirmEmailPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CONTENT_TYPE");
  });

  test("Criterio: Caso límite - Responde 400 si el cuerpo está completamente vacío", async () => {
    const req = createJsonRequest(
      "http://localhost:3000/api/auth/confirm-email",
      "",
      "application/json"
    );
    const res = await confirmEmailPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "MALFORMED_JSON");
  });

  test("Criterio: Caso límite - Responde 400 si el JSON tiene campos extra no permitidos (.strict())", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/confirm-email", {
      token: "valid-token-123",
      extraRole: "ADMIN",
    });
    const res = await confirmEmailPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: Responde 400 si falta el campo token o está vacío", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/confirm-email", {
      token: "   ",
    });
    const res = await confirmEmailPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
    assert.ok(data.details.length >= 1);
  });

  test("Criterio de Aceptación 1: Un token válido confirma el correo y responde 200 (POST)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/confirm-email", {
      token: "valid-token-ok-123",
    });

    const mockService = async () => ({
      email: "cliente@vicecity.com",
      emailVerified: true,
      message: "Correo electrónico confirmado exitosamente",
    });

    const res = await confirmEmailPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.email, "cliente@vicecity.com");
    assert.equal(data.data.emailVerified, true);
  });

  test("Criterio de Aceptación 2: Caso de error - Un token inválido devuelve error claro (400)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/confirm-email", {
      token: "invalid-token-xyz",
    });

    const mockService = async () => {
      throw new InvalidTokenError("El token de confirmación proporcionado no existe o no es válido");
    };

    const res = await confirmEmailPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_TOKEN");
    assert.ok(data.message.includes("no es válido"));
  });

  test("Criterio de Aceptación 2 (b): Caso de error - Un token expirado devuelve 410 Gone", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/confirm-email", {
      token: "expired-token-456",
    });

    const mockService = async () => {
      throw new TokenExpiredError("El token de confirmación ha expirado");
    };

    const res = await confirmEmailPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 410);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "TOKEN_EXPIRED");
    assert.ok(data.message.includes("ha expirado"));
  });

  test("Criterio de Aceptación 3: Caso límite - Usar el mismo token dos veces es rechazado con 400", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/confirm-email", {
      token: "already-used-token-789",
    });

    const mockService = async () => {
      throw new TokenAlreadyUsedError("El token de confirmación ya ha sido utilizado anteriormente");
    };

    const res = await confirmEmailPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "TOKEN_ALREADY_USED");
    assert.ok(data.message.includes("ya ha sido utilizado"));
  });

  // --- Tests para GET /api/auth/confirm-email ---

  test("Criterio: Confirmar correo vía GET con token válido responde 200", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/confirm-email?token=valid-token-query-123");

    const mockService = async () => ({
      email: "link-click@vicecity.com",
      emailVerified: true,
      message: "Correo electrónico confirmado exitosamente",
    });

    const res = await confirmEmailGET(req, { serviceOverride: mockService });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.email, "link-click@vicecity.com");
  });

  test("Criterio: Confirmar correo vía GET sin token o parámetro vacío responde 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/confirm-email");
    const res = await confirmEmailGET(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  // --- Tests para POST /api/auth/resend-confirmation ---

  test("Criterio: /api/auth/resend-confirmation responde 400 si falta Content-Type application/json", async () => {
    const req = createJsonRequest(
      "http://localhost:3000/api/auth/resend-confirmation",
      { email: "user@vicecity.com" },
      "text/plain"
    );
    const res = await resendConfirmationPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CONTENT_TYPE");
  });

  test("Criterio: /api/auth/resend-confirmation responde 400 si el email es inválido", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/resend-confirmation", {
      email: "correo-invalido",
    });
    const res = await resendConfirmationPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: /api/auth/resend-confirmation responde 200 con correo válido", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/resend-confirmation", {
      email: "user@vicecity.com",
    });

    const mockService = async () => ({
      success: true,
      message: "Correo de confirmación reenviado exitosamente",
    });

    const res = await resendConfirmationPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.email, "user@vicecity.com");
  });

  test("Criterio: /api/auth/resend-confirmation responde 404 si el usuario no existe", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/resend-confirmation", {
      email: "no_existe@vicecity.com",
    });

    const mockService = async () => {
      throw new UserNotFoundError();
    };

    const res = await resendConfirmationPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 404);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "USER_NOT_FOUND");
  });

  test("Criterio: /api/auth/resend-confirmation responde 400 si el correo ya estaba confirmado", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/resend-confirmation", {
      email: "ya_confirmado@vicecity.com",
    });

    const mockService = async () => {
      throw new EmailAlreadyConfirmedError();
    };

    const res = await resendConfirmationPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "EMAIL_ALREADY_CONFIRMED");
  });

  // --- Test Swagger / OpenAPI ---

  test("Criterio de Aceptación 4: Los endpoints aparecen en Swagger (OpenAPI 3.0)", () => {
    const swaggerPath = path.resolve("docs/swagger/auth-confirm-email.swagger.json");
    assert.equal(fs.existsSync(swaggerPath), true, "El archivo Swagger no existe");

    const content = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));
    assert.ok(content.paths["/api/auth/confirm-email"]);
    assert.ok(content.paths["/api/auth/confirm-email"].post);
    assert.ok(content.paths["/api/auth/confirm-email"].post.responses["200"]);
    assert.ok(content.paths["/api/auth/confirm-email"].post.responses["400"]);
    assert.ok(content.paths["/api/auth/confirm-email"].post.responses["410"]);

    assert.ok(content.paths["/api/auth/confirm-email"].get);
    assert.ok(content.paths["/api/auth/confirm-email"].get.responses["200"]);
    assert.ok(content.paths["/api/auth/confirm-email"].get.responses["410"]);

    assert.ok(content.paths["/api/auth/resend-confirmation"]);
    assert.ok(content.paths["/api/auth/resend-confirmation"].post);
    assert.ok(content.paths["/api/auth/resend-confirmation"].post.responses["200"]);
    assert.ok(content.paths["/api/auth/resend-confirmation"].post.responses["400"]);
    assert.ok(content.paths["/api/auth/resend-confirmation"].post.responses["404"]);
  });
});
