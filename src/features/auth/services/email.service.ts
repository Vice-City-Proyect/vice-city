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
  public sentEmails: any[] = [];

  async sendEmail(options: SendEmailOptions): Promise<void> {
    this.sentEmails.push({ ...options });
  }

  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean> {
    this.sentEmails.push(params);
    return true;
  }

  getLastEmail(): any | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clear(): void {
    this.sentEmails = [];
  }
}
