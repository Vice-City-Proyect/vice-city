import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { POST as forgotPasswordPOST } from "../../src/app/api/auth/forgot-password/route.ts";
import {
  POST as resetPasswordPOST,
  GET as resetPasswordGET,
} from "../../src/app/api/auth/reset-password/route.ts";
import {
  PasswordResetTokenExpiredError,
  InvalidPasswordResetTokenError,
  UserNotFoundError,
  WeakPasswordError,
} from "../../src/features/auth/errors/password-reset.errors.ts";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

describe("HU04-B: API Endpoints de Recuperación de Contraseña (/api/auth/forgot-password y /api/auth/reset-password)", () => {
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

  // ==========================================
  // Tests para POST /api/auth/forgot-password
  // ==========================================

  test("Criterio: /api/auth/forgot-password responde 400 si falta Content-Type application/json", async () => {
    const req = createJsonRequest(
      "http://localhost:3000/api/auth/forgot-password",
      { email: "usuario@vicecity.com" },
      "text/plain"
    );
    const res = await forgotPasswordPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CONTENT_TYPE");
  });

  test("Criterio: /api/auth/forgot-password responde 400 si el cuerpo está vacío o es JSON malformado", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/forgot-password", "", "application/json");
    const res = await forgotPasswordPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "MALFORMED_JSON");
  });

  test("Criterio: /api/auth/forgot-password responde 400 si contiene campos extra no reconocidos (.strict())", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/forgot-password", {
      email: "usuario@vicecity.com",
      role: "ADMIN",
      extraData: "hacker",
    });
    const res = await forgotPasswordPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: /api/auth/forgot-password responde 400 si el email es inválido o está vacío", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/forgot-password", {
      email: "correo-invalido",
    });
    const res = await forgotPasswordPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
    assert.ok(data.details.length >= 1);
  });

  test("Criterio: /api/auth/forgot-password responde 200 con correo válido y despacha enlace", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/forgot-password", {
      email: "usuario@vicecity.com",
    });

    const mockService = {
      requestPasswordReset: async () => ({
        success: true,
        message: "Se ha enviado un enlace de recuperación a tu correo electrónico.",
        token: "mock-token-32-bytes",
      }),
    };

    const res = await forgotPasswordPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.message.includes("enviado un enlace"));
  });

  test("Criterio: /api/auth/forgot-password responde 404 si el usuario no existe", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/forgot-password", {
      email: "noexiste@vicecity.com",
    });

    const mockService = {
      requestPasswordReset: async () => {
        throw new UserNotFoundError();
      },
    };

    const res = await forgotPasswordPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 404);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "USER_NOT_FOUND");
  });

  // ==========================================
  // Tests para POST /api/auth/reset-password
  // ==========================================

  test("Criterio: POST /api/auth/reset-password responde 400 si falta Content-Type application/json", async () => {
    const req = createJsonRequest(
      "http://localhost:3000/api/auth/reset-password",
      { token: "tok-123", newPassword: "Password123!" },
      "text/plain"
    );
    const res = await resetPasswordPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CONTENT_TYPE");
  });

  test("Criterio: POST /api/auth/reset-password responde 400 si el JSON tiene campos extra no permitidos (.strict())", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/reset-password", {
      token: "tok-123",
      newPassword: "Password123!",
      additionalPayload: "injection",
    });
    const res = await resetPasswordPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: POST /api/auth/reset-password responde 400 si la contraseña es menor a 8 caracteres", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/reset-password", {
      token: "tok-123",
      newPassword: "short",
    });
    const res = await resetPasswordPOST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: POST /api/auth/reset-password responde 400 si el servicio lanza WeakPasswordError", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/reset-password", {
      token: "valid-token-32-chars",
      newPassword: "ValidLengthPassword123!",
    });

    const mockService = {
      resetPassword: async () => {
        throw new WeakPasswordError();
      },
    };

    const res = await resetPasswordPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "WEAK_PASSWORD");
  });

  test("Criterio: POST /api/auth/reset-password responde 200 con token y contraseña válidos", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/reset-password", {
      token: "valid-token-32-chars",
      newPassword: "NewValidPassword123!",
    });

    const mockService = {
      resetPassword: async () => ({
        success: true,
        message: "Tu contraseña ha sido restablecida exitosamente.",
      }),
    };

    const res = await resetPasswordPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.message.includes("restablecida exitosamente"));
  });

  test("Criterio: POST /api/auth/reset-password responde 400 si el token es inválido o ya fue consumido", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/reset-password", {
      token: "already-used-or-fake-token",
      newPassword: "NewValidPassword123!",
    });

    const mockService = {
      resetPassword: async () => {
        throw new InvalidPasswordResetTokenError();
      },
    };

    const res = await resetPasswordPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_TOKEN");
  });

  test("Criterio: POST /api/auth/reset-password responde 410 si el token ha expirado (1 hora)", async () => {
    const req = createJsonRequest("http://localhost:3000/api/auth/reset-password", {
      token: "expired-token-123",
      newPassword: "NewValidPassword123!",
    });

    const mockService = {
      resetPassword: async () => {
        throw new PasswordResetTokenExpiredError();
      },
    };

    const res = await resetPasswordPOST(req, { serviceOverride: mockService });
    assert.equal(res.status, 410);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "TOKEN_EXPIRED");
  });

  // ==========================================
  // Tests para GET /api/auth/reset-password (UI Pre-check)
  // ==========================================

  test("Criterio: GET /api/auth/reset-password responde 400 si falta el parámetro token", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/reset-password");
    const res = await resetPasswordGET(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "VALIDATION_ERROR");
  });

  test("Criterio: GET /api/auth/reset-password responde 200 con isValid: true para un token activo", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/reset-password?token=active-token-123");

    const mockService = {
      validateTokenStatus: async () => ({
        isValid: true,
      }),
    };

    const res = await resetPasswordGET(req, { serviceOverride: mockService });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.isValid, true);
  });

  test("Criterio: GET /api/auth/reset-password responde 410 si el token ha expirado", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/reset-password?token=expired-token-123");

    const mockService = {
      validateTokenStatus: async () => ({
        isValid: false,
        reason: "EXPIRED",
      }),
    };

    const res = await resetPasswordGET(req, { serviceOverride: mockService });
    assert.equal(res.status, 410);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "TOKEN_EXPIRED");
    assert.equal(data.data.isValid, false);
  });

  test("Criterio: GET /api/auth/reset-password responde 400 si el token ya fue utilizado", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/reset-password?token=used-token-123");

    const mockService = {
      validateTokenStatus: async () => ({
        isValid: false,
        reason: "ALREADY_USED",
      }),
    };

    const res = await resetPasswordGET(req, { serviceOverride: mockService });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "TOKEN_ALREADY_USED");
    assert.equal(data.data.isValid, false);
  });

  test("Criterio: GET /api/auth/reset-password responde 400 si el token no existe", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/reset-password?token=not-found-token-123");

    const mockService = {
      validateTokenStatus: async () => ({
        isValid: false,
        reason: "NOT_FOUND",
      }),
    };

    const res = await resetPasswordGET(req, { serviceOverride: mockService });
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_TOKEN");
    assert.equal(data.data.isValid, false);
  });

  // ==========================================
  // Tests para Swagger / OpenAPI 3.0
  // ==========================================

  test("Criterio: El contrato OpenAPI / Swagger existe y documenta los endpoints de recuperación", () => {
    const swaggerPath = path.resolve("docs/swagger/auth-password-reset.swagger.json");
    assert.equal(fs.existsSync(swaggerPath), true, "El archivo Swagger no existe");

    const content = JSON.parse(fs.readFileSync(swaggerPath, "utf-8"));
    assert.ok(content.paths["/api/auth/forgot-password"]);
    assert.ok(content.paths["/api/auth/forgot-password"].post);
    assert.ok(content.paths["/api/auth/forgot-password"].post.responses["200"]);
    assert.ok(content.paths["/api/auth/forgot-password"].post.responses["400"]);
    assert.ok(content.paths["/api/auth/forgot-password"].post.responses["404"]);

    assert.ok(content.paths["/api/auth/reset-password"]);
    assert.ok(content.paths["/api/auth/reset-password"].post);
    assert.ok(content.paths["/api/auth/reset-password"].post.responses["200"]);
    assert.ok(content.paths["/api/auth/reset-password"].post.responses["400"]);
    assert.ok(content.paths["/api/auth/reset-password"].post.responses["410"]);

    assert.ok(content.paths["/api/auth/reset-password"].get);
    assert.ok(content.paths["/api/auth/reset-password"].get.responses["200"]);
    assert.ok(content.paths["/api/auth/reset-password"].get.responses["400"]);
    assert.ok(content.paths["/api/auth/reset-password"].get.responses["410"]);
  });
});
