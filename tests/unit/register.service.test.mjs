import test, { describe } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { registerUser } from "../../src/features/auth/services/register.service.ts";
import {
  UserAlreadyExistsError,
  RoleNotFoundError,
  AuthValidationError,
} from "../../src/features/auth/errors/auth.errors.ts";

describe("HU-01: Lógica de Negocio - Registro de Usuarios", () => {
  const mockRole = {
    id: "role-client-uuid",
    name: "customer",
  };

  test("Criterio 1: Debe registrar un usuario exitosamente con contraseña encriptada y rol CLIENT", async () => {
    let createdUserData = null;

    const mockDb = {
      users: {
        findFirst: async () => null,
        create: async ({ data }) => {
          createdUserData = data;
          return {
            id: "user-123",
            email: data.email,
            full_name: data.full_name,
            password_hash: data.password_hash,
            role_id: data.role_id,
            created_at: new Date("2026-10-01T12:00:00Z"),
            roles: mockRole,
          };
        },
      },
      roles: {
        findFirst: async () => mockRole,
      },
    };

    const input = {
      fullName: "Daniela Zapata",
      email: "daniela@test.com",
      password: "Password123!",
    };

    const result = await registerUser(input, mockDb);

    assert.equal(result.email, "daniela@test.com");
    assert.equal(result.fullName, "Daniela Zapata");
    assert.equal(result.role, "customer");
    assert.equal("password_hash" in result, false);

    assert.ok(createdUserData);
    assert.equal(createdUserData.email, "daniela@test.com");
    const isPasswordHashed = await bcrypt.compare(
      "Password123!",
      createdUserData.password_hash
    );
    assert.equal(isPasswordHashed, true);
  });

  test("Criterio 2: Caso de error - Correo ya registrado devuelve un error de negocio claro", async () => {
    const mockDb = {
      users: {
        findFirst: async () => ({
          id: "existing-user",
          email: "daniela@test.com",
        }),
      },
      roles: {
        findFirst: async () => mockRole,
      },
    };

    const input = {
      fullName: "Daniela Zapata",
      email: "daniela@test.com",
      password: "Password123!",
    };

    await assert.rejects(
      async () => registerUser(input, mockDb),
      (err) => {
        assert.ok(err instanceof UserAlreadyExistsError);
        assert.equal(err.code, "USER_ALREADY_EXISTS");
        assert.equal(
          err.message,
          "El correo electrónico ya se encuentra registrado"
        );
        return true;
      }
    );
  });

  test("Criterio 3: Caso límite - Correos que solo cambian en mayúsculas/minúsculas se detectan como duplicados", async () => {
    let queriedEmail = null;

    const mockDb = {
      users: {
        findFirst: async ({ where }) => {
          queriedEmail = where.email.equals;
          return { id: "existing-user", email: "daniela@test.com" };
        },
      },
      roles: {
        findFirst: async () => mockRole,
      },
    };

    const input = {
      fullName: "Daniela Zapata",
      email: "  DANIELA@TEST.COM  ",
      password: "Password123!",
    };

    await assert.rejects(
      async () => registerUser(input, mockDb),
      (err) => err instanceof UserAlreadyExistsError
    );

    assert.equal(queriedEmail, "daniela@test.com");
  });

  test("Criterio 4: Valida datos obligatorios faltantes o inválidos con AuthValidationError", async () => {
    const mockDb = {
      users: { findFirst: async () => null },
      roles: { findFirst: async () => mockRole },
    };

    await assert.rejects(
      async () =>
        registerUser(
          { fullName: "D", email: "invalid-email", password: "123" },
          mockDb
        ),
      (err) => err instanceof AuthValidationError
    );
  });

  test("Criterio 5: Caso de error cuando el rol CLIENT no se encuentra en el sistema", async () => {
    const mockDb = {
      users: { findFirst: async () => null },
      roles: { findFirst: async () => null },
    };

    const input = {
      fullName: "Daniela Zapata",
      email: "daniela@test.com",
      password: "Password123!",
    };

    await assert.rejects(
      async () => registerUser(input, mockDb),
      (err) => err instanceof RoleNotFoundError
    );
  });
});

