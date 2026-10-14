import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EmailConfirmationService,
  resolveAppBaseUrl,
  hashVerificationToken,
} from "../../src/features/auth/services/email-confirmation.service.ts";
import { MockEmailSender } from "../../src/features/auth/services/email.service.ts";
import {
  TokenExpiredError,
  InvalidTokenError,
  UserAlreadyVerifiedError,
  TokenAlreadyUsedError,
} from "../../src/features/auth/errors/email-confirmation.errors.ts";

/**
 * Mock generador de PrismaClient para simular la persistencia en memoria (con soporte para verification_tokens)
 */
function createMockPrisma({ users = [], verificationTokens = [] } = {}) {
  const usersStore = [...users];
  const tokensStore = [...verificationTokens];

  return {
    usersStore,
    tokensStore,
    client: {
      verification_tokens: {
        findFirst: async ({ where, include }) => {
          const record = tokensStore.find((t) => {
            if (where?.OR) {
              return where.OR.some((cond) => {
                if (cond.token_hash) return t.token_hash === cond.token_hash;
                return false;
              });
            }
            if (where?.token_hash) return t.token_hash === where.token_hash;
            if (where?.user_id && where?.used !== undefined) {
              return t.user_id === where.user_id && t.used === where.used;
            }
            return false;
          });
          if (!record) return null;
          if (include?.users) {
            const user = usersStore.find((u) => u.id === record.user_id);
            return { ...record, users: user || null };
          }
          return record;
        },
        create: async ({ data }) => {
          const newRecord = {
            id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            used: false,
            used_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            type: "email_verification",
            ...data,
          };
          tokensStore.push(newRecord);
          return newRecord;
        },
        updateMany: async ({ where, data }) => {
          let count = 0;
          for (let i = 0; i < tokensStore.length; i++) {
            const matchesUser = !where?.user_id || tokensStore[i].user_id === where.user_id;
            const matchesUsed = where?.used === undefined || tokensStore[i].used === where.used;
            if (matchesUser && matchesUsed) {
              tokensStore[i] = { ...tokensStore[i], ...data };
              count++;
            }
          }
          return { count };
        },
        update: async ({ where, data }) => {
          const index = tokensStore.findIndex((t) => t.id === where.id);
          if (index !== -1) {
            tokensStore[index] = { ...tokensStore[index], ...data };
            return tokensStore[index];
          }
          return null;
        },
      },
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
          const nextMetadata =
            data.metadata !== undefined ? data.metadata : usersStore[index].metadata;
          usersStore[index] = {
            ...usersStore[index],
            ...data,
            metadata: nextMetadata,
          };
          return usersStore[index];
        },
      },
    },
  };
}

