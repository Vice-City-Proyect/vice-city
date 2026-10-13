/**
 * Utilidades de sesión para Route Handlers.
 * Vice City - Features: Auth
 *
 * En Next.js 16 el segundo argumento del handler SIEMPRE es `{ params }`.
 * Las dependencias de prueba se exponen en propiedades con nombre
 * (`sessionOverride`) y NUNCA se interpreta el contexto completo como sesión.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export interface SessionUser {
  id: string;
  role: string;
  email?: string;
}

export interface SessionAwareRouteContext {
  params?: unknown;
  sessionOverride?: { user?: SessionUser } | SessionUser | null;
}

export function readSessionOverride(
  override: SessionAwareRouteContext["sessionOverride"]
): SessionUser | null {
  if (!override) return null;
  const wrapped = override as SessionUser | { user?: SessionUser };
  const session = "user" in wrapped && wrapped.user ? wrapped.user : wrapped;
  if (session && typeof session === "object" && "id" in session && "role" in session) {
    return session as SessionUser;
  }
  return null;
}

/**
 * Resuelve la sesión desde el override (pruebas) o desde NextAuth.
 */
export async function resolveSession(
  context?: SessionAwareRouteContext
): Promise<SessionUser | null> {
  const override = readSessionOverride(context?.sessionOverride);
  if (override) return override;

  try {
    const session = await getServerSession(authOptions);
    return (session?.user as SessionUser) ?? null;
  } catch {
    return null;
  }
}

/** Verifica si el rol del usuario está dentro de los roles permitidos. */
export function hasAnyRole(user: SessionUser | null, allowedRoles: string[]): boolean {
  if (!user?.role) return false;
  const role = user.role.toUpperCase();
  return allowedRoles.map((r) => r.toUpperCase()).includes(role);
}