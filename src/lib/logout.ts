import { signOut } from 'next-auth/react';

/**
 * Función centralizada de cierre de sesión en el cliente (Cookies: F1C).
 * Realiza una purga exhaustiva tanto en el servidor como en el cliente:
 * 1. Invoca POST /api/auth/logout para que el servidor emita Set-Cookie con Max-Age=0.
 * 2. Invoca signOut de NextAuth (POST /api/auth/signout) para invalidar el estado interno.
 * 3. Purga cookies accesibles por document.cookie en el navegador.
 * 4. Redirige a la URL deseada (por defecto /login) recargando la página.
 */
export async function performClientLogout(redirectTo: string = '/login'): Promise<void> {
  // 1. Invocación paralela defensiva a los endpoints de invalidación del servidor
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch (err) {
    console.warn('[LOGOUT] Aviso al llamar a /api/auth/logout:', err);
  }

  try {
    await signOut({ redirect: false, callbackUrl: redirectTo });
  } catch (err) {
    console.warn('[LOGOUT] Aviso al llamar a signOut:', err);
  }

  // 2. Limpieza directa de cookies en el cliente (document.cookie)
  if (typeof document !== 'undefined') {
    const cookieNames = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      'next-auth.pkce.code_verifier',
    ];

    for (const name of cookieNames) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax`;
      if (typeof window !== 'undefined' && window.location.hostname) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; domain=${window.location.hostname}; SameSite=Lax`;
      }
    }
  }

  // 3. Redirección forzada para limpiar el árbol de componentes y memoria
  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}

