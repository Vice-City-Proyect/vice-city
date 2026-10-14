import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { authenticateUser, authOptions, getAuthSecret, VALID_SRS_ROLES } from "../../src/lib/auth.ts";
import { EmailNotVerifiedError } from "../../src/features/auth/errors/auth.errors.ts";
import { hashPassword } from "../../src/lib/password.ts";

/**
 * Mock generador de PrismaClient para simular la base de datos en memoria
 */
function createMockPrisma({ users = [] } = {}) {
  const usersStore = [...users];

  return {
    usersStore,
    client: {
      users: {
        findFirst: async ({ where }) => {
          if (where?.email?.equals) {
            const target = where.email.equals.toLowerCase();
            return (
              usersStore.find(
                (u) =>
                  u.email.toLowerCase() === target &&
                  (where.is_active === undefined || u.is_active === where.is_active)
              ) || null
            );
          }
          return null;
        },
      },
    },
  };
}

describe("HU02-B: Lógica de Negocio - Autenticación y JWT (NextAuth)", () => {
  it("Criterio 1 y 2: Autenticación exitosa genera usuario y sesión con id, email y rol SRS válido (CLIENT)", async () => {
    const rawPassword = "PasswordSeguro123!";
    const hashedPassword = await hashPassword(rawPassword);

    const mockUser = {
      id: "usr-client-uuid-1",
      email: "daniela.cliente@vicecity.com",
      full_name: "Daniela Zapata",
      password_hash: hashedPassword,
      is_active: true,
      email_verified: true,
      roles: {
        id: "role-client-1",
        name: "CLIENT",
        description: "Cliente final",
      },
    };

    const { client } = createMockPrisma({ users: [mockUser] });

    // 1. Probar authenticateUser
    const userResult = await authenticateUser(
      {
        email: "  DANIELA.CLIENTE@VICECITY.COM  ", // Prueba mayúsculas y espacios
        password: rawPassword,
      },
      client
    );

    assert.ok(userResult, "Debe retornar el usuario autenticado");
    assert.equal(userResult.id, "usr-client-uuid-1");
    assert.equal(userResult.email, "daniela.cliente@vicecity.com");
    assert.equal(userResult.name, "Daniela Zapata");
    assert.equal(userResult.role, "CLIENT");
    assert.ok(VALID_SRS_ROLES.includes(userResult.role), "El rol debe pertenecer al SRS");

    // 2. Probar callback jwt
    const jwtCallback = authOptions.callbacks?.jwt;
    assert.ok(jwtCallback, "El callback jwt debe existir");
    const token = await jwtCallback({
      token: { sub: userResult.id },
      user: userResult,
      account: null,
    });

    assert.equal(token.id, "usr-client-uuid-1", "El token debe incluir id");
    assert.equal(token.role, "CLIENT", "El token debe incluir role");

    // 3. Probar callback session
    const sessionCallback = authOptions.callbacks?.session;
    assert.ok(sessionCallback, "El callback session debe existir");
    const session = await sessionCallback({
      session: {
        user: { name: userResult.name, email: userResult.email },
        expires: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      },
      token,
      user: userResult,
    });

    assert.equal(session.user.id, "usr-client-uuid-1", "La sesión debe incluir id");
    assert.equal(session.user.role, "CLIENT", "La sesión debe incluir role");
  });

  it("Criterio 2: Admite los cuatro roles permitidos por el SRS (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR)", async () => {
    const rawPassword = "PasswordSeguro123!";
    const hashedPassword = await hashPassword(rawPassword);

    for (const role of ["ADMIN", "CLIENT", "TICKET_SELLER", "QR_VALIDATOR"]) {
      const mockUser = {
        id: `usr-${role.toLowerCase()}-uuid`,
        email: `empleado.${role.toLowerCase()}@vicecity.com`,
        full_name: `Empleado ${role}`,
        password_hash: hashedPassword,
        is_active: true,
        email_verified: true,
        roles: {
          id: `role-${role.toLowerCase()}`,
          name: role,
        },
      };

      const { client } = createMockPrisma({ users: [mockUser] });

      const userResult = await authenticateUser(
        { email: mockUser.email, password: rawPassword },
        client
      );

      assert.equal(userResult.role, role);
      assert.ok(VALID_SRS_ROLES.includes(userResult.role));
    }
  });

  it("Criterio 3: Rechaza credenciales incorrectas con error claro (contraseña inválida)", async () => {
    const hashedPassword = await hashPassword("PasswordCorrecto123!");
    const mockUser = {
      id: "usr-1",
      email: "test@vicecity.com",
      full_name: "Usuario Test",
      password_hash: hashedPassword,
      is_active: true,
      roles: { id: "r-1", name: "CLIENT" },
    };

    const { client } = createMockPrisma({ users: [mockUser] });

    await assert.rejects(
      async () => {
        await authenticateUser(
          { email: "test@vicecity.com", password: "PasswordINCORRECTO" },
          client
        );
      },
      (err) => {
        assert.ok(err.message.includes("Credenciales incorrectas"));
        return true;
      }
    );
  });

  it("Criterio 3 (b): Rechaza con error claro cuando el usuario no existe", async () => {
    const { client } = createMockPrisma({ users: [] });

    await assert.rejects(
      async () => {
        await authenticateUser(
          { email: "inexistente@vicecity.com", password: "CualquierPassword123" },
          client
        );
      },
      (err) => {
        assert.ok(err.message.includes("Credenciales incorrectas"));
        return true;
      }
    );
  });

  it("Criterio 4: Caso de error - Un usuario sin rol válido del SRS no puede iniciar sesión", async () => {
    const hashedPassword = await hashPassword("PasswordSeguro123!");
    const mockUser = {
      id: "usr-bad-role",
      email: "hacker@vicecity.com",
      full_name: "Rol Invalido",
      password_hash: hashedPassword,
      is_active: true,
      email_verified: true,
      roles: {
        id: "role-invalid",
        name: "SUPER_GUEST_INVALIDO", // No pertenece al SRS
      },
    };

    const { client } = createMockPrisma({ users: [mockUser] });

    await assert.rejects(
      async () => {
        await authenticateUser(
          { email: "hacker@vicecity.com", password: "PasswordSeguro123!" },
          client
        );
      },
      (err) => {
        assert.ok(
          err.message.includes("no posee un rol válido del sistema"),
          "Debe rechazar si el rol no es ADMIN, CLIENT, TICKET_SELLER o QR_VALIDATOR"
        );
        return true;
      }
    );
  });

  it("Criterio 5: Caso límite - Correo o contraseña vacíos, o con solo espacios, se rechazan con mensaje claro", async () => {
    const { client } = createMockPrisma();

    // Caso A: Email vacío o solo espacios
    await assert.rejects(
      async () => {
        await authenticateUser({ email: "   ", password: "PasswordSeguro123!" }, client);
      },
      (err) => {
        assert.ok(err.message.includes("El correo electrónico es obligatorio"));
        return true;
      }
    );

    // Caso B: Password vacía o solo espacios
    await assert.rejects(
      async () => {
        await authenticateUser({ email: "test@vicecity.com", password: "    " }, client);
      },
      (err) => {
        assert.ok(err.message.includes("La contraseña es obligatoria"));
        return true;
      }
    );

    // Caso C: Ambos nulos o vacíos
    await assert.rejects(
      async () => {
        await authenticateUser({ email: "", password: "" }, client);
      },
      (err) => {
        assert.ok(err.message.includes("obligatorio"));
        return true;
      }
    );
  });

  it("Criterio H-AUTH-02: Rechaza inicio de sesión con EmailNotVerifiedError si el correo no ha sido verificado", async () => {
    const rawPassword = "PasswordSeguro123!";
    const hashedPassword = await hashPassword(rawPassword);

    const mockUnverifiedUser = {
      id: "usr-unverified-uuid",
      email: "noverificado@vicecity.com",
      full_name: "Usuario No Verificado",
      password_hash: hashedPassword,
      is_active: true,
      email_verified: false,
      roles: {
        id: "role-client-1",
        name: "CLIENT",
      },
    };

    const { client } = createMockPrisma({ users: [mockUnverifiedUser] });

    await assert.rejects(
      async () => {
        await authenticateUser(
          { email: "noverificado@vicecity.com", password: rawPassword },
          client
        );
      },
      (err) => {
        assert.ok(err instanceof EmailNotVerifiedError, "Debe ser instancia de EmailNotVerifiedError");
        assert.equal(err.code, "EMAIL_NOT_VERIFIED");
        assert.ok(err.message.includes("Debes confirmar tu correo"));
        return true;
      }
    );
  });

  it("Criterio H-AUTH-02 (Anti-enumeración): Usuario no verificado con contraseña INCORRECTA lanza error genérico de credenciales", async () => {
    const rawPassword = "PasswordSeguro123!";
    const hashedPassword = await hashPassword(rawPassword);

    const mockUnverifiedUser = {
      id: "usr-unverified-uuid-2",
      email: "noverificado2@vicecity.com",
      full_name: "Usuario No Verificado 2",
      password_hash: hashedPassword,
      is_active: true,
      email_verified: false,
      roles: {
        id: "role-client-1",
        name: "CLIENT",
      },
    };

    const { client } = createMockPrisma({ users: [mockUnverifiedUser] });

    await assert.rejects(
      async () => {
        await authenticateUser(
          { email: "noverificado2@vicecity.com", password: "PasswordErroneo999!" },
          client
        );
      },
      (err) => {
        assert.ok(!(err instanceof EmailNotVerifiedError), "No debe revelar si el correo está o no verificado ante contraseña errónea");
        assert.ok(err.message.includes("Credenciales incorrectas"));
        return true;
      }
    );
  });

  it("Criterio H-AUTH-02 (Soporte Dual): Usuario verificado vía metadata.email_verified permite iniciar sesión", async () => {
    const rawPassword = "PasswordSeguro123!";
    const hashedPassword = await hashPassword(rawPassword);

    const mockMetaVerifiedUser = {
      id: "usr-meta-verified-uuid",
      email: "metaverified@vicecity.com",
      full_name: "Usuario Verificado Meta",
      password_hash: hashedPassword,
      is_active: true,
      email_verified: false, // Columna física false pero metadata true
      metadata: {
        email_verified: true,
      },
      roles: {
        id: "role-client-1",
        name: "CLIENT",
      },
    };

    const { client } = createMockPrisma({ users: [mockMetaVerifiedUser] });

    const user = await authenticateUser(
      { email: "metaverified@vicecity.com", password: rawPassword },
      client
    );

    assert.equal(user.id, "usr-meta-verified-uuid");
    assert.equal(user.email, "metaverified@vicecity.com");
    assert.equal(user.role, "CLIENT");
  });
  // -------------------------------------------------------------------------
  // VALIDACIONES DE SEGURIDAD (PR #8 - Corrección de secreto JWT)
  // -------------------------------------------------------------------------
  it("Seguridad (PR #8): getAuthSecret retorna la clave cuando NEXTAUTH_SECRET está configurada", () => {
    const secret = getAuthSecret({ NEXTAUTH_SECRET: "mi-clave-super-secreta-de-prueba-12345" });
    assert.equal(secret, "mi-clave-super-secreta-de-prueba-12345");
  });

  it("Seguridad (PR #8): getAuthSecret retorna la clave cuando JWT_SECRET está configurada como fallback", () => {
    const secret = getAuthSecret({ JWT_SECRET: "fallback-jwt-secret-key-prueba" });
    assert.equal(secret, "fallback-jwt-secret-key-prueba");
  });

  it("Seguridad (PR #8): getAuthSecret lanza error explícito si falta la variable de entorno en runtime", () => {
    assert.throws(
      () => {
        getAuthSecret({ NODE_ENV: "production" });
      },
      (err) => {
        assert.ok(err.message.includes("Configuración de seguridad faltante"));
        assert.ok(err.message.includes("NEXTAUTH_SECRET"));
        return true;
      }
    );
  });
});

