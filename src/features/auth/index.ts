/**
 * Módulo de Autenticación (Features: Auth)
 * Vice City - Soporte para HU05-B (Google Auth), HU06-B (Cierre de Sesión) y HU08-B (Permisos por Rol)
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
