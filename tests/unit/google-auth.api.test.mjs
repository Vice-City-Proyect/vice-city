import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as googlePostHandler, GET as googleGetHandler } from "../../src/app/api/auth/google/route.ts";
import { GET as sessionGetHandler } from "../../src/app/api/auth/session/route.ts";
import { authOptions } from "../../src/lib/auth.ts";
import {
  GoogleAuthService,
  GoogleEmailNotProvidedError,
  UserInactiveError,
  resolveGoogleAuthErrorMessage,
} from "../../src/features/auth/index.ts";

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
});

