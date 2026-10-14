import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EmailConfirmationService, resolveAppBaseUrl } from "../../src/features/auth/services/email-confirmation.service.ts";
import { MockEmailSender } from "../../src/features/auth/services/email.service.ts";
import {
  TokenExpiredError,
  InvalidTokenError,
  UserAlreadyVerifiedError,
  UserNotFoundError,
} from "../../src/features/auth/errors/email-confirmation.errors.ts";

/**
 * Mock generador de PrismaClient para simular la persistencia en memoria
 */
function createMockPrisma({ users = [] } = {}) {
  const usersStore = [...users];

  return {
    usersStore,
    client: {
      users: {
        findUnique: async ({ where }) => {
          return usersStore.find((u) => u.id === where.id) || null;
        },
        findFirst: async ({ where }) => {
          if (where?.email?.equals) {
            const target = where.email.equals.toLowerCase();
            return (
              usersStore.find((u) => u.email.toLowerCase() === target) || null
            );
          }
          if (where?.metadata?.path) {
            const expectedToken = where.metadata.equals;
            return (
              usersStore.find((u) => {
                const meta = u.metadata || {};
                return meta.verification_token?.token === expectedToken;
              }) || null
            );
          }
          return null;
        },
        findMany: async () => {
          return usersStore;
        },
        update: async ({ where, data }) => {
          const index = usersStore.findIndex((u) => u.id === where.id);
          if (index === -1) {
            throw new Error("Usuario no encontrado en base de datos");
          }
          usersStore[index] = {
            ...usersStore[index],
            ...data,
            metadata: {
              ...(usersStore[index].metadata || {}),
              ...(data.metadata || {}),
            },
          };
          return usersStore[index];
        },
      },
    },
  };
}

