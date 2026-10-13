import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as googlePostHandler, GET as googleGetHandler } from "../../src/app/api/auth/google/route.ts";
import { GET as sessionGetHandler } from "../../src/app/api/auth/session/route.ts";
import {
  authOptions,
  setGoogleAuthService,
  validateGoogleAuthConfig,
  isGoogleOAuthConfigured,
} from "../../src/lib/auth.ts";
import {
  GoogleAuthService,
  googleAuthService,
  GoogleEmailNotVerifiedError,
  GoogleAuthConfigError,
  resolveGoogleAuthErrorMessage,
} from "../../src/features/auth/index.ts";
import { middleware } from "../../src/middleware.ts";

function createMockRequest(url, { method = "GET", headers = {}, body = null } = {}) {
  const reqInit = {
    method,
    headers: new Headers(headers),
  };
  if (body !== null && method !== "GET") {
    reqInit.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit);
}

describe("HU05-B: API Endpoints - Inicio de Sesión con Google", () => {
  let mockUsers;
  let mockService;

  beforeEach(() => {
    mockUsers = [
      {
        id: "usr-existing-001",
        email: "carlos.perez@example.com",
        full_name: "Carlos Pérez",
        roles: { name: "customer" },
        is_active: true,
        metadata: { linked_providers: ["credentials"] },
      },
      {
        id: "usr-inactive-002",
        email: "inactivo@example.com",
        full_name: "Usuario Inactivo",
        roles: { name: "customer" },
        is_active: false,
        metadata: {},
      },
    ];

    mockService = new GoogleAuthService({
      findUserByEmailFn: async (email) => {
        return (
          mockUsers.find(
            (u) => u.email.toLowerCase() === email.trim().toLowerCase()
          ) || null
        );
      },
      findClientRoleFn: async () => ({ id: "role-client-123", name: "CLIENT" }),
      createUserFn: async (data) => {
        const created = {
          id: `usr-google-${mockUsers.length + 1}`,
          email: data.email,
          full_name: data.full_name,
          role_id: data.role_id,
          is_active: data.is_active,
          metadata: data.metadata,
          roles: { name: "CLIENT" },
        };
        mockUsers.push(created);
        return created;
      },
      updateUserFn: async (id, data) => {
        const user = mockUsers.find((u) => u.id === id);
        if (!user) throw new Error("Usuario no encontrado");
        if (data.metadata) user.metadata = { ...user.metadata, ...data.metadata };
        return user;
      },
    });
    authOptions.__googleAuthService = mockService;
    setGoogleAuthService(mockService);
  });

  after(() => {
    delete authOptions.__googleAuthService;
    setGoogleAuthService(googleAuthService);
  });

  // -------------------------------------------------------------------------
  // CRITERIO 1: Iniciar sesión con Google devuelve la sesión con id, email y role
  // -------------------------------------------------------------------------
  test("Criterio 1: POST /api/auth/google devuelve respuesta exitosa con id, email y role para nuevo usuario", async () => {
    const payload = {
      id: "google-sub-998877",
      email: "nuevo.google@example.com",
      name: "Nuevo Usuario Google",
      picture: "https://lh3.googleusercontent.com/photo.jpg",
      email_verified: true,
    };

    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.isNewUser, true);
    assert.ok(body.data.user.id);
    assert.equal(body.data.user.email, "nuevo.google@example.com");
    assert.equal(body.data.user.name, "Nuevo Usuario Google");
    assert.equal(body.data.user.role, "CLIENT");
  });

  test("Criterio 1 (NextAuth Session): La sesión activa expone id, email y role tras autenticar con Google", async () => {
    const mockSession = {
      user: {
        id: "usr-google-session-123",
        email: "autenticado@example.com",
        name: "Usuario Autenticado",
        role: "CLIENT",
      },
      expires: "2026-12-31T23:59:59.000Z",
    };

    const response = await sessionGetHandler(undefined, mockSession);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.authenticated, true);
    assert.equal(body.data.id, "usr-google-session-123");
    assert.equal(body.data.email, "autenticado@example.com");
    assert.equal(body.data.role, "CLIENT");
  });

  test("Criterio 1 (NextAuth JWT & Callbacks): authOptions propaga id y role a través de jwt y session callbacks", async () => {
    const jwtCallback = authOptions.callbacks.jwt;
    const sessionCallback = authOptions.callbacks.session;

    // Simula NextAuth ejecutando el callback jwt con el usuario enriquecido
    const user = {
      id: "usr-jwt-123",
      email: "test.jwt@example.com",
      name: "Test JWT",
      role: "CLIENT",
    };

    const token = await jwtCallback({ token: {}, user });
    assert.equal(token.id, "usr-jwt-123");
    assert.equal(token.role, "CLIENT");

    // Simula NextAuth ejecutando el callback session
    const session = await sessionCallback({
      session: { user: {}, expires: "2026-12-31" },
      token,
    });
    assert.equal(session.user.id, "usr-jwt-123");
    assert.equal(session.user.role, "CLIENT");
  });

  // -------------------------------------------------------------------------
  // CRITERIO 2: Caso de error - usuario cancela o Google falla
  // -------------------------------------------------------------------------
  test("Criterio 2: GET /api/auth/google?error=access_denied devuelve mensaje claro y redirección al login", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/google?error=access_denied");
    const response = await googleGetHandler(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error, "access_denied");
    assert.ok(body.message.includes("cancelado"));
    assert.equal(body.redirectUrl, "/login?error=access_denied");
  });

  test("Criterio 2: resolveGoogleAuthErrorMessage resuelve errores comunes de OAuth con mensajes claros en español", () => {
    const msgCancel = resolveGoogleAuthErrorMessage("AccessDenied");
    assert.ok(msgCancel.includes("cancelado"));

    const msgCallback = resolveGoogleAuthErrorMessage("OAuthCallback");
    assert.ok(msgCallback.includes("procesar"));

    const msgSignin = resolveGoogleAuthErrorMessage("OAuthSignin");
    assert.ok(msgSignin.includes("proveedor de Google"));

    const msgDefault = resolveGoogleAuthErrorMessage("UnknownError");
    assert.ok(msgDefault.includes("inesperado"));
  });

  test("Criterio 2: NextAuth signIn callback redirige al login con error ante cuenta de Google sin email", async () => {
    const signInCallback = authOptions.callbacks.signIn;
    const account = { provider: "google", providerAccountId: "sub-sin-email" };
    const profile = { sub: "sub-sin-email", email: null };

    const redirectTarget = await signInCallback({
      user: {},
      account,
      profile,
    });

    assert.equal(redirectTarget, "/login?error=GoogleEmailNotProvided");
  });

  test("Criterio 2: NextAuth signIn callback redirige al login si la cuenta existente está inactiva", async () => {
    const signInCallback = authOptions.callbacks.signIn;
    const account = { provider: "google", providerAccountId: "sub-inactivo" };
    const profile = { sub: "sub-inactivo", email: "inactivo@example.com", name: "Inactivo" };

    const redirectTarget = await signInCallback({
      user: {},
      account,
      profile,
    });

    assert.equal(redirectTarget, "/login?error=UserInactive");
  });

  // -------------------------------------------------------------------------
  // CRITERIO 3: Caso límite - cuenta de Google con correo ya registrado se vincula sin duplicarse
  // -------------------------------------------------------------------------
  test("Criterio 3 (Caso límite): Vincular usuario existente no crea duplicado y conserva mismo id", async () => {
    const initialUsersCount = mockUsers.length;

    const payload = {
      id: "google-sub-carlos",
      email: "CARLOS.PEREZ@EXAMPLE.COM", // Distinta capitalización
      name: "Carlos Pérez Google",
      picture: "https://lh3.googleusercontent.com/carlos.jpg",
      email_verified: true,
    };

    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.isNewUser, false);
    assert.equal(body.data.isLinked, true);
    assert.equal(body.data.user.id, "usr-existing-001");
    assert.equal(body.data.user.email, "carlos.perez@example.com");

    // Verificar que no se creó un nuevo usuario en la base de datos
    assert.equal(mockUsers.length, initialUsersCount);
  });

  // -------------------------------------------------------------------------
  // VALIDACIONES DE ARQUITECTURA Y CONTRATO (vice-city-api-contracts)
  // -------------------------------------------------------------------------
  test("Contrato API: Rechaza Content-Type inválido con 400", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "no-json",
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "INVALID_CONTENT_TYPE");
  });

  test("Contrato API: Rechaza JSON malformado con 400", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json ...",
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "MALFORMED_JSON");
  });

  test("Contrato API: Rechaza cuerpo que no es un objeto con 400", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: ["un-array"],
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "INVALID_BODY");
  });

  test("Contrato API: Zod estricto rechaza campos desconocidos con 400 VALIDATION_ERROR", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        id: "google-123",
        email: "valido@example.com",
        campo_extra_no_permitido: "inyeccion",
      },
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "VALIDATION_ERROR");
  });

  test("Seguridad: Usuario inactivo devuelve 403 Forbidden", async () => {
    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        id: "google-inactivo-123",
        email: "inactivo@example.com",
      },
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error, "USER_INACTIVE");
  });

  // -------------------------------------------------------------------------
  // FASE 4.1: CONFIGURACIÓN DEL PROVEEDOR (validateGoogleAuthConfig, isGoogleOAuthConfigured)
  // -------------------------------------------------------------------------
  test("Fase 4.1: validateGoogleAuthConfig lanza GoogleAuthConfigError si faltan variables", () => {
    assert.throws(
      () => validateGoogleAuthConfig({}),
      (err) => {
        assert.equal(err instanceof GoogleAuthConfigError, true);
        assert.equal(err.code, "GOOGLE_AUTH_CONFIG_ERROR");
        assert.ok(err.message.includes("GOOGLE_CLIENT_ID"));
        return true;
      }
    );
  });

  test("Fase 4.1: validateGoogleAuthConfig rechaza placeholders y nunca filtra secretos", () => {
    assert.throws(
      () =>
        validateGoogleAuthConfig({
          GOOGLE_CLIENT_ID: "google_client_id_placeholder",
          GOOGLE_CLIENT_SECRET: "google_client_secret_placeholder",
        }),
      (err) => {
        assert.equal(err instanceof GoogleAuthConfigError, true);
        assert.ok(err.message.includes("placeholder"));
        // Comprobar que no se exponen valores sensibles en el mensaje
        assert.equal(err.message.includes("google_client_secret_placeholder"), false);
        return true;
      }
    );
  });

  test("Fase 4.1: isGoogleOAuthConfigured detecta correctamente presencia o ausencia de credenciales reales", () => {
    assert.equal(isGoogleOAuthConfigured({}), false);
    assert.equal(
      isGoogleOAuthConfigured({
        GOOGLE_CLIENT_ID: "google_client_id_placeholder",
        GOOGLE_CLIENT_SECRET: "google_client_secret_placeholder",
      }),
      false
    );
    assert.equal(
      isGoogleOAuthConfigured({
        GOOGLE_CLIENT_ID: "123456789-abc.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "GOCSPX-real-secret-123",
      }),
      true
    );
  });

  test("Fase 4.1: GET /api/auth/google responde 503 cuando el proveedor no está configurado", async () => {
    const origId = process.env.GOOGLE_CLIENT_ID;
    const origSecret = process.env.GOOGLE_CLIENT_SECRET;
    try {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const request = createMockRequest("http://localhost:3000/api/auth/google");
      const response = await googleGetHandler(request);
      const body = await response.json();

      assert.equal(response.status, 503);
      assert.equal(body.success, false);
      assert.equal(body.error, "GOOGLE_OAUTH_NOT_CONFIGURED");
      assert.ok(body.message.includes("no está configurado"));
    } finally {
      if (origId) process.env.GOOGLE_CLIENT_ID = origId;
      if (origSecret) process.env.GOOGLE_CLIENT_SECRET = origSecret;
    }
  });

  // -------------------------------------------------------------------------
  // FASE 4.7: COMPATIBILIDAD DE SESIÓN CON MIDDLEWARE
  // -------------------------------------------------------------------------
  test("Fase 4.7: POST /api/auth/google emite cookie de sesión válida y compatible con middleware.ts", async () => {
    const payload = {
      id: "google-session-test-sub",
      email: "sesion.middleware@example.com",
      name: "Usuario Sesión Middleware",
      picture: "https://lh3.googleusercontent.com/photo.jpg",
      email_verified: true,
    };

    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const response = await googlePostHandler(request, mockService);
    assert.equal(response.status, 200);

    // 1. Verificar encabezado Set-Cookie
    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie, "Debe emitir la cabecera Set-Cookie");
    assert.ok(setCookie.includes("next-auth.session-token="));
    assert.ok(setCookie.includes("HttpOnly"));
    assert.ok(setCookie.includes("Path=/"));

    // 2. Extraer el valor del token de sesión de la cookie
    const match = setCookie.match(/next-auth\.session-token=([^;]+)/);
    assert.ok(match && match[1], "El token de sesión debe estar presente en la cookie");
    const sessionTokenValue = match[1];

    // 3. Simular petición a ruta protegida (/client/reservas) con la cookie emitida
    const protectedRequest = createMockRequest("http://localhost:3000/client/reservas", {
      headers: {
        cookie: `next-auth.session-token=${sessionTokenValue}`,
      },
    });

    const middlewareResponse = await middleware(protectedRequest);
    // El middleware debe validar el token y no redirigir al login
    assert.equal(middlewareResponse.headers.get("Location"), null);
    assert.equal(middlewareResponse.status, 200);

    // 4. Verificar que sin la cookie, la misma ruta es redirigida al login
    const unauthRequest = createMockRequest("http://localhost:3000/client/reservas");
    const unauthResponse = await middleware(unauthRequest);
    assert.ok(unauthResponse.status === 307 || unauthResponse.status === 302);
    assert.ok(unauthResponse.headers.get("Location")?.includes("/login"));
  });

  // -------------------------------------------------------------------------
  // FASE 4.5: EMAIL NO VERIFICADO POR GOOGLE (email_verified: false)
  // -------------------------------------------------------------------------
  test("Fase 4.5: Rechaza autenticación si el perfil de Google tiene email_verified: false", async () => {
    // a) En POST /api/auth/google
    const payload = {
      id: "google-sub-unverified",
      email: "unverified@example.com",
      name: "No Verificado",
      email_verified: false,
    };

    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error, "GOOGLE_EMAIL_NOT_VERIFIED");
    assert.ok(body.message.includes("verificado por Google"));

    // b) En NextAuth signIn callback
    const signInCallback = authOptions.callbacks.signIn;
    const account = { provider: "google", providerAccountId: "sub-unverified" };
    const profile = { sub: "sub-unverified", email: "unverified@example.com", email_verified: false };

    const redirectTarget = await signInCallback({
      user: {},
      account,
      profile,
    });

    assert.equal(redirectTarget, "/login?error=GoogleEmailNotVerified");

    // c) En GoogleAuthService directo
    await assert.rejects(
      async () => mockService.handleGoogleAuth(payload),
      (err) => {
        assert.equal(err instanceof GoogleEmailNotVerifiedError, true);
        assert.equal(err.code, "GOOGLE_EMAIL_NOT_VERIFIED");
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // FASE 4.4: VINCULACIÓN CON CUENTA YA ASOCIADA A OTRO USUARIO
  // -------------------------------------------------------------------------
  test("Fase 4.4: Falla con conflicto 409 si la cuenta de Google ya está vinculada a otro usuario", async () => {
    mockService.linkAccountFn = async () => ({
      success: false,
      reason: "ALREADY_LINKED_TO_OTHER_USER",
      error: "Esta cuenta ya está vinculada a otro usuario",
    });

    const payload = {
      id: "google-sub-conflict",
      email: "carlos.perez@example.com",
      name: "Carlos Pérez",
      email_verified: true,
    };

    const request = createMockRequest("http://localhost:3000/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    const response = await googlePostHandler(request, mockService);
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.success, false);
    assert.equal(body.error, "ACCOUNT_ALREADY_LINKED");

    // Verificar en signIn callback de NextAuth
    authOptions.__linkAccountFn = async () => ({
      success: false,
      reason: "ALREADY_LINKED_TO_OTHER_USER",
    });

    const redirectUrl = await authOptions.callbacks.signIn({
      user: { id: "usr-carlos" },
      account: { provider: "google", providerAccountId: "sub-conflict" },
      profile: { sub: "sub-conflict", email: "carlos.perez@example.com", email_verified: true },
    });

    assert.equal(redirectUrl, "/login?error=OAuthAccountAlreadyLinked");
    delete authOptions.__linkAccountFn;
  });

  // -------------------------------------------------------------------------
  // FASE 4.8: VERIFICACIÓN DE TOKEN EN POST /api/auth/google
  // -------------------------------------------------------------------------
  test("Fase 4.8: En producción rechaza llamadas con perfil no verificado sin idToken", async () => {
    const origEnv = process.env.NODE_ENV;
    const origLifecycle = process.env.npm_lifecycle_event;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.npm_lifecycle_event;

      const payload = {
        id: "google-sub-prod",
        email: "prod@example.com",
        name: "Prod User",
        email_verified: true,
      };

      const request = createMockRequest("http://localhost:3000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      const response = await googlePostHandler(request, mockService);
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.error, "UNVERIFIED_PROFILE_REJECTED");
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origLifecycle) process.env.npm_lifecycle_event = origLifecycle;
    }
  });

  test("Fase 4.8: Rechaza idToken inválido con 401 INVALID_GOOGLE_ID_TOKEN", async () => {
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => ({
        ok: false,
        json: async () => ({ error_description: "Invalid Value" }),
      });

      const request = createMockRequest("http://localhost:3000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { idToken: "token-falso" },
      });

      const response = await googlePostHandler(request, mockService);
      const body = await response.json();

      assert.equal(response.status, 401);
      assert.equal(body.error, "INVALID_GOOGLE_ID_TOKEN");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("Fase 4.6: resolveGoogleAuthErrorMessage traduce todos los códigos de error nuevos", () => {
    assert.ok(resolveGoogleAuthErrorMessage("GoogleEmailNotVerified").includes("verificado"));
    assert.ok(resolveGoogleAuthErrorMessage("OAuthAccountAlreadyLinked").includes("vinculada"));
    assert.ok(resolveGoogleAuthErrorMessage("GoogleAuthConfigError").includes("configurado"));
    assert.ok(resolveGoogleAuthErrorMessage("GOOGLE_OAUTH_NOT_CONFIGURED").includes("configurado"));
  });
});

