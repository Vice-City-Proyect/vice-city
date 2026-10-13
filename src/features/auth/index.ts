/**
 * Módulo de Autenticación (Features: Auth)
 * Vice City - Soporte para HU01 a HU06 y HU08 (Permisos por Rol)
 */

// Exportaciones base de autenticación (HU01, HU02, HU03)
export * from "./types";
export * from "./errors/auth.errors";
export * from "./schemas/register.schema";
export * from "./schemas/login.schema";
export * from "./services/register.service";
export {
  ConsoleEmailSender,
  MockEmailSender,
  ResendEmailSender,
  SmtpEmailSender,
  getEmailSender,
} from "./services/email.service";
export type {
  IEmailSender,
  SendEmailOptions,
  SendVerificationEmailParams,
} from "./services/email.service";
export * from "./schemas/confirm-email.schema";
export * from "./schemas/resend-confirmation.schema";
export * from "./services/email-confirmation.service";
export {
  TokenExpiredError,
  InvalidTokenError,
  UserAlreadyVerifiedError,
  TokenAlreadyUsedError,
  EmailAlreadyConfirmedError,
} from "./errors/email-confirmation.errors";

// Servicios de Recuperación de Contraseña (HU04-B)
export {
  PasswordResetService,
  passwordResetService,
} from "./services/password-reset.service";
export type { PasswordResetServiceDependencies } from "./services/password-reset.service";

// Errores de Dominio para Recuperación de Contraseña (HU04-B)
export {
  PasswordResetTokenExpiredError,
  InvalidPasswordResetTokenError,
  UserNotFoundError,
  WeakPasswordError,
} from "./errors/password-reset.errors";

// Esquemas de Validación (HU04-B)
export {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "./schemas/forgot-password.schema";
export {
  resetPasswordSchema,
  validateResetTokenSchema,
  type ResetPasswordInput,
  type ValidateResetTokenInput,
} from "./schemas/reset-password.schema";

// Tipos de Retorno (HU04-B)
export type {
  RequestPasswordResetResult,
  ResetPasswordResult,
  ValidateTokenStatusResult,
} from "./types/password-reset.types";

// Servicio de Inicio de Sesión con Google (HU05-B)
export {
  GoogleAuthService,
  googleAuthService,
} from "./services/google-auth.service";

export type {
  GoogleProfile,
  GoogleAuthUser,
  GoogleAuthResult,
  GoogleAuthServiceDependencies,
} from "./services/google-auth.service";

// Errores de Dominio para Inicio de Sesión con Google (HU05-B)
export {
  GoogleAuthError,
  GoogleEmailNotProvidedError,
  UserInactiveError,
} from "./errors/google-auth.errors";

// Esquemas de Validación Zod (HU05-B API)
export {
  googleProfileSchema,
  type GoogleProfileInput,
} from "./schemas/google-auth.schema";

// Utilidades y Manejador de Errores OAuth (HU05-B API)
export {
  GOOGLE_AUTH_ERROR_MESSAGES,
  resolveGoogleAuthErrorMessage,
} from "./utils/google-error-handler";

// Servicio y Utilidades de Cierre de Sesión (HU06-B LN & API)
export {
  LogoutService,
  logoutService,
  AUTH_COOKIE_NAMES,
  type LogoutResult,
  type InvalidateSessionOptions,
  type ExpiredCookieDescriptor,
} from "./services/logout.service";

// Matriz de Permisos por Rol y Protección de Rutas (HU08-B LN & API)
export {
  SRS_ROLES,
  normalizeRole,
  isPublicRoute,
  isProtectedRoute,
  getAllowedRolesForRoute,
  isRouteAllowed,
  ROUTE_PERMISSION_RULES,
  type SRSRole,
  type RoutePermissionRule,
} from "./permissions/route-permissions";
