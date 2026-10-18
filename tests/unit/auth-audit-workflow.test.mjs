import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  authenticateUser,
  createSessionToken,
  getAuthSecret,
  getSessionCookieConfig,
  buildAuthProviders,
  VALID_SRS_ROLES,
} from "../../src/lib/auth.ts";
import { hashPassword } from "../../src/lib/password.ts";
import { registerUser } from "../../src/features/auth/services/register.service.ts";
import { EmailConfirmationService } from "../../src/features/auth/services/email-confirmation.service.ts";
import {
  EmailNotVerifiedError,
  UserAlreadyExistsError,
} from "../../src/features/auth/errors/auth.errors.ts";
import {
  resolveLoginErrorMessage,
  LOGIN_MESSAGES,
} from "../../src/features/auth/utils/login-validation.ts";
import { middleware } from "../../src/middleware.ts";

/**
 * Mock generador de PrismaClient para simular la base de datos en memoria
 */
function createMockPrisma({ users = [], roles = [], verificationTokens = [] } = {}) {
  const usersStore = [...users];
  const tokensStore = [...verificationTokens];
  const defaultRoles =
    roles.length > 0
      ? roles
      : [
          { id: "role-client-uuid", name: "CLIENT", description: "Cliente" },
          { id: "role-admin-uuid", name: "ADMIN", description: "Administrador" },
        ];

  const db = {
    usersStore,
    tokensStore,
    users: {
      findFirst: async ({ where }) => {
        if (where?.email?.equals) {
          const target = where.email.equals.toLowerCase();
          const match = usersStore.find((u) => {
            const emailMatch = u.email.toLowerCase() === target;
            const activeMatch = where.is_active === undefined || u.is_active === where.is_active;
            return emailMatch && activeMatch;
          });
          return match ? JSON.parse(JSON.stringify(match)) : null;
        }
        return null;
      },
      findUnique: async ({ where }) => {
        const match = usersStore.find((u) => u.id === where.id);
        return match ? JSON.parse(JSON.stringify(match)) : null;
      },
      create: async ({ data, include }) => {
        const role = defaultRoles.find((r) => r.id === data.role_id) || {
          id: data.role_id,
          name: "CLIENT",
        };
        const newUser = {
          id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email: data.email,
          full_name: data.full_name,
          password_hash: data.password_hash,
          role_id: data.role_id,
          is_active: data.is_active ?? true,
          email_verified: data.email_verified ?? false,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: data.metadata || {},
          roles: include?.roles ? role : undefined,
        };
        usersStore.push(newUser);
        return JSON.parse(JSON.stringify(newUser));
      },
      update: async ({ where, data }) => {
        const user = usersStore.find((u) => u.id === where.id);
        if (!user) throw new Error("Usuario no encontrado");
        Object.assign(user, data);
        return JSON.parse(JSON.stringify(user));
      },
    },
    roles: {
      findFirst: async ({ where }) => {
        const names = where?.name?.in || [where?.name];
        const lowerNames = names.map((n) => (typeof n === "string" ? n.toLowerCase() : n));
        const role = defaultRoles.find((r) => lowerNames.includes(r.name.toLowerCase()));
        return role ? JSON.parse(JSON.stringify(role)) : null;
      },
    },
    verification_tokens: {
      findFirst: async ({ where }) => {
        const hashes = where?.OR?.map((o) => o.token_hash) || [where?.token_hash];
        const token = tokensStore.find((t) => hashes.includes(t.token_hash));
        if (!token) return null;
        const user = usersStore.find((u) => u.id === token.user_id);
        return {
          ...JSON.parse(JSON.stringify(token)),
          users: user ? JSON.parse(JSON.stringify(user)) : null,
        };
      },
      create: async ({ data }) => {
        const newToken = {
          id: `vt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: data.user_id,
          token_hash: data.token_hash,
          expires_at: data.expires_at,
          used: data.used ?? false,
          created_at: new Date(),
        };
        tokensStore.push(newToken);
        return JSON.parse(JSON.stringify(newToken));
      },
      update: async ({ where, data }) => {
        const token = tokensStore.find((t) => t.id === where.id);
        if (!token) throw new Error("Token no encontrado");
        Object.assign(token, data);
        return JSON.parse(JSON.stringify(token));
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        tokensStore.forEach((t) => {
          if (t.user_id === where.user_id && (where.used === undefined || t.used === where.used)) {
            Object.assign(t, data);
            count++;
          }
        });
        return { count };
      },
    },
  };

  return db;
}

describe("TAREA 2: Auditoría y Validación E2E de Registro, Login y Manejo de Sesión", () => {
  // ── 1. Registro correcto seguido de login correcto tras confirmar correo ──
  it("Escenario 1: Registro correcto -> rechazo sin confirmación -> confirmación -> login exitoso", async () => {
    const sentEmails = [];
    const mockEmailSender = {
      sendVerificationEmail: async (params) => {
        sentEmails.push(params);
        return { success: true };
      },
    };

    const db = createMockPrisma();
    const confirmationService = new EmailConfirmationService(db, mockEmailSender);

    // A. Registro de cuenta
    const registered = await registerUser(
      {
        fullName: "Sofia Martinez",
        email: "sofia.martinez@vicecity.test",
        password: "PasswordSeguro123!",
      },
      db,
      confirmationService
    );

    assert.ok(registered.id, "Debe retornar el ID del nuevo usuario");
    assert.equal(registered.email, "sofia.martinez@vicecity.test");
    assert.equal(sentEmails.length, 1, "Debe despachar el correo de verificación");
    assert.ok(sentEmails[0].token, "Debe generar un token criptográfico");

    // B. Intento de login INMEDIATO con credenciales válidas antes de confirmar correo
    await assert.rejects(
      async () => {
        await authenticateUser(
          {
            email: "sofia.martinez@vicecity.test",
            password: "PasswordSeguro123!",
          },
          db
        );
      },
      (err) => {
        assert.ok(err instanceof EmailNotVerifiedError, "Debe rechazar con EmailNotVerifiedError");
        assert.equal(err.code, "EMAIL_NOT_VERIFIED");
        assert.ok(err.message.includes("Debes confirmar tu correo"));
        return true;
      }
    );

    // C. Confirmación exitosa del correo usando el token emitido
    const verifyResult = await confirmationService.confirmEmail(sentEmails[0].token);
    assert.equal(verifyResult.success, true);
    assert.equal(verifyResult.email, "sofia.martinez@vicecity.test");

    // D. Intento de login posterior a la confirmación -> Éxito total
    const authResult = await authenticateUser(
      {
        email: "sofia.martinez@vicecity.test",
        password: "PasswordSeguro123!",
      },
      db
    );

    assert.ok(authResult, "Debe retornar el usuario autenticado");
    assert.equal(authResult.id, registered.id);
    assert.equal(authResult.email, "sofia.martinez@vicecity.test");
    assert.equal(authResult.role, "CLIENT");
    assert.ok(VALID_SRS_ROLES.includes(authResult.role));

    // E. Generación de sesión cifrada (JWE) compatible con NextAuth
    const sessionToken = await createSessionToken({
      id: authResult.id,
      email: authResult.email,
      name: authResult.name,
      role: authResult.role,
    });
    assert.ok(sessionToken && sessionToken.length > 50, "Debe generar un token JWE válido");
  });

  // ── 2. Contraseña incorrecta (Anti-enumeración) ───────────────────────────
  it("Escenario 2: Contraseña incorrecta lanza error genérico sin revelar datos del usuario", async () => {
    const rawPassword = "PasswordValido123!";
    const hashedPassword = await hashPassword(rawPassword);

    const db = createMockPrisma({
      users: [
        {
          id: "usr-pwd-test",
          email: "usuario.existente@vicecity.test",
          full_name: "Usuario Existente",
          password_hash: hashedPassword,
          is_active: true,
          email_verified: false, // Aun sin verificar, una contraseña errónea no debe revelar su estado
          roles: { id: "role-client-uuid", name: "CLIENT" },
        },
      ],
    });

    await assert.rejects(
      async () => {
        await authenticateUser(
          {
            email: "usuario.existente@vicecity.test",
            password: "PasswordTotalmenteErroneo!",
          },
          db
        );
      },
      (err) => {
        assert.ok(
          !(err instanceof EmailNotVerifiedError),
          "No debe revelar si el correo está o no verificado ante contraseña errónea"
        );
        assert.ok(
          err.message.includes("Credenciales incorrectas"),
          "Debe arrojar mensaje genérico de credenciales"
        );
        return true;
      }
    );
  });

  // ── 3. Usuario inexistente ────────────────────────────────────────────────
  it("Escenario 3: Usuario inexistente arroja error genérico de credenciales", async () => {
    const db = createMockPrisma({ users: [] });

    await assert.rejects(
      async () => {
        await authenticateUser(
          {
            email: "fantasma@vicecity.test",
            password: "CualquierPassword123!",
          },
          db
        );
      },
      (err) => {
        assert.ok(
          err.message.includes("Credenciales incorrectas"),
          "Debe dar el mismo mensaje genérico para mitigar enumeración de cuentas"
        );
        return true;
      }
    );
  });

  // ── 4. Normalización de correo según las reglas existentes ────────────────
  it("Escenario 4: Normalización insensible a mayúsculas/minúsculas y recortes de espacios", async () => {
    const db = createMockPrisma();
    const rawPassword = "PasswordNormalizado123!";
    const hashedPassword = await hashPassword(rawPassword);

    db.usersStore.push({
      id: "usr-case-test",
      email: "cliente.mayusculas@vicecity.test",
      full_name: "Cliente Mayúsculas",
      password_hash: hashedPassword,
      is_active: true,
      email_verified: true,
      roles: { id: "role-client-uuid", name: "CLIENT" },
    });

    // Intentar login con mayúsculas y espacios extremos
    const result = await authenticateUser(
      {
        email: "   CLIENTE.MAYUSCULAS@VICECITY.TEST   ",
        password: rawPassword,
      },
      db
    );

    assert.ok(result);
    assert.equal(result.email, "cliente.mayusculas@vicecity.test");
  });

  // ── 5. Usuario no verificado y resolución de mensaje UI para reenvío ──────
  it("Escenario 5: Usuario no verificado con credenciales válidas genera mensaje claro para reenvío", async () => {
    const rawPassword = "PasswordValido123!";
    const hashedPassword = await hashPassword(rawPassword);

    const db = createMockPrisma({
      users: [
        {
          id: "usr-unverified",
          email: "pendiente@vicecity.test",
          full_name: "Usuario Pendiente",
          password_hash: hashedPassword,
          is_active: true,
          email_verified: false,
          roles: { id: "role-client-uuid", name: "CLIENT" },
        },
      ],
    });

    let thrownError;
    try {
      await authenticateUser(
        { email: "pendiente@vicecity.test", password: rawPassword },
        db
      );
    } catch (err) {
      thrownError = err;
    }

    assert.ok(thrownError instanceof EmailNotVerifiedError);
    assert.equal(thrownError.code, "EMAIL_NOT_VERIFIED");

    // Verificar que el mapper de errores de UI no lo enmascare como "contraseña incorrecta"
    const uiError = resolveLoginErrorMessage(thrownError.message);
    assert.equal(uiError, LOGIN_MESSAGES.EMAIL_NOT_VERIFIED);
    assert.ok(uiError.toLowerCase().includes("confirmar tu correo"));

    // Comprobar con código de NextAuth / URL
    assert.equal(
      resolveLoginErrorMessage("EmailNotVerified"),
      LOGIN_MESSAGES.EMAIL_NOT_VERIFIED
    );
    assert.equal(
      resolveLoginErrorMessage("GoogleEmailNotVerified"),
      LOGIN_MESSAGES.EMAIL_NOT_VERIFIED
    );
  });

  // ── 6. Sesión válida tras autenticar ──────────────────────────────────────
  it("Escenario 6: Creación de sesión, cookies y descifrado JWT", async () => {
    const userPayload = {
      id: "usr-session-valid-1",
      email: "verificado@vicecity.test",
      name: "Usuario Verificado",
      role: "CLIENT",
    };

    const sessionToken = await createSessionToken(userPayload);
    const secret = getAuthSecret();

    // Simular recepción de cookie en una petición HTTP
    const req = new NextRequest("http://localhost:3000/cliente/reservar", {
      headers: {
        cookie: `next-auth.session-token=${sessionToken}`,
      },
    });

    const parsedToken = await getToken({ req, secret });
    assert.ok(parsedToken, "NextAuth getToken debe descifrar la sesión");
    assert.equal(parsedToken.sub, userPayload.id);
    assert.equal(parsedToken.email, userPayload.email);
    assert.equal(parsedToken.role, "CLIENT");

    // Verificar configuración segura de cookies
    const httpCookie = getSessionCookieConfig({ isSecure: false });
    assert.equal(httpCookie.name, "next-auth.session-token");
    assert.equal(httpCookie.options.httpOnly, true);
    assert.equal(httpCookie.options.secure, false);

    const httpsCookie = getSessionCookieConfig({ isSecure: true });
    assert.equal(httpsCookie.name, "__Secure-next-auth.session-token");
    assert.equal(httpsCookie.options.secure, true);
  });

  // ── 7. Acceso a una ruta protegida sin sesión ─────────────────────────────
  it("Escenario 7: Acceso a ruta protegida sin sesión es rechazado por el middleware", async () => {
    // A. Ruta web de cliente sin sesión redirige a /login con callbackUrl
    const webReq = new NextRequest("http://localhost:3000/cliente/reservas");
    const webRes = await middleware(webReq, null);

    assert.ok(webRes.status === 307 || webRes.status === 302);
    const location = webRes.headers.get("Location");
    assert.ok(location.includes("/login"));
    assert.ok(location.includes("callbackUrl"));

    // B. Ruta API protegida sin sesión responde 401 UNAUTHORIZED
    const apiReq = new NextRequest("http://localhost:3000/api/users/me");
    const apiRes = await middleware(apiReq, null);
    const apiBody = await apiRes.json();

    assert.equal(apiRes.status, 401);
    assert.equal(apiBody.error, "UNAUTHORIZED");
  });

  // ── 8. Acceso a una ruta protegida con sesión válida ──────────────────────
  it("Escenario 8: Acceso con sesión válida respeta el control de acceso basado en roles (RBAC)", async () => {
    const clientToken = { id: "usr-client-1", role: "CLIENT" };

    // A. Cliente accediendo a su propio dashboard (/cliente) -> Permitido
    const clientReq = new NextRequest("http://localhost:3000/cliente");
    const clientRes = await middleware(clientReq, clientToken);
    assert.equal(clientRes.headers.get("Location"), null, "No debe redirigir al cliente en /cliente");

    // B. Cliente intentando acceder a ruta administrativa (/admin) -> Rechazado con 403 / unauthorized
    const adminReq = new NextRequest("http://localhost:3000/admin/users");
    const adminRes = await middleware(adminReq, clientToken);
    assert.ok(adminRes.status === 307 || adminRes.status === 302);
    const adminRedirect = adminRes.headers.get("Location");
    assert.ok(adminRedirect.includes("/unauthorized") || adminRedirect.includes("/login"));
  });

  // ── 9. Manejo de errores de base de datos o fallos del provider ───────────
  it("Escenario 9: Manejo de errores de BD y caídas de servicio de forma controlada", async () => {
    const brokenDb = {
      users: {
        findFirst: async () => {
          throw new Error("Conexión perdida con PostgreSQL: ECONNREFUSED");
        },
      },
    };

    await assert.rejects(
      async () => {
        await authenticateUser(
          { email: "error@vicecity.test", password: "PasswordValido123!" },
          brokenDb
        );
      },
      (err) => {
        assert.ok(err.message.includes("ECONNREFUSED"));
        return true;
      }
    );

    // Verificación de resiliencia del mapeo de errores de login
    assert.equal(
      resolveLoginErrorMessage(null),
      LOGIN_MESSAGES.GENERIC_INVALID_CREDENTIALS
    );
    assert.equal(
      resolveLoginErrorMessage(undefined),
      LOGIN_MESSAGES.GENERIC_INVALID_CREDENTIALS
    );
    assert.equal(
      resolveLoginErrorMessage("CredentialsSignin"),
      LOGIN_MESSAGES.GENERIC_INVALID_CREDENTIALS
    );
  });
});

