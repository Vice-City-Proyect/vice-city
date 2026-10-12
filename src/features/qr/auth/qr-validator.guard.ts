/**
 * Guard de acceso para el Escáner QR (HU13 - VCP-57)
 * Vice City - Feature: QR Scanner
 *
 * Identifica al validador a partir de la sesión JWT firmada de NextAuth.
 * No se aceptan cabeceras como x-user-role o x-user-id: cualquiera podría falsificarlas
 * y registrar ingresos haciéndose pasar por un validador.
 */

import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth";

export type QRValidatorCheck =
  | { authorized: true; userId: string; roleName: "QR_VALIDATOR" }
  | { authorized: false; status: 401 | 403; error: string; message: string };

/**
 * Verifica que la petición traiga una sesión válida con rol QR_VALIDATOR.
 * - Sin sesión, o token vencido/manipulado -> 401.
 * - Sesión de cualquier otro rol (incluido ADMIN) -> 403.
 *
 * @param token Permite inyectar el token en pruebas; en producción se lee de la petición.
 */
export async function requireQrValidator(
  request: NextRequest,
  token?: { id?: unknown; sub?: unknown; role?: unknown } | null
): Promise<QRValidatorCheck> {
  let session = token;

  if (session === undefined) {
    try {
      session = await getToken({ req: request, secret: getAuthSecret() });
    } catch {
      // Token corrupto o manipulado: se trata como sin sesión
      session = null;
    }
  }

  if (!session) {
    return {
      authorized: false,
      status: 401,
      error: "UNAUTHORIZED",
      message: "Se requiere una sesión activa para validar códigos QR",
    };
  }

  const role = typeof session.role === "string" ? session.role.trim().toUpperCase() : "";
  const userId =
    (typeof session.id === "string" && session.id) ||
    (typeof session.sub === "string" && session.sub) ||
    "";

  if (role !== "QR_VALIDATOR" || !userId) {
    return {
      authorized: false,
      status: 403,
      error: "FORBIDDEN_ROLE",
      message: `El rol '${role || "SIN_ROL"}' no tiene permisos para validar códigos QR. Se requiere rol QR_VALIDATOR.`,
    };
  }

  return { authorized: true, userId, roleName: "QR_VALIDATOR" };
}
