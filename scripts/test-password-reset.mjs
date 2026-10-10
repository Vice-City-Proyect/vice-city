/**
 * Script de prueba de aceptación — HU04-BD: Tokens de Recuperación de Contraseña
 *
 * Verifica los cuatro criterios de aceptación definidos en el ticket:
 *   CA01 - El modelo y la migración se ejecutan sin errores en Supabase.
 *   CA02 - Crear, consultar e invalidar tokens funciona correctamente.
 *   CA03 - Un token inexistente devuelve un resultado vacío controlado (null).
 *   CA04 - Dos restablecimientos simultáneos con el mismo token: solo uno acepta.
 *
 * Ejecutar con:
 *   npm run db:test:password-reset
 *
 * Nota: Este script es autocontenido y no importa código TypeScript de src/.
 *       Las funciones se replican inline porque Node.js ESM no puede resolver
 *       los alias @/ de TypeScript sin un paso de compilación.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers replicados del repositorio (no se importa TS directamente)
// ---------------------------------------------------------------------------

/** Genera hash SHA-256 de un token (idéntico a hashVerificationToken) */
function hashToken(token) {
  if (!token || typeof token !== "string") return "";
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/** Crea un token de recuperación (1 hora de validez por defecto) */
async function createPasswordResetToken(userId, expiresInHours = 1) {
  const plainToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  // Invalida tokens previos de recuperación del mismo usuario
  await prisma.verification_tokens.updateMany({
    where: { user_id: userId, type: "password_reset", used: false },
    data: { used: true, used_at: new Date(), updated_at: new Date() },
  });

  const tokenRecord = await prisma.verification_tokens.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false,
      type: "password_reset",
    },
  });

  return { tokenRecord, plainToken };
}

/** Consulta un token de recuperación por texto plano o hash */
async function getPasswordResetToken(tokenOrHash) {
  if (!tokenOrHash?.trim()) return null;
  const computedHash = hashToken(tokenOrHash.trim());
  return prisma.verification_tokens.findFirst({
    where: {
      OR: [{ token_hash: computedHash }, { token_hash: tokenOrHash.trim() }],
      type: "password_reset",
    },
    include: { users: true },
  });
}

/** Invalida todos los tokens de recuperación activos de un usuario */
async function invalidatePasswordResetTokens(userId) {
  const result = await prisma.verification_tokens.updateMany({
    where: { user_id: userId, type: "password_reset", used: false },
    data: { used: true, used_at: new Date(), updated_at: new Date() },
  });
  return result.count;
}

/**
 * Restablece la contraseña de forma atómica.
 * Devuelve { success, reason, userId? }
 */
async function resetPassword(plainToken, newPasswordHash) {
  if (!plainToken?.trim() || !newPasswordHash?.trim()) {
    return { success: false, reason: "INVALID_INPUT" };
  }

  const tokenHash = hashToken(plainToken.trim());
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // Intento atómico de consumo
    const updateResult = await tx.verification_tokens.updateMany({
      where: {
        token_hash: tokenHash,
        type: "password_reset",
        used: false,
        expires_at: { gt: now },
      },
      data: { used: true, used_at: now, updated_at: now },
    });

    if (updateResult.count === 0) {
      const existing = await tx.verification_tokens.findFirst({
        where: { token_hash: tokenHash, type: "password_reset" },
      });
      if (!existing) return { success: false, reason: "NOT_FOUND" };
      if (existing.used) return { success: false, reason: "ALREADY_USED" };
      if (existing.expires_at <= now) return { success: false, reason: "EXPIRED" };
      return { success: false, reason: "NOT_FOUND" };
    }

    const tokenRecord = await tx.verification_tokens.findFirst({
      where: { token_hash: tokenHash, type: "password_reset" },
    });

    if (!tokenRecord) return { success: false, reason: "NOT_FOUND" };

    await tx.users.update({
      where: { id: tokenRecord.user_id },
      data: { password_hash: newPasswordHash, updated_at: now },
    });

    return { success: true, reason: "SUCCESS", userId: tokenRecord.user_id };
  });
}

