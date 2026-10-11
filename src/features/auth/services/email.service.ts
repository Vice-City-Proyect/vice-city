export interface SendVerificationEmailParams {
  to: string;
  token: string;
  verificationUrl: string;
}

/**
 * Contrato (Interface) para el envío de correos electrónicos de confirmación.
 * Permite desacoplar la lógica de negocio del proveedor de correo final
 * (Resend, Nodemailer, SendGrid, AWS SES, etc.).
 */
export interface IEmailSender {
  sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean>;
}

/**
 * Proveedor por defecto para desarrollo que registra los envíos en consola.
 */
export class ConsoleEmailSender implements IEmailSender {
  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean> {
    console.log(`[EmailService] Correo de verificación enviado a: ${params.to}`);
    console.log(`[EmailService] Enlace de confirmación: ${params.verificationUrl}`);
    console.log(`[EmailService] Token de seguridad: [ENCRIPTADO EN URL]`);
    return true;
  }
}

/**
 * Proveedor simulado (Mock) para pruebas unitarias.
 */
export class MockEmailSender implements IEmailSender {
  public sentEmails: SendVerificationEmailParams[] = [];

  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean> {
    this.sentEmails.push(params);
    return true;
  }

  clear(): void {
    this.sentEmails = [];
  }
}
