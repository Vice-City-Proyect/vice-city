/**
 * @file src/features/auth/utils/role-home.ts
 * @description Pantalla principal de cada rol. Compartido por el formulario de login
 * (redirección tras iniciar sesión) y el middleware (redirección de /login y /register
 * cuando ya hay una sesión activa).
 */

export const DASHBOARD_BY_ROLE: Record<string, string> = {
  ADMIN: '/admin',
  CLIENT: '/cliente',
  TICKET_SELLER: '/empleado/pos',
  QR_VALIDATOR: '/empleado/qr',
};

/**
 * Rutas de autenticación que no deben mostrarse con una sesión activa.
 */
export const GUEST_ONLY_ROUTE = /^\/(?:login|register)\/?$/;
