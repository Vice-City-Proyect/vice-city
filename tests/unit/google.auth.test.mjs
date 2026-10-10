import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  GoogleAuthService,
  GoogleEmailNotProvidedError,
  UserInactiveError,
} from "../../src/features/auth/index.ts";

describe("HU05-B: Lógica de Negocio - Inicio de Sesión con Google", () => {
  let inMemoryUsers;
  let inMemoryRoles;
  let service;

  beforeEach(() => {
    // Configuración de roles en memoria
    inMemoryRoles = [
      { id: "role-client-uuid", name: "customer" }, // rol cliente en Vice City
      { id: "role-admin-uuid", name: "admin" },
    ];

    // Base de datos de usuarios en memoria
    inMemoryUsers = [
      {
        id: "user-existing-1",
        role_id: "role-client-uuid",
        email: "carlos.perez@example.com",
        full_name: "Carlos Pérez",
        password_hash: "$2a$10$hashedPassword123",
        is_active: true,
        metadata: {
          auth_provider: "credentials",
          email_verified: false,
        },
        roles: { name: "customer" },
        created_at: new Date("2026-01-01"),
        updated_at: new Date("2026-01-01"),
      },
      {
        id: "user-inactive-1",
        role_id: "role-client-uuid",
        email: "bloqueado@example.com",
        full_name: "Usuario Bloqueado",
        password_hash: "$2a$10$hashedPassword123",
        is_active: false,
        metadata: {},
        roles: { name: "customer" },
        created_at: new Date("2026-01-01"),
        updated_at: new Date("2026-01-01"),
      },
    ];

    // Mock desacoplado de las operaciones ORM
    const mockFindUserByEmail = async (email) => {
      // Simula el comportamiento de Prisma: case-insensitive
      return (
        inMemoryUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        ) || null
      );
    };

    const mockFindClientRole = async () => {
      return inMemoryRoles.find((r) => r.name === "customer" || r.name === "client") || null;
    };

    const mockCreateUser = async (data) => {
      const newUser = {
        id: `user-google-${inMemoryUsers.length + 1}`,
        role_id: data.role_id,
        email: data.email,
        full_name: data.full_name,
        password_hash: data.password_hash || null,
        is_active: data.is_active,
        metadata: data.metadata,
        roles: { name: "customer" },
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryUsers.push(newUser);
      return newUser;
    };

    const mockUpdateUser = async (id, data) => {
      const user = inMemoryUsers.find((u) => u.id === id);
      if (!user) throw new Error("Usuario no encontrado para actualizar");
      if (data.metadata) user.metadata = { ...user.metadata, ...data.metadata };
      if (data.last_login_at) user.last_login_at = data.last_login_at;
      if (data.updated_at) user.updated_at = data.updated_at;
      return user;
    };

    service = new GoogleAuthService({
      findUserByEmailFn: mockFindUserByEmail,
      findClientRoleFn: mockFindClientRole,
      createUserFn: mockCreateUser,
      updateUserFn: mockUpdateUser,
    });
  });

  test("Criterio 1: Un usuario nuevo se crea con rol CLIENT y correo verificado", async () => {
    const googleProfile = {
      id: "google-sub-987654",
      email: "nuevo.usuario@gmail.com",
      name: "Daniela Zapata",
      picture: "https://lh3.googleusercontent.com/avatar/daniella.jpg",
      email_verified: true,
    };

    const initialCount = inMemoryUsers.length;
    const result = await service.handleGoogleAuth(googleProfile);

    // Verificaciones del resultado
    assert.equal(result.isNewUser, true);
    assert.equal(result.isLinked, false);
    assert.equal(result.user.email, "nuevo.usuario@gmail.com");
    assert.equal(result.user.full_name, "Daniela Zapata");
    assert.equal(result.user.role, "CLIENT");
    assert.equal(result.user.email_verified, true, "El correo de Google debe tratarse como verificado");
    assert.equal(result.user.metadata.google_id, "google-sub-987654");
    assert.deepEqual(result.user.metadata.linked_providers, ["google"]);
    assert.equal(inMemoryUsers.length, initialCount + 1, "Debe haberse persistido exactamente un nuevo usuario");
  });

  test("Criterio 2: Un usuario existente se vincula a Google sin duplicarse", async () => {
    const googleProfile = {
      id: "google-sub-123456",
      email: "carlos.perez@example.com", // Ya existe en la base de datos
      name: "Carlos Pérez desde Google",
      picture: "https://lh3.googleusercontent.com/avatar/carlos.jpg",
      email_verified: true,
    };

    const initialCount = inMemoryUsers.length;
    const result = await service.handleGoogleAuth(googleProfile);

    // Verificaciones del resultado
    assert.equal(result.isNewUser, false);
    assert.equal(result.isLinked, true);
    assert.equal(result.user.id, "user-existing-1");
    assert.equal(result.user.email, "carlos.perez@example.com");
    assert.equal(result.user.email_verified, true, "El correo debe actualizarse a verificado tras vincular Google");
    assert.equal(result.user.metadata.google_id, "google-sub-123456");
    assert.ok(result.user.metadata.linked_providers.includes("google"));

    // No debe duplicarse en la base de datos
    assert.equal(inMemoryUsers.length, initialCount, "No deben crearse registros adicionales de usuario");
  });

  test("Criterio 3: Caso de error - Google sin correo disponible devuelve un error de negocio claro (GoogleEmailNotProvidedError)", async () => {
    // Caso 1: email null
    await assert.rejects(
      async () => {
        await service.handleGoogleAuth({
          id: "google-no-email-1",
          email: null,
          name: "Sin Correo",
        });
      },
      (error) => {
        assert.ok(error instanceof GoogleEmailNotProvidedError);
        assert.equal(error.code, "GOOGLE_EMAIL_NOT_PROVIDED");
        assert.match(error.message, /correo electrónico/i);
        return true;
      }
    );

    // Caso 2: email vacío
    await assert.rejects(
      async () => {
        await service.handleGoogleAuth({
          id: "google-no-email-2",
          email: "   ",
          name: "Email Espacios",
        });
      },
      (error) => {
        assert.ok(error instanceof GoogleEmailNotProvidedError);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Un correo con distinta capitalización se reconoce como el mismo usuario", async () => {
    // Carlos Pérez está guardado como 'carlos.perez@example.com'
    // Google devuelve el correo con mayúsculas mezcladas
    const googleProfile = {
      id: "google-sub-capitalization",
      email: "CARLOS.PEREZ@EXAMPLE.COM",
      name: "Carlos Pérez",
    };

    const initialCount = inMemoryUsers.length;
    const result = await service.handleGoogleAuth(googleProfile);

    // Debe vincular la cuenta existente sin crear un duplicado
    assert.equal(result.isNewUser, false, "Debe reconocer que no es un usuario nuevo");
    assert.equal(result.isLinked, true, "Debe vincular al usuario existente");
    assert.equal(result.user.id, "user-existing-1", "Debe coincidir con el ID del usuario existente");
    assert.equal(inMemoryUsers.length, initialCount, "No deben existir registros duplicados por mayúsculas/minúsculas");
  });

  test("Validación de seguridad: Rechaza vinculación si la cuenta está inactiva (UserInactiveError)", async () => {
    const googleProfile = {
      id: "google-sub-inactive",
      email: "bloqueado@example.com",
      name: "Usuario Bloqueado",
    };

    await assert.rejects(
      async () => {
        await service.handleGoogleAuth(googleProfile);
      },
      (error) => {
        assert.ok(error instanceof UserInactiveError);
        assert.equal(error.code, "USER_INACTIVE");
        assert.match(error.message, /inactiva/i);
        return true;
      }
    );
  });
});

