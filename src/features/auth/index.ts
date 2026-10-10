/**
 * Módulo de Autenticación (Features: Auth)
 * Vice City - Soporte para HU05-B (Inicio de Sesión con Google)
 */

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
