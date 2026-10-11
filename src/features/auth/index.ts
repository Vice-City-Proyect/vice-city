/**
 * Módulo de Autenticación (Features: Auth)
 * Vice City - Soporte para HU01, HU02, HU03, HU05 (Google Auth) y HU06 (Cierre de Sesión)
 */

// Exportaciones base de autenticación
export * from "./types";
export * from "./errors/auth.errors";
export * from "./schemas/register.schema";
export * from "./schemas/login.schema";
export * from "./services/register.service";
export * from "./services/email.service";
export * from "./services/email-confirmation.service";
export * from "./errors/email-confirmation.errors";

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
