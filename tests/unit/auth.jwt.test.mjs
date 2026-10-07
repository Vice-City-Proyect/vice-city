import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { authenticateUser, authOptions, VALID_SRS_ROLES } from "../../src/lib/auth.ts";
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
});

