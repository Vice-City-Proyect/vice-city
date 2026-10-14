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
 * Constantes y funciones de validación/normalización para el remitente de correos (EMAIL_FROM).
 */
export const DEFAULT_RESEND_FROM = "Vice City <onboarding@resend.dev>";

const EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAME_AND_EMAIL_REGEX = /^([^<>\r\n]+)\s*<([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>$/;
const ANGLE_BRACKET_ONLY_REGEX = /^<\s*([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)\s*>$/;

/**
 * Valida que una dirección de correo para el remitente cumpla con los formatos
 * aceptados por proveedores como Resend:
 * 1. "email@ejemplo.com"
 * 2. "Nombre <email@ejemplo.com>"
 */
export function isValidFromAddress(from?: string | null): boolean {
  if (!from || typeof from !== "string") return false;
  const trimmed = from.trim();
  if (!trimmed) return false;

  if (EMAIL_REGEX.test(trimmed)) {
    return true;
  }

  const match = trimmed.match(NAME_AND_EMAIL_REGEX);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    return name.length > 0 && EMAIL_REGEX.test(email);
  }

  return false;
}

/**
 * Normaliza el valor de EMAIL_FROM:
 * - Si está vacío o es solo espacios: devuelve el valor predeterminado (fallback).
 * - Si viene sin nombre pero entre corchetes angulares ("<correo@dominio.com>"):
 *   lo normaliza al formato válido con nombre "Vice City <correo@dominio.com>".
 * - Si viene con formato "Nombre <correo@dominio.com>": normaliza espacios.
 * - En cualquier otro caso devuelve el valor recortado para su posterior validación.
 */
export function normalizeFromAddress(
  fromRaw?: string | null,
  fallback: string = DEFAULT_RESEND_FROM
): string {
  if (!fromRaw || typeof fromRaw !== "string" || !fromRaw.trim()) {
    return fallback;
  }

  const trimmed = fromRaw.trim();

  // Caso: solo correo entre corchetes sin nombre e.g. "<onboarding@resend.dev>"
  const angleMatch = trimmed.match(ANGLE_BRACKET_ONLY_REGEX);
  if (angleMatch) {
    const email = angleMatch[1].trim();
    return `Vice City <${email}>`;
  }

  // Caso: Nombre <correo@dominio.com>
  const nameMatch = trimmed.match(NAME_AND_EMAIL_REGEX);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    const email = nameMatch[2].trim();
    if (name.length > 0) {
      return `${name} <${email}>`;
    }
  }

  return trimmed;
}

/**
 * Implementación de producción con Resend (API REST oficial vía fetch).
 * No requiere librerías externas adicionales y utiliza RESEND_API_KEY y EMAIL_FROM.
 */
export class ResendEmailSender implements IEmailSender {
  public readonly apiKey: string;
  public readonly from: string;

  constructor(
    apiKey: string = process.env.RESEND_API_KEY || "",
    from: string = process.env.EMAIL_FROM || DEFAULT_RESEND_FROM
  ) {
    this.apiKey = apiKey;
    this.from = normalizeFromAddress(from, DEFAULT_RESEND_FROM);
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.warn("[ResendEmailSender] RESEND_API_KEY no está configurada. Correo no enviado.");
      return false;
    }

    if (!isValidFromAddress(this.from)) {
      console.error("[ResendEmailSender] Configuración de remitente inválida.");
      throw new Error(
        "Configuración de remitente inválida para Resend: el remitente debe seguir el formato 'email@example.com' o 'Nombre <email@example.com>'."
      );
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
    from: normalizeFromAddress(env.EMAIL_FROM, "Vice City <no-reply@vicecity.club>"),
  };
}

/**
 * Implementación real de envío de correos por SMTP (nodemailer).
 * Las credenciales permanecen siempre en el servidor (variables de entorno).
 */
export class SmtpEmailSender implements IEmailSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
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
 * - Si existe RESEND_API_KEY y no es entorno test: utiliza ResendEmailSender.
 * - Con SMTP configurado: SmtpEmailSender; en su defecto: ConsoleEmailSender.
 */
export function getEmailSender(env: NodeJS.ProcessEnv = process.env): IEmailSender {
  if (env.RESEND_API_KEY && env.NODE_ENV !== "test") {
    return new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  const config = resolveSmtpConfig(env);
  if (config) return new SmtpEmailSender(config);
  return new ConsoleEmailSender();
}