describe("HU03-B: Lógica de Negocio - Confirmación de Correo Electrónico", () => {
  it("Criterio 1: Genera el token seguro con expiración y envía el correo (persistencia en tabla dedicada)", async () => {
    const mockUser = {
      id: "usr-uuid-1",
      email: "daniela@example.com",
      full_name: "Daniela Zapata",
      metadata: {},
    };

    const { client, usersStore, tokensStore } = createMockPrisma({ users: [mockUser] });
    const emailSender = new MockEmailSender();
    const service = new EmailConfirmationService(client, emailSender);

    const result = await service.sendVerificationEmail(mockUser.id, mockUser.email);

    // 1. Debe generar resultado exitoso
    assert.equal(result.success, true);
    assert.equal(result.email, "daniela@example.com");
    assert.ok(result.expiresAt instanceof Date);

    // 2. Debe persistir el token exclusivamente como hash en verification_tokens (H-AUTH-05)
    assert.equal(tokensStore.length, 1);
    const tokenRecord = tokensStore[0];
    assert.ok(tokenRecord.token_hash, "Debe tener un hash SHA-256 generado");
    assert.equal(tokenRecord.token_hash.length, 64, "Hash SHA-256 hexadecimal de 64 caracteres");
    assert.equal(tokenRecord.used, false);

    // 3. NUNCA debe guardar el token en texto plano en users.metadata (H-AUTH-05)
    const updatedUser = usersStore[0];
    assert.equal(updatedUser.metadata?.verification_token, undefined, "No debe existir verification_token en users.metadata");

    // 4. Debe haber enviado el correo mediante el email sender con el token en texto plano solo en memoria
    assert.equal(emailSender.sentEmails.length, 1);
    const sentEmail = emailSender.sentEmails[0];
    assert.equal(sentEmail.to, "daniela@example.com");
    assert.equal(sentEmail.token.length, 64, "Token enviado debe ser de 256 bits (64 caracteres)");
    assert.ok(sentEmail.verificationUrl.includes(sentEmail.token));
  });

  it("Criterio 2: Confirmar con un token válido marca al usuario como verificado", async () => {
    const validToken = "valid_token_1234567890abcdef1234567890abcdef";
    const tokenHash = hashVerificationToken(validToken);
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000);

    const mockUser = {
      id: "usr-uuid-2",
      email: "cliente@vicecity.com",
      email_verified: false,
      metadata: {},
    };

    const mockToken = {
      id: "tok-valid-1",
      user_id: mockUser.id,
      token_hash: tokenHash,
      expires_at: futureDate,
      used: false,
      users: mockUser,
    };

    const { client, usersStore, tokensStore } = createMockPrisma({
      users: [mockUser],
      verificationTokens: [mockToken],
    });
    const service = new EmailConfirmationService(client, new MockEmailSender());

    const result = await service.confirmEmail(validToken);

    // 1. Resultado exitoso
    assert.equal(result.success, true);
    assert.equal(result.userId, "usr-uuid-2");
    assert.equal(result.email, "cliente@vicecity.com");
    assert.ok(result.verifiedAt instanceof Date);

    // 2. Token marcado como usado en tabla dedicada
    assert.equal(tokensStore[0].used, true);

    // 3. Usuario marcado como verificado en base de datos
    const updatedUser = usersStore[0];
    assert.equal(updatedUser.email_verified, true);
    assert.ok(updatedUser.email_verified_at instanceof Date);
    assert.equal(updatedUser.metadata?.email_verified, true);
    assert.equal(updatedUser.metadata?.verification_token, undefined, "No debe contener verification_token en metadata");
  });

  it("Criterio 3: Caso de error - Un token vencido devuelve error claro (TokenExpiredError)", async () => {
    const expiredToken = "expired_token_12345";
    const tokenHash = hashVerificationToken(expiredToken);
    const pastDate = new Date(Date.now() - 2 * 3600 * 1000);

    const mockUser = {
      id: "usr-uuid-3",
      email: "vencido@example.com",
      email_verified: false,
      metadata: {},
    };

    const mockToken = {
      id: "tok-expired-1",
      user_id: mockUser.id,
      token_hash: tokenHash,
      expires_at: pastDate,
      used: false,
      users: mockUser,
    };

    const { client } = createMockPrisma({
      users: [mockUser],
      verificationTokens: [mockToken],
    });
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

  it("Criterio 3 (b): Caso de error - Un token ya usado o inválido devuelve error claro", async () => {
    const usedToken = "already_used_token_123";
    const tokenHash = hashVerificationToken(usedToken);
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000);

    const mockUser = {
      id: "usr-uuid-4",
      email: "usado@example.com",
      email_verified: false,
      metadata: {},
    };

    const mockToken = {
      id: "tok-used-1",
      user_id: mockUser.id,
      token_hash: tokenHash,
      expires_at: futureDate,
      used: true,
      users: mockUser,
    };

    const { client } = createMockPrisma({
      users: [mockUser],
      verificationTokens: [mockToken],
    });
    const service = new EmailConfirmationService(client, new MockEmailSender());

    // Caso token ya usado
    await assert.rejects(
      async () => {
        await service.confirmEmail(usedToken);
      },
      (err) => {
        assert.ok(err instanceof TokenAlreadyUsedError || err instanceof InvalidTokenError);
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
    const oldTokenHash = hashVerificationToken(oldToken);
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000);

    const mockUser = {
      id: "usr-uuid-5",
      email: "reenvio@example.com",
      email_verified: false,
      metadata: {},
    };

    const oldTokenRecord = {
      id: "tok-old-1",
      user_id: mockUser.id,
      token_hash: oldTokenHash,
      expires_at: futureDate,
      used: false,
      users: mockUser,
    };

    const { client, usersStore, tokensStore } = createMockPrisma({
      users: [mockUser],
      verificationTokens: [oldTokenRecord],
    });
    const emailSender = new MockEmailSender();
    const service = new EmailConfirmationService(client, emailSender);

    // Reenviar correo
    const resendResult = await service.resendVerificationEmail("reenvio@example.com");

    assert.equal(resendResult.success, true);
    assert.equal(emailSender.sentEmails.length, 1);

    const newToken = emailSender.sentEmails[0].token;
    assert.notEqual(newToken, oldToken, "El nuevo token debe ser diferente al anterior");

    // El token viejo en tokensStore debe estar marcado como usado
    const oldInStore = tokensStore.find((t) => t.id === "tok-old-1");
    assert.equal(oldInStore.used, true, "El token anterior debe haber sido invalidado con used: true");

    // 1. Intentar confirmar con el token VIEJO debe fallar
    await assert.rejects(
      async () => {
        await service.confirmEmail(oldToken);
      },
      (err) => {
        assert.ok(
          err instanceof TokenAlreadyUsedError || err instanceof InvalidTokenError,
          "El token anterior debe quedar rechazado"
        );
        return true;
      }
    );

    // 2. Confirmar con el NUEVO token debe ser exitoso
    const confirmResult = await service.confirmEmail(newToken);
    assert.equal(confirmResult.success, true);
    assert.equal(usersStore[0].email_verified, true);
    assert.equal(usersStore[0].metadata?.verification_token, undefined);
  });

  it("Caso de negocio: Rechaza si el usuario ya se encuentra verificado", async () => {
    const mockUser = {
      id: "usr-uuid-6",
      email: "yaverificado@example.com",
      email_verified: true,
      metadata: {
        email_verified: true,
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

  describe("H-AUTH-05: Seguridad y eliminación de tokens en users.metadata", () => {
    it("preserva las demás propiedades de users.metadata al confirmar la cuenta", async () => {
      const plainToken = "safe_token_test_123";
      const tokenHash = hashVerificationToken(plainToken);
      const mockUser = {
        id: "usr-uuid-meta-1",
        email: "metadata_check@vicecity.com",
        email_verified: false,
        metadata: {
          google_id: "google-sub-789",
          custom_pref: "dark_mode",
          role_tag: "VIP",
        },
      };

      const mockToken = {
        id: "tok-meta-1",
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        used: false,
        users: mockUser,
      };

      const { client, usersStore } = createMockPrisma({
        users: [mockUser],
        verificationTokens: [mockToken],
      });
      const service = new EmailConfirmationService(client, new MockEmailSender());

      await service.confirmEmail(plainToken);

      const updated = usersStore[0];
      assert.equal(updated.metadata.google_id, "google-sub-789");
      assert.equal(updated.metadata.custom_pref, "dark_mode");
      assert.equal(updated.metadata.role_tag, "VIP");
      assert.equal(updated.metadata.email_verified, true);
      assert.equal(updated.metadata.verification_token, undefined);
    });

    it("limpia cualquier verification_token legacy presente en metadata al confirmar", async () => {
      const legacyToken = "legacy_token_old_999";
      const tokenHash = hashVerificationToken(legacyToken);
      const mockUser = {
        id: "usr-uuid-legacy-1",
        email: "legacy@vicecity.com",
        email_verified: false,
        metadata: {
          verification_token: {
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            used: false,
          },
          external_id: "ext-123",
        },
      };

      // Sin tabla verification_tokens para probar el mecanismo de compatibilidad defensivo
      const { client, usersStore } = createMockPrisma({ users: [mockUser] });
      delete client.verification_tokens;

      const service = new EmailConfirmationService(client, new MockEmailSender());
      const result = await service.confirmEmail(legacyToken);

      assert.equal(result.success, true);
      const updated = usersStore[0];
      assert.equal(updated.email_verified, true);
      assert.equal(updated.metadata.external_id, "ext-123");
      assert.equal(updated.metadata.verification_token, undefined, "El token legacy debe ser eliminado de metadata");
    });
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
