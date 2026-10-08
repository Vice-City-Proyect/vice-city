/**
 * Módulo de Autenticación (Features: Auth)
 * Vice City - Soporte para HU01-B, HU02-B, HU03-B y HU04-B
 */

// Servicios de Recuperación de Contraseña (HU04-B)
export {
  PasswordResetService,
  passwordResetService,
} from "./services/password-reset.service";
export type { PasswordResetServiceDependencies } from "./services/password-reset.service";

// Abstracción de Correos
export {
  ConsoleEmailSender,
  MockEmailSender,
} from "./services/email.service";
export type { IEmailSender, SendEmailOptions } from "./services/email.service";

// Errores de Dominio para Recuperación de Contraseña (HU04-B)
export {
  PasswordResetTokenExpiredError,
  InvalidPasswordResetTokenError,
  UserNotFoundError,
  WeakPasswordError,
} from "./errors/password-reset.errors";

