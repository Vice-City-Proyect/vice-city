import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isRouteAllowed,
  isPublicRoute,
  isProtectedRoute,
  getAllowedRolesForRoute,
  normalizeRole,
  SRS_ROLES,
} from "../../src/features/auth/index.ts";

describe("HU08-B: Lógica de Negocio - Matriz de Permisos por Rol (SRS Sección 8)", () => {
  // -------------------------------------------------------------------------
  // CRITERIO 1: La matriz coincide con los permisos del SRS para los 4 roles
  // -------------------------------------------------------------------------
  test("Criterio 1: ADMIN tiene acceso a rutas administrativas y de gestión", () => {
    assert.equal(isRouteAllowed("ADMIN", "/admin"), true);
    assert.equal(isRouteAllowed("ADMIN", "/admin/users"), true);
    assert.equal(isRouteAllowed("ADMIN", "/api/admin/users"), true);
    assert.equal(isRouteAllowed("ADMIN", "/employee/pos"), true);
    assert.equal(isRouteAllowed("ADMIN", "/employee/qr-scanner"), true);
    assert.equal(isRouteAllowed("ADMIN", "/client"), true);
  });

  test("Criterio 1: CLIENT solo accede a rutas de cliente y reservas", () => {
    assert.equal(isRouteAllowed("CLIENT", "/client"), true);
    assert.equal(isRouteAllowed("CLIENT", "/client/tickets"), true);
    assert.equal(isRouteAllowed("CLIENT", "/api/client/bookings"), true);

    // CLIENT NO debe acceder a administración ni áreas operativas de empleados
    assert.equal(isRouteAllowed("CLIENT", "/admin"), false);
    assert.equal(isRouteAllowed("CLIENT", "/api/admin/users"), false);
    assert.equal(isRouteAllowed("CLIENT", "/employee/pos"), false);
    assert.equal(isRouteAllowed("CLIENT", "/employee/qr-scanner"), false);
  });

  test("Criterio 1: TICKET_SELLER accede a taquilla / POS, pero no a escáner ni admin", () => {
    assert.equal(isRouteAllowed("TICKET_SELLER", "/employee/pos"), true);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/api/employee/pos"), true);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/employee"), true);

    // No debe acceder a administración ni escáner de torniquete
    assert.equal(isRouteAllowed("TICKET_SELLER", "/admin"), false);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/api/admin/users"), false);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/employee/qr-scanner"), false);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/api/employee/scanner"), false);
  });

  test("Criterio 1: QR_VALIDATOR accede a escáner QR, pero no a taquilla / POS ni admin", () => {
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/employee/qr-scanner"), true);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/employee/scan"), true);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/api/employee/scan"), true);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/employee"), true);

    // No debe acceder a administración ni ventas en POS
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/admin"), false);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/api/admin/users"), false);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/employee/pos"), false);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/api/employee/pos"), false);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 2: Caso de error - un rol desconocido o vacío siempre es denegado
  // -------------------------------------------------------------------------
  test("Criterio 2: Rol nulo, indefinido o vacío es siempre denegado para rutas protegidas", () => {
    assert.equal(isRouteAllowed(null, "/admin"), false);
    assert.equal(isRouteAllowed(undefined, "/employee/pos"), false);
    assert.equal(isRouteAllowed("", "/client"), false);
    assert.equal(isRouteAllowed("   ", "/employee/qr-scanner"), false);
  });

  test("Criterio 2: Rol desconocido o no perteneciente al SRS es siempre denegado", () => {
    assert.equal(isRouteAllowed("SUPERUSER", "/admin"), false);
    assert.equal(isRouteAllowed("GUEST", "/client"), false);
    assert.equal(isRouteAllowed("HACKER", "/employee/pos"), false);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 3: Caso límite - rutas anidadas y con parámetros respetan el permiso padre
  // -------------------------------------------------------------------------
  test("Criterio 3 (Caso límite): Rutas anidadas y con parámetros dinámicos respetan regla padre", () => {
    // Rutas anidadas bajo /admin
    assert.equal(isRouteAllowed("ADMIN", "/admin/users/123/edit"), true);
    assert.equal(isRouteAllowed("ADMIN", "/admin/reports/2026/monthly"), true);
    assert.equal(isRouteAllowed("CLIENT", "/admin/users/123/edit"), false);

    // Rutas anidadas bajo /employee/pos
    assert.equal(isRouteAllowed("TICKET_SELLER", "/employee/pos/orders/new"), true);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/employee/pos/receipt/abc-999"), true);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/employee/pos/orders/new"), false);

    // Rutas anidadas bajo escáner QR
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/employee/qr-scanner/ticket/tk-7788"), true);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/employee/qr-scanner/ticket/tk-7788"), false);
  });

  // -------------------------------------------------------------------------
  // VALIDACIONES DE RUTAS PÚBLICAS Y NORMALIZACIÓN
  // -------------------------------------------------------------------------
  test("Rutas públicas: Cualquier rol o visitante puede acceder", () => {
    assert.equal(isPublicRoute("/"), true);
    assert.equal(isPublicRoute("/login"), true);
    assert.equal(isPublicRoute("/register"), true);
    assert.equal(isPublicRoute("/forgot-password"), true);
    assert.equal(isPublicRoute("/api/auth/login"), true);

    // isRouteAllowed debe retornar true para rutas públicas aun sin rol
    assert.equal(isRouteAllowed(null, "/login"), true);
    assert.equal(isRouteAllowed(undefined, "/"), true);
    assert.equal(isRouteAllowed("INVALID_ROLE", "/register"), true);
  });

  test("Normalización de roles: Soporta alias legacy (CUSTOMER -> CLIENT) e insensible a mayúsculas", () => {
    assert.equal(normalizeRole("customer"), "CLIENT");
    assert.equal(normalizeRole("CUSTOMER"), "CLIENT");
    assert.equal(normalizeRole("admin"), "ADMIN");
    assert.equal(normalizeRole("ticket_seller"), "TICKET_SELLER");
    assert.equal(normalizeRole("qr_validator"), "QR_VALIDATOR");
    assert.equal(normalizeRole("unknown"), null);
  });
});
