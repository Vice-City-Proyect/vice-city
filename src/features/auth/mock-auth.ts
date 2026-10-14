/**
 * Cabeceras de autenticación simulada (`x-user-role`, `x-user-id`,
 * `x-mock-role`).
 *
 * Son falsificables y por eso NUNCA deben habilitar privilegios en producción.
 * Se controlan con `ENABLE_MOCK_AUTH_HEADERS=true` (deshabilitado por defecto)
 * en lugar de depender de `NODE_ENV`: así un despliegue mal configurado no
 * habilita por accidente privilegios de ADMIN.
 */
export function allowsMockAuthHeaders(): boolean {
  return process.env.ENABLE_MOCK_AUTH_HEADERS === "true";
}