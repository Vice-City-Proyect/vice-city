import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LogoutService,
  logoutService,
  AUTH_COOKIE_NAMES,
} from "../../src/features/auth/index.ts";

describe("HU06-B: Lógica de Negocio - Cierre de Sesión", () => {
  const service = new LogoutService();

  // -------------------------------------------------------------------------
  // CRITERIO 1: La sesión y las cookies quedan eliminadas
  // -------------------------------------------------------------------------
  test("Criterio 1: generateExpiredCookies retorna todas las cookies de NextAuth con Max-Age=0 y fecha en 1970", () => {
    const expiredCookies = service.generateExpiredCookies(false);

    assert.equal(expiredCookies.length, AUTH_COOKIE_NAMES.length);

    for (const cookie of expiredCookies) {
      assert.ok(AUTH_COOKIE_NAMES.includes(cookie.name));
      assert.equal(cookie.value, "");
      assert.equal(cookie.options.maxAge, 0);
      assert.equal(cookie.options.expires.getTime(), 0); // 1 de enero de 1970
      assert.equal(cookie.options.path, "/");
      assert.equal(cookie.options.httpOnly, true);
    }
  });

  test("Criterio 1: invalidateSession elimina la sesión y define redirección a /login", async () => {
    const result = await service.invalidateSession("valid.mock.token");

    assert.equal(result.success, true);
    assert.equal(result.redirectTo, "/login");
    assert.ok(result.expiredCookies.length >= AUTH_COOKIE_NAMES.length);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 2: Caso de error - un token ya vencido no genera error al cerrar sesión
  // -------------------------------------------------------------------------
  test("Criterio 2: Un token ya vencido no genera error al cerrar sesión y purga cookies limpiamente", async () => {
    // Generar un payload JWT con exp en el pasado (exp: 1000)
    const expiredPayload = Buffer.from(
      JSON.stringify({ sub: "user-123", exp: 1000 })
    ).toString("base64");
    const expiredToken = `header.${expiredPayload}.signature`;

    const result = await service.invalidateSession(expiredToken);

    assert.equal(result.success, true);
    assert.equal(result.redirectTo, "/login");
    assert.ok(result.expiredCookies.length > 0);
  });

  test("Criterio 2: Cerrar sesión con token nulo o no provisto es idempotente y no genera excepción", async () => {
    const resultNull = await service.invalidateSession(null);
    assert.equal(resultNull.success, true);

    const resultUndefined = await service.invalidateSession(undefined);
    assert.equal(resultUndefined.success, true);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 3: Caso límite - cerrar sesión en varias pestañas deja todas sin acceso
  // -------------------------------------------------------------------------
  test("Criterio 3 (Caso límite): Al expirar las cookies de sesión en el cliente, todas las instancias pierden credenciales", async () => {
    const result = await logoutService.invalidateSession();

    const sessionCookie = result.expiredCookies.find(
      (c) => c.name === "next-auth.session-token"
    );
    const secureCookie = result.expiredCookies.find(
      (c) => c.name === "__Secure-next-auth.session-token"
    );

    assert.ok(sessionCookie, "Debe expirar next-auth.session-token");
    assert.ok(secureCookie, "Debe expirar __Secure-next-auth.session-token");
    assert.equal(sessionCookie.options.maxAge, 0);
    assert.equal(secureCookie.options.maxAge, 0);
  });

  test("Configuración: Soporta banderas secure para entornos HTTPS", () => {
    const secureCookies = service.generateExpiredCookies(true);

    for (const cookie of secureCookies) {
      assert.equal(cookie.options.secure, true);
    }
  });
});

