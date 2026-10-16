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

  // -------------------------------------------------------------------------
  // VCP-104: /login y /register no se muestran con sesión activa
  // -------------------------------------------------------------------------
  const HOME_BY_ROLE = {
    ADMIN: "/admin",
    CLIENT: "/cliente",
    TICKET_SELLER: "/employee/pos",
    QR_VALIDATOR: "/empleado/qr",
  };

  for (const [role, home] of Object.entries(HOME_BY_ROLE)) {
    for (const path of ["/login", "/register"]) {
      test(`VCP-104: ${role} con sesión activa que entra a ${path} es redirigido a ${home}`, async () => {
        const request = createMockRequest(`http://localhost:3000${path}`);
        const response = await middleware(request, { id: "u-1", role });

        assert.ok(response.status === 307 || response.status === 302);
        assert.equal(new URL(response.headers.get("Location")).pathname, home);
      });
    }
  }

  test("VCP-104: el rol CUSTOMER se normaliza a CLIENT al redirigir", async () => {
    const request = createMockRequest("http://localhost:3000/login");
    const response = await middleware(request, { id: "u-1", role: "CUSTOMER" });
    assert.equal(new URL(response.headers.get("Location")).pathname, "/cliente");
  });

  test("VCP-104: /login/ con barra final también redirige con sesión activa", async () => {
    const request = createMockRequest("http://localhost:3000/login/");
    const response = await middleware(request, { id: "u-1", role: "ADMIN" });
    assert.equal(new URL(response.headers.get("Location")).pathname, "/admin");
  });

  test("VCP-104: token sin rol válido no redirige (se permite ver el login, sin bucle)", async () => {
    for (const token of [{ id: "u-1" }, { id: "u-1", role: "HACKER" }, { id: "u-1", role: "" }]) {
      const request = createMockRequest("http://localhost:3000/login");
      const response = await middleware(request, token);
      assert.equal(response.headers.get("Location"), null);
    }
  });

  test("VCP-104: cookie de sesión inválida o manipulada deja ver /login y /register", async () => {
    for (const path of ["/login", "/register"]) {
      const request = createMockRequest(`http://localhost:3000${path}`, {
        headers: { cookie: "next-auth.session-token=token.manipulado.invalido" },
      });
      const response = await middleware(request);
      assert.equal(response.headers.get("Location"), null);
    }
  });

  test("VCP-104: la cabecera x-mock-role no activa la redirección de /login", async () => {
    const previous = process.env.ENABLE_MOCK_AUTH_HEADERS;
    process.env.ENABLE_MOCK_AUTH_HEADERS = "true";
    try {
      const request = createMockRequest("http://localhost:3000/login", {
        headers: { "x-mock-role": "ADMIN" },
      });
      const response = await middleware(request);
      assert.equal(response.headers.get("Location"), null);
    } finally {
      if (previous === undefined) delete process.env.ENABLE_MOCK_AUTH_HEADERS;
      else process.env.ENABLE_MOCK_AUTH_HEADERS = previous;
    }
  });

  test("VCP-104: otras rutas públicas (/forgot-password) no redirigen aunque haya sesión", async () => {
    const request = createMockRequest("http://localhost:3000/forgot-password");
    const response = await middleware(request, { id: "u-1", role: "ADMIN" });
    assert.equal(response.headers.get("Location"), null);
  });

  test("Rutas públicas (HU20 - HU24): Endpoints de negocio y webhook de Stripe pasan sin sesión activa (200 / sin redirección)", async () => {
    const publicEndpoints = [
      "http://localhost:3000/api/catalog",
      "http://localhost:3000/api/availability?serviceId=abc&date=2026-10-15",
      "http://localhost:3000/api/pricing/calculate",
      "http://localhost:3000/api/reservations/c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
      "http://localhost:3000/api/payments/webhook",
      "http://localhost:3000/catalog",
      "http://localhost:3000/checkout/c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    ];

    for (const url of publicEndpoints) {
      const req = createMockRequest(url);
      const res = await middleware(req, null);
      assert.equal(
        res.status,
        200,
        `El endpoint público ${url} debe responder 200 (NextResponse.next())`
      );
      assert.equal(
        res.headers.get("Location"),
        null,
        `El endpoint público ${url} no debe redirigir a login`
      );
    }
  });

  // -------------------------------------------------------------------------
  // COMPATIBILIDAD NEXT.JS: Invocación con NextFetchEvent (Hallazgo 2)
  // -------------------------------------------------------------------------
  test("Compatibilidad Next.js: NextFetchEvent no es interpretado como token y no produce 403 con sesión válida", async () => {
    process.env.ENABLE_MOCK_AUTH_HEADERS = "true";
    try {
      const mockNextFetchEvent = {
        waitUntil: () => {},
        sourcePage: "/employee/qr-scanner",
      };

      // Petición autenticada con rol QR_VALIDATOR vía mock header
      const req = createMockRequest("http://localhost:3000/employee/qr-scanner", {
        headers: { "x-mock-role": "QR_VALIDATOR" },
      });

      // Invocado como lo hace Next.js: middleware(request, event)
      const res = await middleware(req, mockNextFetchEvent);

      // Debe permitir el acceso (no 403 ni redirección)
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("Location"), null);
    } finally {
      delete process.env.ENABLE_MOCK_AUTH_HEADERS;
    }
  });

  test("Ruta protegida sin sesión sigue respondiendo 401 UNAUTHORIZED en API", async () => {
    const protectedApis = [
      "http://localhost:3000/api/admin/users",
      "http://localhost:3000/api/employee/pos",
      "http://localhost:3000/api/client/tickets",
      "http://localhost:3000/api/payments/checkout",
      "http://localhost:3000/api/payments/create-intent",
      "http://localhost:3000/api/reservations/hold",
    ];

    for (const url of protectedApis) {
      const req = createMockRequest(url);
      const res = await middleware(req, null);
      const body = await res.json();

      assert.equal(res.status, 401, `Ruta ${url} debe ser 401 sin sesión`);
      assert.equal(body.error, "UNAUTHORIZED");
    }
  });
});