describe("HU03-B: Lógica de Negocio - Confirmación de Correo Electrónico", () => {
  it("Criterio 1: Genera el token seguro con expiración y envía el correo", async () => {
    const mockUser = {
      id: "usr-uuid-1",
      email: "daniela@example.com",
      full_name: "Daniela Zapata",
      metadata: {},
    };

    const { client, usersStore } = createMockPrisma({ users: [mockUser] });
    const emailSender = new MockEmailSender();
    const service = new EmailConfirmationService(client, emailSender);

    const result = await service.sendVerificationEmail(mockUser.id, mockUser.email);

    // 1. Debe generar resultado exitoso
    assert.equal(result.success, true);
    assert.equal(result.email, "daniela@example.com");
    assert.ok(result.expiresAt instanceof Date);

    // 2. Debe persistir el token en metadata del usuario
    const updatedUser = usersStore[0];
    const tokenData = updatedUser.metadata.verification_token;
    assert.ok(tokenData.token, "Debe tener un token generado");
    assert.equal(tokenData.token.length, 64, "Token hexadecimal de 256 bits (64 caracteres)");
    assert.equal(tokenData.used, false);

    // 3. Debe haber enviado el correo mediante el email sender
    assert.equal(emailSender.sentEmails.length, 1);
    const sentEmail = emailSender.sentEmails[0];
    assert.equal(sentEmail.to, "daniela@example.com");
    assert.equal(sentEmail.token, tokenData.token);
    assert.ok(sentEmail.verificationUrl.includes(tokenData.token));
  });

  it("Criterio 2: Confirmar con un token válido marca al usuario como verificado", async () => {
    const validToken = "valid_token_1234567890abcdef1234567890abcdef";
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const mockUser = {
      id: "usr-uuid-2",
      email: "cliente@vicecity.com",
      metadata: {
        verification_token: {
          token: validToken,
          expires_at: futureDate,
          created_at: new Date().toISOString(),
          used: false,
          revoked: false,
        },
      },
    };

    const { client, usersStore } = createMockPrisma({ users: [mockUser] });
    const service = new EmailConfirmationService(client, new MockEmailSender());

    const result = await service.confirmEmail(validToken);

    // 1. Resultado exitoso
    assert.equal(result.success, true);
    assert.equal(result.userId, "usr-uuid-2");
    assert.equal(result.email, "cliente@vicecity.com");
    assert.ok(result.verifiedAt instanceof Date);

    // 2. Usuario marcado como verificado en base de datos
    const updatedUser = usersStore[0];
    assert.equal(updatedUser.metadata.email_verified, true);
    assert.ok(updatedUser.metadata.email_verified_at);
    assert.equal(updatedUser.metadata.verification_token.used, true);
  });

  it("Criterio 3: Caso de error - Un token vencido devuelve error claro (TokenExpiredError)", async () => {
    const expiredToken = "expired_token_12345";
    // Expiró hace 2 horas
    const pastDate = new Date(Date.now() - 2 * 3600 * 1000).toISOString();

    const mockUser = {
      id: "usr-uuid-3",
      email: "vencido@example.com",
      metadata: {
        verification_token: {
          token: expiredToken,
          expires_at: pastDate,
          created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
          used: false,
          revoked: false,
        },
      },
    };

    const { client } = createMockPrisma({ users: [mockUser] });
    const service = new EmailConfirmationService(client, new MockEmailSender());

    await assert.rejects(
      async () => {
        await service.confirmEmail(expiredToken);
      },
      (err) => {
        assert.ok(err instanceof TokenExpiredError);
        assert.equal(err.code, "TOKEN_EXPIRED");
        assert.ok(err.message.includes("expirado"));
        return true;
      }
    );
  });

  it("Criterio 3 (b): Caso de error - Un token ya usado o inválido devuelve error claro (InvalidTokenError)", async () => {
    const usedToken = "already_used_token_123";
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const mockUser = {
      id: "usr-uuid-4",
      email: "usado@example.com",
      metadata: {
        verification_token: {
          token: usedToken,
          expires_at: futureDate,
          used: true, // Ya fue utilizado
          used_at: new Date().toISOString(),
          revoked: false,
        },
      },
    };

    const { client } = createMockPrisma({ users: [mockUser] });
    const service = new EmailConfirmationService(client, new MockEmailSender());

    // Caso token ya usado
    await assert.rejects(
      async () => {
        await service.confirmEmail(usedToken);
      },
      (err) => {
        assert.ok(err instanceof InvalidTokenError);
        assert.equal(err.code, "INVALID_TOKEN");
        return true;
      }
    );

    // Caso token inventado/inexistente
    await assert.rejects(
      async () => {
        await service.confirmEmail("token_totalmente_inexistente");
      },
      (err) => {
        assert.ok(err instanceof InvalidTokenError);
        return true;
      }
    );
  });

  it("Criterio 4: Caso límite - Reenviar el correo invalida automáticamente el token anterior", async () => {
    const oldToken = "primer_token_antiguo";
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const mockUser = {
      id: "usr-uuid-5",
      email: "reenvio@example.com",
      metadata: {
        email_verified: false,
        verification_token: {
          token: oldToken,
          expires_at: futureDate,
          created_at: new Date().toISOString(),
          used: false,
          revoked: false,
        },
      },
    };

    const { client, usersStore } = createMockPrisma({ users: [mockUser] });
    const emailSender = new MockEmailSender();
    const service = new EmailConfirmationService(client, emailSender);

    // Reenviar correo
    const resendResult = await service.resendVerificationEmail("reenvio@example.com");

    assert.equal(resendResult.success, true);
    assert.equal(emailSender.sentEmails.length, 1);

    const newToken = emailSender.sentEmails[0].token;
    assert.notEqual(newToken, oldToken, "El nuevo token debe ser diferente al anterior");

    // 1. Intentar confirmar con el token VIEJO debe fallar
    await assert.rejects(
      async () => {
        await service.confirmEmail(oldToken);
      },
      (err) => {
        assert.ok(err instanceof InvalidTokenError, "El token anterior debe quedar invalidado");
        return true;
      }
    );

    // 2. Confirmar con el NUEVO token debe ser exitoso
    const confirmResult = await service.confirmEmail(newToken);
    assert.equal(confirmResult.success, true);
    assert.equal(usersStore[0].metadata.email_verified, true);
  });

  it("Caso de negocio: Rechaza si el usuario ya se encuentra verificado", async () => {
    const mockUser = {
      id: "usr-uuid-6",
      email: "yaverificado@example.com",
      metadata: {
        email_verified: true, // Ya verificado
        email_verified_at: new Date().toISOString(),
      },
    };

    const { client } = createMockPrisma({ users: [mockUser] });
    const service = new EmailConfirmationService(client, new MockEmailSender());

    // Rechaza reenvío
    await assert.rejects(
      async () => {
        await service.resendVerificationEmail("yaverificado@example.com");
      },
      (err) => {
        assert.ok(err instanceof UserAlreadyVerifiedError);
        assert.equal(err.code, "USER_ALREADY_VERIFIED");
        return true;
      }
    );
  });

  describe("H-AUTH-01 & H-AUTH-06: Configuración de URL base y prevención de ERR_SSL_PROTOCOL_ERROR", () => {
    it("resuelve 'http://localhost:3000' por defecto cuando no hay variables ni customBaseUrl", () => {
      const url = resolveAppBaseUrl(undefined, {});
      assert.equal(url, "http://localhost:3000");
    });

    it("utiliza NEXT_PUBLIC_APP_URL si está definido", () => {
      const url = resolveAppBaseUrl(undefined, {
        NEXT_PUBLIC_APP_URL: "http://127.0.0.1:4000",
      });
      assert.equal(url, "http://127.0.0.1:4000");
    });

    it("usa NEXTAUTH_URL como fallback si NEXT_PUBLIC_APP_URL no está definido", () => {
      const url = resolveAppBaseUrl(undefined, {
        NEXTAUTH_URL: "http://localhost:3001",
      });
      assert.equal(url, "http://localhost:3001");
    });

    it("elimina barras diagonales finales de la URL base", () => {
      const url = resolveAppBaseUrl("http://localhost:3000///", {});
      assert.equal(url, "http://localhost:3000");
    });

    it("normaliza defensivamente 'https://localhost' a 'http://' en desarrollo para prevenir ERR_SSL_PROTOCOL_ERROR", () => {
      const url = resolveAppBaseUrl(undefined, {
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "https://localhost:3000",
      });
      assert.equal(url, "http://localhost:3000");
    });

    it("normaliza defensivamente 'https://127.0.0.1' a 'http://' en desarrollo", () => {
      const url = resolveAppBaseUrl(undefined, {
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "https://127.0.0.1:8080",
      });
      assert.equal(url, "http://127.0.0.1:8080");
    });

    it("preserva HTTPS en desarrollo si LOCAL_HTTPS='true' está configurado explícitamente", () => {
      const url = resolveAppBaseUrl(undefined, {
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "https://localhost:3000",
        LOCAL_HTTPS: "true",
      });
      assert.equal(url, "https://localhost:3000");
    });

    it("preserva estrictamente HTTPS en producción (NODE_ENV='production')", () => {
      const prodUrl = resolveAppBaseUrl(undefined, {
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://vicecity.club",
      });
      assert.equal(prodUrl, "https://vicecity.club");
    });

    it("construye verificationUrl correctamente en sendVerificationEmail y resendVerificationEmail", async () => {
      const mockUser = {
        id: "usr-uuid-proto-1",
        email: "ssl-check@vicecity.com",
        metadata: {},
      };

      const { client } = createMockPrisma({ users: [mockUser] });
      const emailSender = new MockEmailSender();
      const service = new EmailConfirmationService(client, emailSender);

      // Enviar primer correo
      await service.sendVerificationEmail(mockUser.id, mockUser.email);
      assert.equal(emailSender.sentEmails.length, 1);
      const firstEmail = emailSender.sentEmails[0];
      assert.ok(
        firstEmail.verificationUrl.startsWith("http://localhost:3000/verify-email?token="),
        `La URL debe ser http://localhost:3000 y no https://, recibido: ${firstEmail.verificationUrl}`
      );

      // Reenviar correo
      await service.resendVerificationEmail(mockUser.email);
      assert.equal(emailSender.sentEmails.length, 2);
      const secondEmail = emailSender.sentEmails[1];
      assert.ok(
        secondEmail.verificationUrl.startsWith("http://localhost:3000/verify-email?token="),
        `La URL de reenvío debe ser http://localhost:3000, recibido: ${secondEmail.verificationUrl}`
      );
    });
  });
});
