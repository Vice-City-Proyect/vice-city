import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RESEND_FROM,
  isValidFromAddress,
  normalizeFromAddress,
  ResendEmailSender,
  getEmailSender,
} from "../../src/features/auth/services/email.service.ts";

describe("HU03-B / Resend: Configuración y normalización del remitente (EMAIL_FROM)", () => {
  describe("Función normalizeFromAddress", () => {
    it("Retorna DEFAULT_RESEND_FROM si el valor es undefined", () => {
      const result = normalizeFromAddress(undefined);
      assert.equal(result, DEFAULT_RESEND_FROM);
      assert.equal(result, "Vice City <onboarding@resend.dev>");
    });

    it("Retorna DEFAULT_RESEND_FROM si el valor es null", () => {
      const result = normalizeFromAddress(null);
      assert.equal(result, DEFAULT_RESEND_FROM);
    });

    it("Retorna DEFAULT_RESEND_FROM si el valor es una cadena vacía", () => {
      const result = normalizeFromAddress("");
      assert.equal(result, DEFAULT_RESEND_FROM);
    });

    it("Retorna DEFAULT_RESEND_FROM si el valor contiene solo espacios en blanco", () => {
      const result = normalizeFromAddress("    ");
      assert.equal(result, DEFAULT_RESEND_FROM);
    });

    it("Normaliza el caso de error raíz: solo corchetes angulares sin nombre (<onboarding@resend.dev>)", () => {
      const result = normalizeFromAddress("<onboarding@resend.dev>");
      assert.equal(result, "Vice City <onboarding@resend.dev>");
    });

    it("Normaliza cualquier correo entre corchetes angulares sin nombre a 'Vice City <correo>'", () => {
      const result = normalizeFromAddress("<contacto@vicecity.club>");
      assert.equal(result, "Vice City <contacto@vicecity.club>");
    });

    it("Conserva y recorta un correo plano válido", () => {
      const result = normalizeFromAddress("  onboarding@resend.dev  ");
      assert.equal(result, "onboarding@resend.dev");
    });

    it("Conserva y normaliza el espaciado en formato 'Nombre <correo>'", () => {
      const result = normalizeFromAddress("  Vice City Sports   <onboarding@resend.dev>  ");
      assert.equal(result, "Vice City Sports <onboarding@resend.dev>");
    });

    it("Respeta un fallback personalizado si se proporciona", () => {
      const customFallback = "Vice City <no-reply@vicecity.club>";
      const result = normalizeFromAddress("", customFallback);
      assert.equal(result, customFallback);
    });
  });

  describe("Función isValidFromAddress", () => {
    it("Valida exitosamente el formato 'Nombre <correo@dominio.com>'", () => {
      assert.equal(isValidFromAddress("Vice City <onboarding@resend.dev>"), true);
      assert.equal(isValidFromAddress("Vice City Complex <reservas@vicecity.club>"), true);
      assert.equal(isValidFromAddress("Soporte <soporte.cliente+test@resend.dev>"), true);
    });

    it("Valida exitosamente el formato de correo plano 'correo@dominio.com'", () => {
      assert.equal(isValidFromAddress("onboarding@resend.dev"), true);
      assert.equal(isValidFromAddress("reservas@vicecity.club"), true);
    });

    it("Rechaza el formato inválido de solo corchetes sin nombre '<onboarding@resend.dev>'", () => {
      assert.equal(isValidFromAddress("<onboarding@resend.dev>"), false);
    });

    it("Rechaza valores nulos, undefined o vacíos", () => {
      assert.equal(isValidFromAddress(undefined), false);
      assert.equal(isValidFromAddress(null), false);
      assert.equal(isValidFromAddress(""), false);
      assert.equal(isValidFromAddress("   "), false);
    });

    it("Rechaza cadenas que no son correos electrónicos válidos", () => {
      assert.equal(isValidFromAddress("correo-sin-arroba"), false);
      assert.equal(isValidFromAddress("Vice City <correo-sin-arroba>"), false);
      assert.equal(isValidFromAddress("Vice City <>"), false);
      assert.equal(isValidFromAddress("<>"), false);
    });
  });

  describe("Clase ResendEmailSender", () => {
    it("Inicializa con DEFAULT_RESEND_FROM si no se provee argumento 'from'", () => {
      const sender = new ResendEmailSender("re_test_key");
      assert.equal(sender.from, DEFAULT_RESEND_FROM);
    });

    it("Normaliza el remitente en el constructor si viene con solo corchetes '<onboarding@resend.dev>'", () => {
      const sender = new ResendEmailSender("re_test_key", "<onboarding@resend.dev>");
      assert.equal(sender.from, "Vice City <onboarding@resend.dev>");
    });

    it("Normaliza el remitente si viene como cadena vacía o espacios", () => {
      const sender = new ResendEmailSender("re_test_key", "   ");
      assert.equal(sender.from, DEFAULT_RESEND_FROM);
    });

    it("Mantiene un remitente con formato válido personalizado", () => {
      const sender = new ResendEmailSender("re_test_key", "Vice City <notificaciones@vicecity.club>");
      assert.equal(sender.from, "Vice City <notificaciones@vicecity.club>");
    });

    it("No envía correo y advierte si falta la API Key", async () => {
      const sender = new ResendEmailSender("");
      const result = await sender.sendEmail({
        to: "usuario@example.com",
        subject: "Prueba",
        text: "Hola",
      });
      assert.equal(result, false);
    });

    it("Lanza error seguro e interno si el remitente tiene formato inválido antes de llamar a Resend", async () => {
      const sender = new ResendEmailSender("re_test_key", "remitente-completamente-invalido");

      await assert.rejects(
        async () => {
          await sender.sendEmail({
            to: "usuario@example.com",
            subject: "Prueba",
            text: "Hola",
          });
        },
        (err) => {
          assert.ok(err instanceof Error);
          assert.match(err.message, /Configuración de remitente inválida para Resend/);
          // Asegura que no se filtren secretos ni API keys en el mensaje
          assert.equal(err.message.includes("re_test_key"), false);
          return true;
        }
      );
    });

    it("Construye la petición HTTP a la API de Resend con el formato correcto de 'from'", async () => {
      const originalFetch = global.fetch;
      let interceptedUrl = null;
      let interceptedOptions = null;

      global.fetch = async (url, options) => {
        interceptedUrl = url;
        interceptedOptions = options;
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "email_123" }),
        };
      };

      try {
        const sender = new ResendEmailSender("re_secret_12345", "<onboarding@resend.dev>");
        const success = await sender.sendEmail({
          to: "cliente@example.com",
          subject: "Bienvenido a Vice City",
          html: "<p>Bienvenido</p>",
          text: "Bienvenido",
        });

        assert.equal(success, true);
        assert.equal(interceptedUrl, "https://api.resend.com/emails");
        assert.equal(interceptedOptions.method, "POST");
        assert.equal(interceptedOptions.headers.Authorization, "Bearer re_secret_12345");
        assert.equal(interceptedOptions.headers["Content-Type"], "application/json");

        const body = JSON.parse(interceptedOptions.body);
        assert.equal(body.from, "Vice City <onboarding@resend.dev>");
        assert.deepEqual(body.to, ["cliente@example.com"]);
        assert.equal(body.subject, "Bienvenido a Vice City");
        assert.equal(body.html, "<p>Bienvenido</p>");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("Propaga error descriptivo si Resend responde con error HTTP (ej. 422)", async () => {
      const originalFetch = global.fetch;

      global.fetch = async () => ({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        text: async () => JSON.stringify({ message: "Invalid from field", name: "validation_error" }),
      });

      try {
        const sender = new ResendEmailSender("re_secret_12345", "Vice City <onboarding@resend.dev>");
        await assert.rejects(
          async () => {
            await sender.sendEmail({
              to: "cliente@example.com",
              subject: "Test",
              text: "Prueba",
            });
          },
          (err) => {
            assert.ok(err instanceof Error);
            assert.match(err.message, /Error en el proveedor de correo Resend \(422\)/);
            // No expone la clave secreta
            assert.equal(err.message.includes("re_secret_12345"), false);
            return true;
          }
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("sendVerificationEmail despacha el correo con la plantilla HTML correspondiente", async () => {
      const originalFetch = global.fetch;
      let sentBody = null;

      global.fetch = async (_url, options) => {
        sentBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "msg_verification_123" }),
        };
      };

      try {
        const sender = new ResendEmailSender("re_test_key");
        const res = await sender.sendVerificationEmail({
          to: "verificar@example.com",
          token: "token-seguro-123",
          verificationUrl: "https://vicecity.club/verify-email?token=token-seguro-123",
        });

        assert.equal(res, true);
        assert.ok(sentBody);
        assert.equal(sentBody.from, DEFAULT_RESEND_FROM);
        assert.deepEqual(sentBody.to, ["verificar@example.com"]);
        assert.ok(sentBody.subject.includes("Confirma"));
        assert.ok(sentBody.html.includes("https://vicecity.club/verify-email?token=token-seguro-123"));
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("Función getEmailSender", () => {
    it("Retorna instancia de ResendEmailSender cuando RESEND_API_KEY está configurada en entorno no-test", () => {
      const fakeEnv = {
        RESEND_API_KEY: "re_real_key_123",
        EMAIL_FROM: "<onboarding@resend.dev>",
        NODE_ENV: "production",
      };

      const sender = getEmailSender(fakeEnv);
      assert.ok(sender instanceof ResendEmailSender);
      assert.equal(sender.from, "Vice City <onboarding@resend.dev>");
    });
  });
});