// ---------------------------------------------------------------------------
// Suite de pruebas
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("HU04-BD — Test de Recuperación de Contraseña");
  console.log("=".repeat(60));

  // Obtener el usuario admin para las pruebas (sembrado en HU01-BD)
  const adminUser = await prisma.users.findFirst({
    where: { email: "admin@vicecity.com" },
  });

  if (!adminUser) {
    console.error("❌ No se encontró el usuario admin@vicecity.com. Ejecuta db:seed:admin primero.");
    process.exit(1);
  }

  const userId = adminUser.id;
  console.log(`\n👤 Usuario de prueba: ${adminUser.email} (${userId})\n`);

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------------------
  // CA01 — La migración y el modelo funcionan sin errores en Supabase
  // -------------------------------------------------------------------------
  console.log("─".repeat(60));
  console.log("CA01 — Modelo y migración ejecutan sin errores");
  console.log("─".repeat(60));

  try {
    // Verificar que el campo 'type' existe en la tabla consultando directamente
    const sample = await prisma.verification_tokens.findFirst({
      where: { type: "password_reset" },
    });
    console.log("✅ CA01 PASS — Campo 'type' existe en verification_tokens.");
    console.log(`   Tokens de recuperación en BD: ${sample ? "≥1" : "0 (tabla OK)"}`);
    passed++;
  } catch (err) {
    console.error("❌ CA01 FAIL — Error al consultar el campo 'type':", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // CA02 — Crear, consultar e invalidar tokens funciona
  // -------------------------------------------------------------------------
  console.log("\n" + "─".repeat(60));
  console.log("CA02 — Crear, consultar e invalidar tokens");
  console.log("─".repeat(60));

  let createdToken = null;

  // CA02.1 — Crear token
  try {
    createdToken = await createPasswordResetToken(userId);
    if (createdToken && createdToken.plainToken && createdToken.tokenRecord?.id) {
      console.log("✅ CA02.1 PASS — Token de recuperación creado.");
      console.log(`   ID en BD: ${createdToken.tokenRecord.id}`);
      console.log(`   Token plano (primeros 16 chars): ${createdToken.plainToken.substring(0, 16)}...`);
      console.log(`   Expira: ${createdToken.tokenRecord.expires_at.toISOString()}`);
      console.log(`   Tipo: ${createdToken.tokenRecord.type}`);
      passed++;
    } else {
      console.error("❌ CA02.1 FAIL — createPasswordResetToken devolvió datos incompletos.");
      failed++;
    }
  } catch (err) {
    console.error("❌ CA02.1 FAIL — Error al crear token:", err.message);
    failed++;
  }

  // CA02.2 — Consultar token
  if (createdToken) {
    try {
      const found = await getPasswordResetToken(createdToken.plainToken);
      if (found && found.id === createdToken.tokenRecord.id && found.users?.id === userId) {
        console.log("✅ CA02.2 PASS — Token consultado con relación users.");
        console.log(`   Email usuario: ${found.users.email}`);
        passed++;
      } else {
        console.error("❌ CA02.2 FAIL — Token consultado no coincide o falta relación users.");
        failed++;
      }
    } catch (err) {
      console.error("❌ CA02.2 FAIL — Error al consultar token:", err.message);
      failed++;
    }
  }

  // CA02.3 — Invalidar tokens
  try {
    // Primero crear un token fresco para invalidar
    const tokenToInvalidate = await createPasswordResetToken(userId);
    const count = await invalidatePasswordResetTokens(userId);
    if (count >= 1) {
      console.log(`✅ CA02.3 PASS — ${count} token(s) invalidado(s) correctamente.`);
      passed++;
    } else {
      console.error("❌ CA02.3 FAIL — invalidatePasswordResetTokens devolvió 0.");
      failed++;
    }
  } catch (err) {
    console.error("❌ CA02.3 FAIL — Error al invalidar tokens:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // CA03 — Token inexistente devuelve resultado vacío controlado (null)
  // -------------------------------------------------------------------------
  console.log("\n" + "─".repeat(60));
  console.log("CA03 — Token inexistente devuelve null controlado");
  console.log("─".repeat(60));

  try {
    const fakeToken = "token-que-no-existe-en-la-bd-" + crypto.randomBytes(8).toString("hex");
    const result = await getPasswordResetToken(fakeToken);
    if (result === null) {
      console.log("✅ CA03.1 PASS — getPasswordResetToken con token inválido devuelve null.");
      passed++;
    } else {
      console.error("❌ CA03.1 FAIL — Se esperaba null, se obtuvo:", result);
      failed++;
    }
  } catch (err) {
    console.error("❌ CA03.1 FAIL — Lanzó excepción en lugar de devolver null:", err.message);
    failed++;
  }

  try {
    const resetResult = await resetPassword("token-inexistente-123", "$2b$10$fakehashvalue");
    if (resetResult.success === false && resetResult.reason === "NOT_FOUND") {
      console.log("✅ CA03.2 PASS — resetPassword con token inválido devuelve NOT_FOUND controlado.");
      passed++;
    } else {
      console.error("❌ CA03.2 FAIL — Resultado inesperado:", resetResult);
      failed++;
    }
  } catch (err) {
    console.error("❌ CA03.2 FAIL — Lanzó excepción:", err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // CA04 — Dos restablecimientos simultáneos: solo uno acepta
  // -------------------------------------------------------------------------
  console.log("\n" + "─".repeat(60));
  console.log("CA04 — Concurrencia: dos resets simultáneos, solo uno acepta");
  console.log("─".repeat(60));

  // Crear un usuario temporal para este test porque el trigger protect_admin_user
  // bloquea cualquier UPDATE sobre admin@vicecity.com (comportamiento esperado y correcto).
  let tempUser = null;

  try {
    // Buscar el rol 'customer' para el usuario temporal
    const customerRole = await prisma.roles.findFirst({
      where: { name: "customer" },
    });

    if (!customerRole) throw new Error("Rol 'customer' no encontrado");

    // Crear usuario temporal de prueba
    tempUser = await prisma.users.create({
      data: {
        email: `test-concurrency-${Date.now()}@vicecity-test.com`,
        full_name: "Usuario Test Concurrencia HU04",
        password_hash: "$2b$10$tempHashForConcurrencyTest",
        role_id: customerRole.id,
        is_active: true,
      },
    });

    console.log(`   Usuario temporal creado: ${tempUser.email} (${tempUser.id})`);

    // Crear token fresco para el test de concurrencia
    const freshToken = await createPasswordResetToken(tempUser.id);
    if (!freshToken) throw new Error("No se pudo crear token para prueba de concurrencia");

    const fakeHash1 = "$2b$10$concurrencyHashTestValueAAA";
    const fakeHash2 = "$2b$10$concurrencyHashTestValueBBB";

    // Lanzar dos resets en paralelo con el mismo token
    const [res1, res2] = await Promise.all([
      resetPassword(freshToken.plainToken, fakeHash1),
      resetPassword(freshToken.plainToken, fakeHash2),
    ]);

    const successes = [res1, res2].filter((r) => r.success && r.reason === "SUCCESS").length;
    const failures = [res1, res2].filter((r) => !r.success).length;

    console.log(`   Resultado 1: success=${res1.success}, reason=${res1.reason}`);
    console.log(`   Resultado 2: success=${res2.success}, reason=${res2.reason}`);

    if (successes === 1 && failures === 1) {
      console.log("✅ CA04 PASS — Solo una transacción concurrente aceptada.");
      passed++;
    } else {
      console.error(`❌ CA04 FAIL — Se esperaba 1 éxito y 1 fallo, se obtuvo ${successes} éxitos.`);
      failed++;
    }
  } catch (err) {
    console.error("❌ CA04 FAIL — Error en prueba de concurrencia:", err.message);
    failed++;
  } finally {
    // Limpiar: eliminar usuario temporal y sus tokens
    // Se usa deleteMany para no lanzar error si ya fueron eliminados por cascade
    if (tempUser) {
      await prisma.verification_tokens.deleteMany({ where: { user_id: tempUser.id } });
      await prisma.users.deleteMany({ where: { id: tempUser.id } });
      console.log("   ↩ Usuario temporal y tokens eliminados.");
    }
  }

  // -------------------------------------------------------------------------
  // Resumen final
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log(`RESUMEN: ${passed} prueba(s) pasaron | ${failed} prueba(s) fallaron`);
  console.log("=".repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Error fatal en el script de prueba:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
