/**
 * Servicio Desacoplado de Envío de Correos Electrónicos
 * Vice City - Soporte para HU03-B (Confirmación de Correo) y HU04-B (Recuperación de Contraseña)
 *
 * NOTA DE ARQUITECTURA:
 * El proveedor definitivo de correo electrónico (Resend, SendGrid, Amazon SES, etc.)
 * se encuentra pendiente de definición por el equipo de producto e infraestructura.
 * La interfaz IEmailSender desacopla la lógica de negocio de la implementación técnica concreta.
 */

export interface SendVerificationEmailParams {
  to: string;
  token: string;
  verificationUrl: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Contrato (Interface) para el envío de correos electrónicos en Vice City.
 */
export interface IEmailSender {
  sendEmail(options: SendEmailOptions): Promise<void | boolean>;
  sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean>;
}

/**
 * Implementación para entorno de desarrollo que imprime el correo en consola.
 */
export class ConsoleEmailSender implements IEmailSender {
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    console.log("-----------------------------------------");
    console.log(`[EMAIL DEV SENDER]`);
    console.log(`Para: ${options.to}`);
    console.log(`Asunto: ${options.subject}`);
    if (options.text) {
      console.log(`Contenido Texto:\n${options.text}`);
    }
    if (options.html) {
      console.log(`Contenido HTML:\n${options.html}`);
    }
    console.log("-----------------------------------------");
    return true;
  }

  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean> {
    console.log(`[EmailService] Correo de verificación enviado a: ${params.to}`);
    console.log(`[EmailService] Enlace de confirmación: ${params.verificationUrl}`);
    console.log(`[EmailService] Token de seguridad: [ENCRIPTADO EN URL]`);
    return true;
  }
}

/**
 * Proveedor simulado (Mock) para pruebas unitarias sin efectos secundarios de red.
 */
export class MockEmailSender implements IEmailSender {
  public sentEmails: Array<SendEmailOptions | SendVerificationEmailParams> = [];

  async sendEmail(options: SendEmailOptions): Promise<void> {
    this.sentEmails.push({ ...options });
  }

  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean> {
    this.sentEmails.push(params);
    return true;
  }

  getLastEmail(): (SendEmailOptions | SendVerificationEmailParams) | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clear(): void {
    this.sentEmails = [];
  }
}

/**
 * Implementación de producción con Resend (API REST oficial vía fetch).
 * No requiere librerías externas adicionales y utiliza RESEND_API_KEY y EMAIL_FROM.
 */
export class ResendEmailSender implements IEmailSender {
  constructor(
    private readonly apiKey: string = process.env.RESEND_API_KEY || "",
    private readonly from: string = process.env.EMAIL_FROM || "Vice City <onboarding@resend.dev>"
  ) {}

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.warn("[ResendEmailSender] RESEND_API_KEY no está configurada. Correo no enviado.");
      return false;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [options.to],
        subject: options.subject,
        html: options.html || options.text,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ResendEmailSender] Error al enviar correo (${response.status}):`, errorText);
      throw new Error(`Error en el proveedor de correo Resend (${response.status}): ${response.statusText}`);
    }

    return true;
  }

  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1a1a1a; margin-top: 0;">¡Bienvenido a Vice City Sports Complex!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">
          Gracias por registrarte en nuestro sistema. Para activar tu cuenta y poder reservar canchas y servicios, confirma tu correo electrónico:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${params.verificationUrl}" style="background-color: #b0bf3f; color: #1a1a1a; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Confirmar Correo Electrónico
          </a>
        </div>
        <p style="color: #777; font-size: 14px;">
          Este enlace de confirmación expirará en 24 horas por motivos de seguridad.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
          Si no te has registrado en Vice City Sports Complex, puedes ignorar este mensaje de forma segura.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: "Confirma tu cuenta — Vice City Sports Complex",
      html,
      text: `¡Bienvenido a Vice City! Confirma tu cuenta haciendo clic en el siguiente enlace: ${params.verificationUrl}`,
    });
  }
}

/**
 * Fábrica (Factory) que selecciona el emisor de correo según el entorno y las variables configuradas.
 * - Si existe RESEND_API_KEY: utiliza ResendEmailSender para entrega real.
 * - En caso contrario: utiliza ConsoleEmailSender para entorno local/desarrollo sin romper flujos.
 */
export function getEmailSender(): IEmailSender {
  if (process.env.RESEND_API_KEY && process.env.NODE_ENV !== "test") {
    return new ResendEmailSender();
  }
  return new ConsoleEmailSender();
}
