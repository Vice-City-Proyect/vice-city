import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  isRouteAllowed,
  isPublicRoute,
  isProtectedRoute,
  getAllowedRolesForRoute,
} from "../../src/features/auth/index.ts";

describe("HU08-B (extensión): permisos de reservas web, pagos y verificación de correo", () => {
  test("rutas públicas nuevas: verificación de correo y webhook de Stripe", () => {
    assert.equal(isPublicRoute("/verify-email"), true);
    assert.equal(isPublicRoute("/verify-email?token=abc"), true);
    assert.equal(isPublicRoute("/api/auth/confirm-email"), true);
    assert.equal(isPublicRoute("/api/auth/resend-confirmation"), true);
    assert.equal(isPublicRoute("/api/payments/webhook"), true);
  });

  test("reservas y checkout son privadas y solo para CLIENT y ADMIN", () => {
    assert.equal(isProtectedRoute("/api/reservations"), true);
    assert.equal(isProtectedRoute("/api/payments/checkout"), true);

    assert.deepEqual(getAllowedRolesForRoute("/api/reservations"), ["CLIENT", "ADMIN"]);
    assert.deepEqual(getAllowedRolesForRoute("/api/payments/checkout"), ["CLIENT", "ADMIN"]);

    assert.equal(isRouteAllowed("CLIENT", "/api/reservations"), true);
    assert.equal(isRouteAllowed("ADMIN", "/api/payments/checkout"), true);
    assert.equal(isRouteAllowed("TICKET_SELLER", "/api/reservations"), false);
    assert.equal(isRouteAllowed("QR_VALIDATOR", "/api/payments/checkout"), false);
    assert.equal(isRouteAllowed(null, "/api/reservations"), false);
  });

  test("el webhook de Stripe es público (se autentica por firma, no por sesión)", () => {
    assert.equal(isRouteAllowed("CLIENT", "/api/payments/webhook"), true);
    assert.equal(isRouteAllowed(null, "/api/payments/webhook"), true);
  });
});