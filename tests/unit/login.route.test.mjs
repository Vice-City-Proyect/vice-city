import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../src/app/api/auth/login/route.ts";
import { GET } from "../../src/app/api/auth/session/route.ts";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "../../src/lib/auth.ts";
import { middleware } from "../../src/middleware.ts";
import fs from "node:fs";
import path from "node:path";

describe("HU02-B: API Endpoints de login y sesión (/api/auth/login y /api/auth/session)", () => {
  function createLoginRequest(body, contentType = "application/json", url = "http://localhost:3000/api/auth/login") {
    const headers = new Headers();
    if (contentType) {
      headers.set("content-type", contentType);
    }

    return new NextRequest(url, {
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
    assert.equal(res.cookies.get("next-auth.session-token"), undefined);
  });

  test("Criterio: Caso límite - Responde 400 si el cuerpo está completamente vacío", async () => {
    const req = createLoginRequest("", "application/json");
    const res = await POST(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "MALFORMED_JSON");
    assert.equal(res.cookies.get("next-auth.session-token"), undefined);
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
    assert.equal(res.cookies.get("next-auth.session-token"), undefined);
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
    assert.equal(res.cookies.get("next-auth.session-token"), undefined);
  });

  test("Criterio: Responde 401 si las credenciales son incorrectas y no emite cookie", async () => {
    const req = createLoginRequest({
      email: "no_existe_usuario_test_999@vicecity.com",
      password: "PasswordInvalido123!",
    });

    // Aislamiento de la base de datos: la lógica de autenticación se inyecta
    // simulando el error de negocio que produce credenciales inválidas.
    const authenticateUserOverride = async () => {
      throw new Error(
        "Credenciales incorrectas: correo o contraseña no válidos"
      );
    };

    const res = await POST(req, { authenticateUserOverride });
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INVALID_CREDENTIALS");
    assert.ok(data.message.includes("Credenciales incorrectas"));
    assert.equal(res.cookies.get("next-auth.session-token"), undefined);
    assert.equal(res.cookies.get("__Secure-next-auth.session-token"), undefined);
  });

  test("Criterio: Login exitoso devuelve 200, datos de usuario y establece la cookie de sesión NextAuth (HTTP)", async () => {
    const mockUser = {
      id: "usr-admin-uuid-1",
      email: "admin@vicecity.com",
      name: "Administrador General",
      role: "ADMIN",
    };

    const req = createLoginRequest({
      email: "admin@vicecity.com",
      password: "PasswordValido123!",
    });

    const res = await POST(req, async () => mockUser);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.message, "Inicio de sesión exitoso");
    assert.deepEqual(data.data, {
      id: "usr-admin-uuid-1",
      email: "admin@vicecity.com",
      name: "Administrador General",
      role: "ADMIN",
    });

    // Validar cookie emitida en la respuesta
    const sessionCookie = res.cookies.get("next-auth.session-token");
    assert.ok(sessionCookie, "Debe existir la cookie next-auth.session-token");
    assert.ok(sessionCookie.value.length > 50, "El token de sesión debe ser un JWE válido");
    assert.equal(sessionCookie.httpOnly, true);
    assert.equal(sessionCookie.sameSite, "lax");
    assert.equal(sessionCookie.path, "/");

    // Validar que getToken() de NextAuth descifra exactamente el token emitido
    const testReq = new NextRequest("http://localhost:3000/api/users", {
      headers: {
        cookie: `next-auth.session-token=${sessionCookie.value}`,
      },
    });
    const parsedToken = await getToken({
      req: testReq,
      secret: getAuthSecret(),
    });

    assert.ok(parsedToken, "getToken debe descifrar el token de sesión");
    assert.equal(parsedToken.sub, "usr-admin-uuid-1");
    assert.equal(parsedToken.id, "usr-admin-uuid-1");
    assert.equal(parsedToken.email, "admin@vicecity.com");
    assert.equal(parsedToken.name, "Administrador General");
    assert.equal(parsedToken.role, "ADMIN");
  });

  test("Criterio: Login exitoso en HTTPS emite cookie con prefijo __Secure- y flag secure: true", async () => {
    const mockUser = {
      id: "usr-client-uuid-2",
      email: "cliente@vicecity.com",
      name: "Cliente Final",
      role: "CLIENT",
    };

    const req = createLoginRequest(
      { email: "cliente@vicecity.com", password: "PasswordValido123!" },
      "application/json",
      "https://vicecity.app/api/auth/login"
    );

    const res = await POST(req, async () => mockUser);
    assert.equal(res.status, 200);

    const secureCookie = res.cookies.get("__Secure-next-auth.session-token");
    assert.ok(secureCookie, "Debe existir la cookie __Secure-next-auth.session-token");
    assert.equal(secureCookie.httpOnly, true);
    assert.equal(secureCookie.secure, true);
    assert.equal(secureCookie.sameSite, "lax");
  });

  test("Criterio: Acceso a ruta protegida con la sesión generada es permitido por el middleware", async () => {
    const mockAdmin = {
      id: "usr-admin-uuid-3",
      email: "admin2@vicecity.com",
      name: "Admin Dos",
      role: "ADMIN",
    };

    const loginReq = createLoginRequest({
      email: "admin2@vicecity.com",
      password: "PasswordValido123!",
    });
    const loginRes = await POST(loginReq, async () => mockAdmin);
    const sessionCookie = loginRes.cookies.get("next-auth.session-token");

    // Petición a ruta protegida administrativa (/api/admin/dashboard)
    const protectedReq = new NextRequest("http://localhost:3000/api/admin/dashboard", {
      headers: {
        cookie: `next-auth.session-token=${sessionCookie.value}`,
      },
    });

    const middlewareRes = await middleware(protectedReq);
    assert.equal(middlewareRes.status, 200);
    assert.equal(middlewareRes.headers.get("x-middleware-next"), "1");
  });

  test("Criterio: Acceso a ruta protegida sin sesión es rechazado por el middleware (401 en API, redirección en páginas)", async () => {
    // 1. Endpoint API protegido sin cookie -> 401 UNAUTHORIZED
    const apiReq = new NextRequest("http://localhost:3000/api/admin/dashboard");
    const apiRes = await middleware(apiReq);
    assert.equal(apiRes.status, 401);
    const apiData = await apiRes.json();
    assert.equal(apiData.error, "UNAUTHORIZED");

    // 2. Página protegida sin cookie -> 307 Redirect a /login
    const pageReq = new NextRequest("http://localhost:3000/admin/dashboard");
    const pageRes = await middleware(pageReq);
    assert.equal(pageRes.status, 307);
    const location = pageRes.headers.get("location");
    assert.ok(location.includes("/login"));
    assert.ok(location.includes("callbackUrl=%2Fadmin%2Fdashboard"));
  });

  test("Criterio: Acceso a ruta protegida con token manipulado es rechazado como no autenticado (401)", async () => {
    const tamperedReq = new NextRequest("http://localhost:3000/api/admin/dashboard", {
      headers: {
        cookie: "next-auth.session-token=token_invalido_totalmente_manipulado_12345",
      },
    });

    const tamperedRes = await middleware(tamperedReq);
    assert.equal(tamperedRes.status, 401);
    const tamperedData = await tamperedRes.json();
    assert.equal(tamperedData.error, "UNAUTHORIZED");
  });

  test("Criterio: Acceso a ruta protegida con rol insuficiente (CLIENT en ruta ADMIN) recibe 403 FORBIDDEN", async () => {
    const mockClient = {
      id: "usr-client-uuid-4",
      email: "cliente.comun@vicecity.com",
      name: "Cliente Común",
      role: "CLIENT",
    };

    const loginReq = createLoginRequest({
      email: "cliente.comun@vicecity.com",
      password: "PasswordValido123!",
    });
    const loginRes = await POST(loginReq, async () => mockClient);
    const sessionCookie = loginRes.cookies.get("next-auth.session-token");

    const forbiddenReq = new NextRequest("http://localhost:3000/api/admin/dashboard", {
      headers: {
        cookie: `next-auth.session-token=${sessionCookie.value}`,
      },
    });

    const forbiddenRes = await middleware(forbiddenReq);
    assert.equal(forbiddenRes.status, 403);
    const data = await forbiddenRes.json();
    assert.equal(data.error, "FORBIDDEN");
  });

  test("Criterio: Un error interno real NO se oculta como 401 (responde 500)", async () => {
    const req = createLoginRequest({
      email: "usuario@vicecity.com",
      password: "Password123!",
    });

    // Simula un fallo interno (p. ej. caída de la base de datos). No debe
    // degradarse silenciosamente a 401, ya que no es un fallo de credenciales.
    const authenticateUserOverride = async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
    };

    const res = await POST(req, { authenticateUserOverride });
    assert.equal(res.status, 500);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, "INTERNAL_SERVER_ERROR");
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

