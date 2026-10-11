import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import {
  PasswordResetService,
  MockEmailSender,
  PasswordResetTokenExpiredError,
  InvalidPasswordResetTokenError,
  UserNotFoundError,
  WeakPasswordError,
} from "../../src/features/auth/index.ts";

describe("HU04-B: Lógica de Negocio - Recuperación de Contraseña", () => {
  let mockEmailSender;
  let inMemoryUsers;
  let inMemoryTokens;
  let service;

  // Setup: Simulación en memoria de la capa ORM para pruebas unitarias desacopladas
  beforeEach(() => {
    mockEmailSender = new MockEmailSender();

    inMemoryUsers = [
      {
        id: "user-uuid-1",
        email: "daniella@example.com",
        full_name: "Daniela Zapata",
        password_hash: "$2a$10$oldHashValue1234567890123456789012",
        is_active: true,
      },
    ];

    inMemoryTokens = [];

    // Mock desacoplado de las funciones de repositorio (ORM)
    const mockFindUserByEmail = async (email) => {
      return inMemoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
    };

    const mockCreateToken = async ({ userId, expiresInHours = 1 }) => {
      // Caso límite: invalidar tokens previos activos del mismo usuario
      for (const t of inMemoryTokens) {
        if (t.user_id === userId && !t.used) {
          t.used = true;
          t.used_at = new Date();
        }
      }

      const plainToken = `token-crypto-${Math.random().toString(36).substring(2, 15)}`;
      const tokenRecord = {
        id: `token-id-${inMemoryTokens.length + 1}`,
        user_id: userId,
        plain_token: plainToken,
        expires_at: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
        used: false,
        created_at: new Date(),
      };

      inMemoryTokens.push(tokenRecord);
      return { tokenRecord, plainToken };
    };

    const mockResetPassword = async (plainToken, newPasswordHash) => {
      const token = inMemoryTokens.find((t) => t.plain_token === plainToken);
      if (!token) {
        return { success: false, reason: "NOT_FOUND" };
      }
      if (token.used) {
        return { success: false, reason: "ALREADY_USED" };
      }
      if (token.expires_at <= new Date()) {
        return { success: false, reason: "EXPIRED" };
      }

      // Consumir el token
      token.used = true;
      token.used_at = new Date();

      // Actualizar el hash de contraseña del usuario en memoria
      const user = inMemoryUsers.find((u) => u.id === token.user_id);
      if (user) {
        user.password_hash = newPasswordHash;
      }

      return { success: true, reason: "SUCCESS", userId: token.user_id };
    };

    const mockGetToken = async (plainToken) => {
      const record = inMemoryTokens.find((t) => t.plain_token === plainToken);
      if (!record) return null;
      const user = inMemoryUsers.find((u) => u.id === record.user_id);
      return { ...record, users: user };
    };

    service = new PasswordResetService({
      emailSender: mockEmailSender,
      findUserByEmailFn: mockFindUserByEmail,
      createTokenFn: mockCreateToken,
      resetPasswordFn: mockResetPassword,
      getTokenFn: mockGetToken,
    });
  });

  test("Criterio 1: Genera el token de un solo uso con expiración y envía el correo de recuperación", async () => {
    const result = await service.requestPasswordReset("daniella@example.com");

    assert.equal(result.success, true);
    assert.ok(result.token, "Debe retornar el token generado");

    // Verificar envío desacoplado de correo
    const sentEmail = mockEmailSender.getLastEmail();
    assert.ok(sentEmail, "El correo debió haber sido despachado");
    assert.equal(sentEmail.to, "daniella@example.com");
    assert.match(sentEmail.subject, /Recuperación de Contraseña/i);
    assert.ok(sentEmail.text.includes(result.token), "El correo debe contener el token generado");
    assert.ok(sentEmail.html.includes(result.token), "El HTML debe incluir el enlace con el token");

    // Verificar registro en la capa de persistencia
    const storedToken = inMemoryTokens.find((t) => t.plain_token === result.token);
    assert.ok(storedToken);
    assert.equal(storedToken.used, false);
    assert.ok(storedToken.expires_at > new Date(), "La fecha de expiración debe ser a futuro (1h)");
  });

  test("Criterio 2: Restablecer con un token válido guarda la nueva contraseña encriptada (bcrypt)", async () => {
    const requestRes = await service.requestPasswordReset("daniella@example.com");
    const validToken = requestRes.token;

    const newPassword = "MiNuevaContrasenaSegura2026!";
    const resetRes = await service.resetPassword(validToken, newPassword);

    assert.equal(resetRes.success, true);
    assert.match(resetRes.message, /exitosa/i);

    // Verificar que la contraseña guardada en el usuario está encriptada con bcrypt
    const user = inMemoryUsers.find((u) => u.email === "daniella@example.com");
    assert.notEqual(user.password_hash, newPassword, "La contraseña jamás debe guardarse en texto plano");
    assert.ok(
      bcrypt.compareSync(newPassword, user.password_hash),
      "El hash de la base de datos debe ser verificable con bcrypt"
    );

    // Verificar que el token quedó marcado como usado (de un solo uso)
    const tokenRecord = inMemoryTokens.find((t) => t.plain_token === validToken);
    assert.equal(tokenRecord.used, true);
    assert.ok(tokenRecord.used_at instanceof Date);
  });

  test("Criterio 3 (a): Caso de error - Un token vencido devuelve un error de negocio claro (PasswordResetTokenExpiredError)", async () => {
    const requestRes = await service.requestPasswordReset("daniella@example.com");
    const token = requestRes.token;

    // Simular que el token expiró en el pasado
    const tokenRecord = inMemoryTokens.find((t) => t.plain_token === token);
    tokenRecord.expires_at = new Date(Date.now() - 1000 * 60 * 60); // 1 hora atrás

    await assert.rejects(
      async () => {
        await service.resetPassword(token, "NuevaClave12345");
      },
      (error) => {
        assert.ok(error instanceof PasswordResetTokenExpiredError);
        assert.equal(error.code, "TOKEN_EXPIRED");
        assert.match(error.message, /expirado/i);
        return true;
      }
    );
  });

  test("Criterio 3 (b): Caso de error - Un token ya usado o inválido devuelve InvalidPasswordResetTokenError", async () => {
    const requestRes = await service.requestPasswordReset("daniella@example.com");
    const token = requestRes.token;

    // Primer consumo exitoso
    await service.resetPassword(token, "PrimeraClave2026!");

    // Segundo intento con el mismo token ya usado
    await assert.rejects(
      async () => {
        await service.resetPassword(token, "SegundaClave2026!");
      },
      (error) => {
        assert.ok(error instanceof InvalidPasswordResetTokenError);
        assert.equal(error.code, "INVALID_TOKEN");
        assert.match(error.message, /utilizado/i);
        return true;
      }
    );

    // Intento con token totalmente ficticio
    await assert.rejects(
      async () => {
        await service.resetPassword("token-completamente-inventado", "ClaveValida12345");
      },
      (error) => {
        assert.ok(error instanceof InvalidPasswordResetTokenError);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Una nueva solicitud invalida automáticamente el token anterior", async () => {
    // Primera solicitud
    const firstRequest = await service.requestPasswordReset("daniella@example.com");
    const firstToken = firstRequest.token;

    // Segunda solicitud (invalida la primera)
    const secondRequest = await service.requestPasswordReset("daniella@example.com");
    const secondToken = secondRequest.token;

    assert.notEqual(firstToken, secondToken, "Cada solicitud debe generar un token distinto");

    // Intentar restablecer con el primer token debe fallar
    await assert.rejects(
      async () => {
        await service.resetPassword(firstToken, "ClaveConTokenViejo123");
      },
      (error) => {
        assert.ok(error instanceof InvalidPasswordResetTokenError);
        return true;
      }
    );

    // Restablecer con el segundo token debe ser exitoso
    const successRes = await service.resetPassword(secondToken, "ClaveConTokenNuevo123");
    assert.equal(successRes.success, true);
  });

  test("Validaciones de Negocio: Rechaza correo inexistente y contraseñas débiles", async () => {
    // Correo inexistente
    await assert.rejects(
      async () => {
        await service.requestPasswordReset("inexistente@correo.com");
      },
      (error) => {
        assert.ok(error instanceof UserNotFoundError);
        assert.equal(error.code, "USER_NOT_FOUND");
        return true;
      }
    );

    // Contraseña menor a 8 caracteres
    const requestRes = await service.requestPasswordReset("daniella@example.com");
    await assert.rejects(
      async () => {
        await service.resetPassword(requestRes.token, "12345"); // Menos de 8 caracteres
      },
      (error) => {
        assert.ok(error instanceof WeakPasswordError);
        assert.equal(error.code, "WEAK_PASSWORD");
        assert.match(error.message, /8 caracteres/i);
        return true;
      }
    );
  });
});

