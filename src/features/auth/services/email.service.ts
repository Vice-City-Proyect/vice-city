/**
 * Servicio Desacoplado de Envío de Correos Electrónicos
 * Vice City - Soporte para HU03-B (Confirmación de Correo) y HU04-B (Recuperación de Contraseña)
 *
 * NOTA DE ARQUITECTURA:
 * La interfaz IEmailSender desacopla la lógica de negocio de la implementación técnica concreta.
 * Proveedor implementado: SMTP genérico vía nodemailer (compatible con Gmail, Mailtrap,
 * Resend SMTP, SendGrid SMTP, Amazon SES SMTP, etc.). Si no hay SMTP configurado en el
 * entorno, se usa ConsoleEmailSender (modo desarrollo).
 */

import nodemailer from "nodemailer";
import { verificationEmailHtml } from "../email/templates";

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

// ---------------------------------------------------------------------------
// Proveedor SMTP real (nodemailer)
// ---------------------------------------------------------------------------

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

/**
 * Resuelve la configuración SMTP desde variables de entorno.
 * Devuelve null si no hay un host configurado (se usará el sender de consola).
 */
export function resolveSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(env.SMTP_PORT || 587);
  const secure = env.SMTP_SECURE === "true" || port === 465;
  const user = env.SMTP_USER?.trim() || undefined;
  const pass = env.SMTP_PASS || undefined;

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: env.EMAIL_FROM?.trim() || "Vice City <no-reply@vicecity.club>",
  };
}

/**
 * Implementación real de envío de correos por SMTP (nodemailer).
 * Las credenciales permanecen siempre en el servidor (variables de entorno).
 */
export class SmtpEmailSender implements IEmailSender {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  }

  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean> {
    return this.sendEmail({
      to: params.to,
      subject: "Confirma tu correo — Vice City",
      html: verificationEmailHtml(params.to.split("@")[0], params.verificationUrl),
      text: `Confirma tu correo de Vice City: ${params.verificationUrl}`,
    });
  }
}

/**
 * Devuelve el proveedor de correo adecuado según la configuración del entorno.
 * Con SMTP configurado → SmtpEmailSender; en su defecto → ConsoleEmailSender.
 */
export function getEmailSender(env: NodeJS.ProcessEnv = process.env): IEmailSender {
  const config = resolveSmtpConfig(env);
  if (config) return new SmtpEmailSender(config);
  return new ConsoleEmailSender();
}
