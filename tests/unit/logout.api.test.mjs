import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as logoutPostHandler, GET as logoutGetHandler } from "../../src/app/api/auth/logout/route.ts";
import { GET as sessionGetHandler } from "../../src/app/api/auth/session/route.ts";
import { middleware } from "../../src/middleware.ts";

function createMockRequest(url, { method = "GET", headers = {}, cookies = {} } = {}) {
  const reqHeaders = new Headers(headers);
  if (Object.keys(cookies).length > 0) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    reqHeaders.set("Cookie", cookieHeader);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: reqHeaders,
  });
}

describe("HU06-B: API Endpoints - Cierre de Sesión", () => {
  // -------------------------------------------------------------------------
  // CRITERIO 1: Cerrar sesión elimina la sesión y redirige al login
  // -------------------------------------------------------------------------
  test("Criterio 1: POST /api/auth/logout responde 200 con instrucciones de redirección a /login y cookies expiradas", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      cookies: { "next-auth.session-token": "active-user-jwt-token" },
    });

    const response = await logoutPostHandler(request);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.loggedOut, true);
    assert.equal(body.data.redirectTo, "/login");

    // Verificar que los encabezados Set-Cookie instruyen expirar las cookies
    const setCookieHeaders = response.headers.getSetCookie();
    assert.ok(setCookieHeaders.length > 0);
    const sessionTokenCookie = setCookieHeaders.find((h) =>
      h.includes("next-auth.session-token")
    );
    assert.ok(sessionTokenCookie, "Debe contener Set-Cookie para next-auth.session-token");
    assert.ok(
      sessionTokenCookie.includes("Max-Age=0") || sessionTokenCookie.includes("max-age=0")
    );
  });

  test("Criterio 1 (Navegación GET): GET /api/auth/logout redirige al login (/login)", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/logout", {
      method: "GET",
    });

    const response = await logoutGetHandler(request);

    // En Next.js NextResponse.redirect responde 307 o 302 hacia /login
    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/login"));
  });

  // -------------------------------------------------------------------------
  // CRITERIO 2: Caso de error - cerrar sesión sin una sesión activa no produce error
  // -------------------------------------------------------------------------
  test("Criterio 2: Cerrar sesión sin sesión activa responde 200 sin producir error", async () => {
    // Petición sin cookies de sesión
    const request = createMockRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
    });

    const response = await logoutPostHandler(request);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.loggedOut, true);
    assert.equal(body.data.redirectTo, "/login");
  });

  test("Criterio 2: Cerrar sesión con token expirado responde 200 sin producir error", async () => {
    const expiredPayload = Buffer.from(
      JSON.stringify({ sub: "user-123", exp: 1000 })
    ).toString("base64");
    const expiredToken = `header.${expiredPayload}.signature`;

    const request = createMockRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      cookies: { "next-auth.session-token": expiredToken },
    });

    const response = await logoutPostHandler(request);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.loggedOut, true);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 3: Caso límite - después de cerrar sesión, las rutas protegidas no son accesibles
  // -------------------------------------------------------------------------
  test("Criterio 3 (Caso límite Middleware): Tras cerrar sesión, rutas de cliente (/client/*) redirigen al login", () => {
    // Solicitud a ruta protegida sin cookies de sesión
    const request = createMockRequest("http://localhost:3000/client/dashboard");

    const response = middleware(request);

    // Debe interceptar y redirigir al login
    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/login"));
    assert.ok(location.includes("callbackUrl"));
  });

  test("Criterio 3 (Caso límite Middleware): Tras cerrar sesión, rutas administrativas (/admin/*) redirigen al login", () => {
    const request = createMockRequest("http://localhost:3000/admin/users");
    const response = middleware(request);

    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/login"));
  });

  test("Criterio 3 (Caso límite Middleware): Tras cerrar sesión, rutas de empleados (/employee/*) redirigen al login", () => {
    const request = createMockRequest("http://localhost:3000/employee/pos");
    const response = middleware(request);

    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/login"));
  });

  test("Criterio 3 (Consulta de Sesión): GET /api/auth/session sin sesión activa devuelve authenticated: false", async () => {
    const response = await sessionGetHandler(undefined, null);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.authenticated, false);
    assert.equal(body.data, null);
  });
});

