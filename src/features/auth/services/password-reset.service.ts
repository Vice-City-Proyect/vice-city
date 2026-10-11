/**
 * Servicio de Lógica de Negocio: Recuperación de Contraseña (HU04-B)
 * Vice City - Features: Auth
 *
 * Cumple con los Criterios de Aceptación:
 * 1. Genera token de un solo uso con expiración y envía el correo.
 * 2. Restablecer con token válido guarda la nueva contraseña encriptada (bcrypt) e invalida el token.
 * 3. Token vencido o ya usado devuelve un error de negocio claro.
 * 4. Caso límite: Una nueva solicitud invalida el token anterior.
 * 5. Arquitectura desacoplada y testeable con ORM Prisma, sin SQL directo.
 */

import bcrypt from "bcryptjs";
import {
  PasswordResetTokenExpiredError,
  InvalidPasswordResetTokenError,
  UserNotFoundError,
  WeakPasswordError,
} from "../errors/password-reset.errors";
import { IEmailSender, ConsoleEmailSender } from "./email.service";
import {
  findUserByEmail,
  createPasswordResetToken,
  resetPassword as repoResetPassword,
  getPasswordResetToken,
} from "@/features/users";

export interface PasswordResetServiceDependencies {
  emailSender?: IEmailSender;
  findUserByEmailFn?: typeof findUserByEmail;
  createTokenFn?: typeof createPasswordResetToken;
  resetPasswordFn?: typeof repoResetPassword;
  getTokenFn?: typeof getPasswordResetToken;
}

export class PasswordResetService {
  private emailSender: IEmailSender;
  private findUserByEmailFn: typeof findUserByEmail;
  private createTokenFn: typeof createPasswordResetToken;
  private resetPasswordFn: typeof repoResetPassword;
  private getTokenFn: typeof getPasswordResetToken;

  constructor(dependencies: PasswordResetServiceDependencies = {}) {
    this.emailSender = dependencies.emailSender ?? new ConsoleEmailSender();
    this.findUserByEmailFn = dependencies.findUserByEmailFn ?? findUserByEmail;
    this.createTokenFn = dependencies.createTokenFn ?? createPasswordResetToken;
    this.resetPasswordFn = dependencies.resetPasswordFn ?? repoResetPassword;
    this.getTokenFn = dependencies.getTokenFn ?? getPasswordResetToken;
  }

  /**
   * Solicita el restablecimiento de contraseña para un correo electrónico.
   * - Verifica existencia del usuario en la base de datos vía ORM.
   * - Invalida tokens previos activos (Caso Límite).
   * - Genera un nuevo token seguro de un solo uso con expiración de 1 hora.
   * - Envía el correo con el enlace de recuperación a través de IEmailSender.
   */
  async requestPasswordReset(
    email: string,
    clientBaseUrl = "https://vicecity.com"
  ): Promise<{ success: boolean; message: string; token?: string }> {
    if (!email || typeof email !== "string" || !email.trim()) {
      throw new UserNotFoundError("El correo electrónico es obligatorio.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmailFn(normalizedEmail);

    if (!user) {
      throw new UserNotFoundError();
    }

    // Generar token con expiración de 1 hora e invalidar previos vía ORM
    const tokenResult = await this.createTokenFn({
      userId: user.id,
      expiresInHours: 1,
    });

    if (!tokenResult) {
      throw new Error("No se pudo generar el token de recuperación de contraseña.");
    }

    const resetLink = `${clientBaseUrl}/auth/reset-password?token=${tokenResult.plainToken}`;

    // Despachar el correo desacoplado
    await this.emailSender.sendEmail({
      to: user.email,
      subject: "Recuperación de Contraseña - Vice City",
      text: `Hola ${user.full_name},\n\nHas solicitado restablecer tu contraseña en Vice City. Haz clic en el siguiente enlace para crear una nueva contraseña:\n${resetLink}\n\nEste enlace expirará en 1 hora y solo puede ser usado una vez. Si no solicitaste este cambio, puedes ignorar este mensaje.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Recuperación de Contraseña</h2>
          <p>Hola <strong>${user.full_name}</strong>,</p>
          <p>Has solicitado restablecer tu contraseña en Vice City.</p>
          <p>Haz clic en el siguiente botón para continuar:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Restablecer mi Contraseña
            </a>
          </p>
          <p style="color: #64748b; font-size: 13px;">Este enlace es de un solo uso y vencerá en 1 hora.</p>
        </div>
      `,
    });

    return {
      success: true,
      message: "Se ha enviado un enlace de recuperación a tu correo electrónico.",
      token: tokenResult.plainToken,
    };
  }

  /**
   * Restablece la contraseña utilizando el token de recuperación.
   * - Valida la fortaleza mínima de la contraseña (mínimo 8 caracteres).
   * - Encripta la nueva contraseña con bcrypt (salt rounds = 10).
   * - Ejecuta la transacción atómica en el ORM: invalida el token y actualiza el password_hash.
   * - Mapea y lanza errores de negocio claros si está vencido o ya fue usado.
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!token || typeof token !== "string" || !token.trim()) {
      throw new InvalidPasswordResetTokenError("El token de recuperación es obligatorio.");
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      throw new WeakPasswordError();
    }

    const cleanToken = token.trim();

    // Encriptar la nueva contraseña con bcrypt antes de persistirla
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Ejecutar consumo atómico y persistencia en ORM
    const result = await this.resetPasswordFn(cleanToken, newPasswordHash);

    if (!result.success) {
      switch (result.reason) {
        case "EXPIRED":
          throw new PasswordResetTokenExpiredError();
        case "ALREADY_USED":
          throw new InvalidPasswordResetTokenError("El token de recuperación ya fue utilizado.");
        case "NOT_FOUND":
        case "INVALID_INPUT":
        default:
          throw new InvalidPasswordResetTokenError("El token de recuperación no es válido.");
      }
    }

    return {
      success: true,
      message: "Tu contraseña ha sido restablecida exitosamente.",
    };
  }

  /**
   * Consulta y valida el estado de un token sin consumirlo (útil para vistas previas en UI).
   */
  async validateTokenStatus(
    token: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    if (!token || typeof token !== "string" || !token.trim()) {
      return { isValid: false, reason: "INVALID_TOKEN" };
    }

    const record = await this.getTokenFn(token.trim());

    if (!record) {
      return { isValid: false, reason: "NOT_FOUND" };
    }

    if (record.used) {
      return { isValid: false, reason: "ALREADY_USED" };
    }

    if (record.expires_at <= new Date()) {
      return { isValid: false, reason: "EXPIRED" };
    }

    return { isValid: true };
  }
}

// Instancia singleton por defecto para el proyecto
export const passwordResetService = new PasswordResetService();

