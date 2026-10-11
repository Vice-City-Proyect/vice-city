/**
 * Matriz de Permisos por Rol y Protección de Rutas (HU08-B LN)
 * Vice City - Features: Auth / Permissions
 *
 * Basado en la sección 8 del SRS de Vice City:
 * - ADMIN: Administración completa del complejo, servicios, empleados y reportes.
 * - CLIENT: Cliente final (reservas, tickets propios, pagos).
 * - TICKET_SELLER: Venta en taquilla presencial (/employee/pos).
 * - QR_VALIDATOR: Validación de accesos y escáner QR (/employee/qr-scanner, /employee/scan).
 *
 * Esta matriz vive en el código y no en la base de datos (sin subtarea ORM).
 */

export const SRS_ROLES = [
  "ADMIN",
  "CLIENT",
  "TICKET_SELLER",
  "QR_VALIDATOR",
] as const;

export type SRSRole = (typeof SRS_ROLES)[number];

/**
 * Normaliza nombres de roles, resolviendo alias legacy ("CUSTOMER" -> "CLIENT").
 */
export function normalizeRole(role?: string | null): SRSRole | null {
  if (!role || typeof role !== "string" || !role.trim()) {
    return null;
  }
  const upper = role.trim().toUpperCase();
  if (upper === "CUSTOMER") return "CLIENT";
  if (SRS_ROLES.includes(upper as SRSRole)) {
    return upper as SRSRole;
  }
  return null;
}

/**
 * Prefijos y rutas públicas que no requieren autenticación.
 */
export const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/, // Página de inicio
  /^\/login(?:\/.*)?$/,
  /^\/register(?:\/.*)?$/,
  /^\/forgot-password(?:\/.*)?$/,
  /^\/reset-password(?:\/.*)?$/,
  /^\/unauthorized(?:\/.*)?$/,
  /^\/403(?:\/.*)?$/,
  /^\/api\/auth\/(?:login|register|logout|forgot-password|reset-password|google|session|csrf|providers|signin|callback|signout)(?:\/.*)?$/,
];

/**
 * Regla de protección de rutas con sus roles autorizados.
 * Las reglas se evalúan en orden de especificidad (más específica a más general).
 */
export interface RoutePermissionRule {
  pattern: RegExp;
  allowedRoles: readonly SRSRole[];
  description: string;
}

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  // 1. Rutas Administrativas (solo ADMIN)
  {
    pattern: /^\/admin(?:\/.*)?$/,
    allowedRoles: ["ADMIN"],
    description: "Panel y módulos administrativos",
  },
  {
    pattern: /^\/api\/admin(?:\/.*)?$/,
    allowedRoles: ["ADMIN"],
    description: "Endpoints API administrativos",
  },

  // 2. Taquilla / POS (TICKET_SELLER y ADMIN)
  {
    pattern: /^\/employee\/pos(?:\/.*)?$/,
    allowedRoles: ["TICKET_SELLER", "ADMIN"],
    description: "Punto de venta y taquilla presencial",
  },
  {
    pattern: /^\/api\/employee\/pos(?:\/.*)?$/,
    allowedRoles: ["TICKET_SELLER", "ADMIN"],
    description: "Endpoints API de punto de venta",
  },

  // 3. Escáner y Validación QR (QR_VALIDATOR y ADMIN)
  {
    pattern: /^\/employee\/(?:qr-scanner|scanner|scan|validator)(?:\/.*)?$/,
    allowedRoles: ["QR_VALIDATOR", "ADMIN"],
    description: "Validación de tickets y escáner QR en torniquetes",
  },
  {
    pattern: /^\/api\/employee\/(?:qr-scanner|scanner|scan|validator)(?:\/.*)?$/,
    allowedRoles: ["QR_VALIDATOR", "ADMIN"],
    description: "Endpoints API de escáner y validación de accesos",
  },

  // 4. Portal y rutas generales de empleados (TICKET_SELLER, QR_VALIDATOR y ADMIN)
  {
    pattern: /^\/employee(?:\/.*)?$/,
    allowedRoles: ["TICKET_SELLER", "QR_VALIDATOR", "ADMIN"],
    description: "Portal general de empleados",
  },
  {
    pattern: /^\/api\/employee(?:\/.*)?$/,
    allowedRoles: ["TICKET_SELLER", "QR_VALIDATOR", "ADMIN"],
    description: "Endpoints API para empleados",
  },

  // 5. Portal y servicios de clientes (CLIENT y ADMIN)
  {
    pattern: /^\/client(?:\/.*)?$/,
    allowedRoles: ["CLIENT", "ADMIN"],
    description: "Dashboard de cliente, historial de reservas y tickets",
  },
  {
    pattern: /^\/api\/client(?:\/.*)?$/,
    allowedRoles: ["CLIENT", "ADMIN"],
    description: "Endpoints API de cliente",
  },
];

/**
 * Determina si una ruta es completamente pública.
 */
export function isPublicRoute(pathname: string): boolean {
  if (!pathname || pathname === "/") return true;
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(cleanPath));
}

/**
 * Determina si una ruta requiere autenticación y control de permisos.
 */
export function isProtectedRoute(pathname: string): boolean {
  if (isPublicRoute(pathname)) return false;
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return ROUTE_PERMISSION_RULES.some((rule) => rule.pattern.test(cleanPath));
}

/**
 * Obtiene la lista de roles autorizados para una ruta específica.
 *
 * Criterio límite: Las rutas anidadas y con parámetros (ej. /admin/users/123/edit)
 * respetan la regla de su ruta padre (/admin).
 */
export function getAllowedRolesForRoute(pathname: string): readonly SRSRole[] | null {
  const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const matchedRule = ROUTE_PERMISSION_RULES.find((rule) => rule.pattern.test(cleanPath));
  return matchedRule ? matchedRule.allowedRoles : null;
}

/**
 * Función central de negocio (HU08-B LN):
 * Dados un rol y una ruta, determina si el acceso está permitido.
 *
 * Criterios de Aceptación:
 * 1. La matriz coincide estrictamente con los permisos del SRS.
 * 2. Caso de error: Un rol desconocido o vacío siempre es denegado.
 * 3. Caso límite: Rutas anidadas y con parámetros respetan el permiso de su ruta padre.
 * 4. Valida acceso para los cuatro roles oficiales.
 *
 * @param role Rol del usuario (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR o nulo)
 * @param pathname Ruta solicitada (ej. "/admin/users", "/employee/pos", "/client/tickets")
 * @returns boolean indicando si el acceso está permitido
 */
export function isRouteAllowed(role: string | null | undefined, pathname: string): boolean {
  // 1. Si la ruta es pública, cualquier usuario (autenticado o no) puede acceder
  if (isPublicRoute(pathname)) {
    return true;
  }

  // 2. Criterio de error: Si el rol es nulo, indefinido, vacío o no reconocido en el SRS, se deniega siempre
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  // 3. Buscar la regla que aplica a la ruta (soporta anidamiento y parámetros de ruta)
  const allowedRoles = getAllowedRolesForRoute(pathname);
  if (!allowedRoles) {
    // Si es una ruta no registrada en la matriz ni pública, por seguridad se deniega
    return false;
  }

  // 4. Verificar si el rol normalizado está dentro de los roles autorizados
  return allowedRoles.includes(normalizedRole);
}

