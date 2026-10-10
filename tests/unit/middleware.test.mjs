import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../../src/middleware.ts";

function createMockRequest(url, { headers = {} } = {}) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    headers: new Headers(headers),
  });
}

describe("HU08-B: API Middleware - Protección de Rutas y Permisos", () => {
  // -------------------------------------------------------------------------
  // CRITERIO 1: Usuario sin sesión es redirigido al login (o 401 en API)
  // -------------------------------------------------------------------------
  test("Criterio 1: Usuario sin sesión en ruta web protegida (/admin) es redirigido a /login", async () => {
    const request = createMockRequest("http://localhost:3000/admin/users");
    const response = await middleware(request, null);

    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/login"));
    assert.ok(location.includes("callbackUrl"));
  });

  test("Criterio 1: Usuario sin sesión en ruta web protegida (/client) es redirigido a /login", async () => {
    const request = createMockRequest("http://localhost:3000/client/reservas");
    const response = await middleware(request, null);

    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/login"));
  });

  test("Criterio 1 (API): Petición sin sesión en endpoint protegido (/api/admin/users) responde 401 UNAUTHORIZED", async () => {
    const request = createMockRequest("http://localhost:3000/api/admin/users");
    const response = await middleware(request, null);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error, "UNAUTHORIZED");
  });

  // -------------------------------------------------------------------------
  // CRITERIO 2: Cada rol solo accede a sus rutas autorizadas
  // -------------------------------------------------------------------------
  test("Criterio 2: ADMIN accede exitosamente a rutas administrativas y de empleados", async () => {
    const adminToken = { id: "admin-1", role: "ADMIN" };

    const reqAdmin = createMockRequest("http://localhost:3000/admin/dashboard");
    const resAdmin = await middleware(reqAdmin, adminToken);
    // NextResponse.next() no tiene encabezado de Location (no redirige)
    assert.equal(resAdmin.headers.get("Location"), null);

    const reqPos = createMockRequest("http://localhost:3000/employee/pos");
    const resPos = await middleware(reqPos, adminToken);
    assert.equal(resPos.headers.get("Location"), null);
  });

  test("Criterio 2: TICKET_SELLER accede a /employee/pos", async () => {
    const sellerToken = { id: "seller-1", role: "TICKET_SELLER" };

    const request = createMockRequest("http://localhost:3000/employee/pos/ventas");
    const response = await middleware(request, sellerToken);
    assert.equal(response.headers.get("Location"), null);
  });

  test("Criterio 2: QR_VALIDATOR accede a /employee/qr-scanner", async () => {
    const validatorToken = { id: "validator-1", role: "QR_VALIDATOR" };

    const request = createMockRequest("http://localhost:3000/employee/qr-scanner");
    const response = await middleware(request, validatorToken);
    assert.equal(response.headers.get("Location"), null);
  });

  test("Criterio 2: CLIENT accede a /client/tickets", async () => {
    const clientToken = { id: "client-1", role: "CLIENT" };

    const request = createMockRequest("http://localhost:3000/client/tickets");
    const response = await middleware(request, clientToken);
    assert.equal(response.headers.get("Location"), null);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 3: Caso de error - un rol sin permiso no accede (403 o /unauthorized)
  // -------------------------------------------------------------------------
  test("Criterio 3 (Caso de error Web): CLIENT intentando acceder a /admin es redirigido a /unauthorized", async () => {
    const clientToken = { id: "client-1", role: "CLIENT" };

    const request = createMockRequest("http://localhost:3000/admin/settings");
    const response = await middleware(request, clientToken);

    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/unauthorized"));
  });

  test("Criterio 3 (Caso de error Web): TICKET_SELLER intentando acceder a /employee/qr-scanner es redirigido a /unauthorized", async () => {
    const sellerToken = { id: "seller-1", role: "TICKET_SELLER" };

    const request = createMockRequest("http://localhost:3000/employee/qr-scanner");
    const response = await middleware(request, sellerToken);

    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/unauthorized"));
  });

  test("Criterio 3 (Caso de error API): CLIENT llamando a /api/admin/users recibe 403 FORBIDDEN", async () => {
    const clientToken = { id: "client-1", role: "CLIENT" };

    const request = createMockRequest("http://localhost:3000/api/admin/users");
    const response = await middleware(request, clientToken);
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.success, false);
    assert.equal(body.error, "FORBIDDEN");
    assert.ok(body.message.includes("permisos"));
  });

  // -------------------------------------------------------------------------
  // CRITERIO 4: Caso límite - token vencido o manipulado se trata como sin sesión
  // -------------------------------------------------------------------------
  test("Criterio 4 (Caso límite): Token vencido/nulo se trata como sin sesión y redirige al login", async () => {
    // Si getToken lanza error o devuelve null
    const request = createMockRequest("http://localhost:3000/admin/users");
    const response = await middleware(request, null);

    assert.ok(response.status === 307 || response.status === 302);
    const location = response.headers.get("Location");
    assert.ok(location.includes("/login"));
  });

  // -------------------------------------------------------------------------
  // RUTAS PÚBLICAS: Pasan sin requerir sesión ni evaluar rol
  // -------------------------------------------------------------------------
  test("Rutas públicas: /login y /register pasan sin sesión activa", async () => {
    const reqLogin = createMockRequest("http://localhost:3000/login");
    const resLogin = await middleware(reqLogin, null);
    assert.equal(resLogin.headers.get("Location"), null);

    const reqRegister = createMockRequest("http://localhost:3000/register");
    const resRegister = await middleware(reqRegister, null);
    assert.equal(resRegister.headers.get("Location"), null);
  });
});
