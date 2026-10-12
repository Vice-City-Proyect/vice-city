import { PrismaClient } from "@prisma/client";

/**
 * Diagnóstico seguro de configuración para Vice City.
 *
 * - NO imprime valores secretos (solo nombres, longitud y estructura de URLs).
 * - La comprobación de base de datos es de SOLO LECTURA (SELECT 1).
 * - No ejecuta migraciones ni modifica datos.
 *
 * Uso: npm run diagnose
 */

const REQUIRED_ALWAYS = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
const OPTIONAL = ["DIRECT_URL", "NEXT_PUBLIC_APP_URL"];
const GOOGLE = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];

function presence(key) {
  const value = process.env[key];
  return value && value.trim() ? `definida (len=${value.trim().length})` : "AUSENTE / vacía";
}

function describeUrl(key) {
  const raw = process.env[key];
  if (!raw || !raw.trim()) return "(no definida)";
  try {
    const url = new URL(raw.trim());
    return [
      `scheme=${url.protocol.replace(":", "")}`,
      `user=${url.username || "(sin usuario)"}`,
      `host=${url.hostname}`,
      `port=${url.port || "(default)"}`,
      `db=${url.pathname.replace(/^\//, "").split("?")[0] || "(sin db)"}`,
      `password=${url.password ? "definida" : "AUSENTE"}`,
      `pgbouncer=${/pgbouncer=true/i.test(url.search) ? "sí" : "no"}`,
      `pooler_supabase=${/pooler\.supabase/i.test(url.hostname) ? "sí" : "no"}`,
    ].join(" | ");
  } catch {
    return "FORMATO INVÁLIDO (no es una URL válida)";
  }
}

console.log("=== Diagnóstico de configuración Vice City (sin exponer secretos) ===\n");

console.log("Presencia de variables obligatorias:");
for (const key of REQUIRED_ALWAYS) console.log(`  ${key}: ${presence(key)}`);

console.log("\nPresencia de variables opcionales:");
for (const key of OPTIONAL) console.log(`  ${key}: ${presence(key)}`);

console.log("\nPresencia de variables de Google OAuth (si faltan, Google se deshabilita):");
for (const key of GOOGLE) console.log(`  ${key}: ${presence(key)}`);

console.log("\nEstructura de las URLs de base de datos (contraseña oculta):");
for (const key of ["DATABASE_URL", "DIRECT_URL"]) console.log(`  ${key}: ${describeUrl(key)}`);

console.log("\nComprobación de conectividad (SELECT 1, solo lectura)...");
const prisma = new PrismaClient();
try {
  await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log("  OK: conexión a la base de datos establecida correctamente.");
} catch (error) {
  console.error(
    `  FALLO: no se pudo conectar (${error?.code || error?.name || "error desconocido"}).`
  );
  console.error("         Revisa host/usuario/base de datos y que las credenciales sean válidas.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
