/**
 * Servicio Desacoplado de Envío de Correos Electrónicos
 * Vice City - Soporte para HU03-B y HU04-B
 *
 * NOTA DE ARQUITECTURA:
 * El proveedor definitivo de correo electrónico (Resend, SendGrid, Amazon SES, etc.)
 * se encuentra pendiente de definición por el equipo de producto e infraestructura.
 * La interfaz IEmailSender desacopla la lógica de negocio de la implementación técnica concreta.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface IEmailSender {
  sendEmail(options: SendEmailOptions): Promise<void>;
}

/**
 * Implementación para entorno de desarrollo que imprime el correo en consola.
 */
export class ConsoleEmailSender implements IEmailSender {
  async sendEmail(options: SendEmailOptions): Promise<void> {
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
  }
}

/**
 * Implementación simulada (Mock) para pruebas unitarias sin efectos secundarios de red.
 */
export class MockEmailSender implements IEmailSender {
  public sentEmails: SendEmailOptions[] = [];

  async sendEmail(options: SendEmailOptions): Promise<void> {
    this.sentEmails.push({ ...options });
  }

  getLastEmail(): SendEmailOptions | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clear(): void {
    this.sentEmails = [];
  }
}

