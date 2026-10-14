/**
 * @file src/features/auth/utils/url-sanitizer.ts
 * @description Utilidades de validación y sanitización de URLs de retorno (callbackUrl) y extracción segura de rol.
 * Previene vulnerabilidades de Redirección Abierta (CWE-601 / Open Redirect).
 */

/**
 * Sanitiza y valida que una URL de redirección sea estrictamente interna.
 *
 * Reglas de seguridad:
 * - Rechaza valores nulos, vacíos o que no sean cadenas de texto.
 * - Rechaza URLs a la raíz ('/') o a la pantalla de login ('/login').
 * - Rechaza URLs relativas al protocolo (ej. '//evil.example').
 * - Rechaza URLs absolutas con esquema (ej. 'https://evil.example', 'javascript:...').
 * - Rechaza caracteres de escape o barras invertidas tras la barra inicial (ej. '/\\evil.example').
 * - Requiere que la ruta comience con '/' seguido de un carácter de ruta válido.
 *
 * @param url Cadena candidata a URL de retorno.
 * @returns La URL interna sanitizada si es válida; de lo contrario, `null`.
 */
export function sanitizeInternalCallbackUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Disallow root, login, protocol-relative (//), and absolute URLs with schemes
  if (
    trimmed === '' ||
    trimmed === '/' ||
    trimmed === '/login' ||
    trimmed.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
  ) {
    return null;
  }

  // Must strictly start with a single slash followed by a path character
  if (!trimmed.startsWith('/') || trimmed.startsWith('/\\')) {
    return null;
  }

  return trimmed;
}

/**
 * Extrae el rol de usuario de un objeto de sesión de forma segura y tipada,
 * sin utilizar conversiones inseguras a 'any'.
 *
 * Soporta las variantes estándar de NextAuth (`session.user.role`)
 * y la estructura encapsulada de respuestas de API (`session.data.role`).
 *
 * @param session Objeto de sesión desconocido devuelto por getSession() o /api/auth/session.
 * @returns El nombre del rol como string si existe; de lo contrario, `undefined`.
 */
export function extractRoleFromSession(session: unknown): string | undefined {
  if (!session || typeof session !== 'object') {
    return undefined;
  }

  const s = session as Record<string, unknown>;

  // Caso 1: session.user.role (NextAuth estándar con extensión de sesión)
  if (s.user && typeof s.user === 'object') {
    const user = s.user as Record<string, unknown>;
    if (typeof user.role === 'string' && user.role.trim() !== '') {
      return user.role.trim();
    }
  }

  // Caso 2: session.data.role (Estructura de respuesta de /api/auth/session)
  if (s.data && typeof s.data === 'object') {
    const data = s.data as Record<string, unknown>;
    if (typeof data.role === 'string' && data.role.trim() !== '') {
      return data.role.trim();
    }
  }

  return undefined;
}
