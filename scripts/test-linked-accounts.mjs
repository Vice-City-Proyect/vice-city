/**
 * Script de prueba de aceptación — HU05-BD: Cuentas Vinculadas (Google / OAuth)
 *
 * Verifica los cuatro criterios de aceptación definidos en el ticket:
 *   CA01 - El modelo y la migración se ejecutan sin errores en Supabase.
 *   CA02 - Buscar y vincular una cuenta funciona correctamente.
 *   CA03 - Caso de error: vincular una cuenta ya vinculada a otro usuario es rechazado.
 *   CA04 - Caso límite: dos vinculaciones simultáneas de la misma cuenta, solo una se guarda.
 *
 * Ejecutar con:
 *   npm run db:test:linked-accounts
 *
 * Nota: Autocontenido usando PrismaClient para no depender de la resolución de alias @/ en ESM de Node.js.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers replicados del repositorio (para ejecución limpia en Node ESM)
// ---------------------------------------------------------------------------

function normalizeProvider(provider) {
  return provider.trim().toLowerCase();
}

function normalizeProviderAccountId(providerAccountId) {
  return providerAccountId.trim();
}

async function findLinkedAccount(provider, providerAccountId) {
  if (!provider?.trim() || !providerAccountId?.trim()) return null;

  try {
    return await prisma.linked_accounts.findUnique({
      where: {
        provider_provider_account_id: {
          provider: normalizeProvider(provider),
          provider_account_id: normalizeProviderAccountId(providerAccountId),
        },
      },
      include: {
        users: true,
      },
    });
  } catch (error) {
    console.error("Error al buscar cuenta vinculada:", error);
    return null;
  }
}

async function linkAccount(params) {
  if (!params?.userId?.trim() || !params?.provider?.trim() || !params?.providerAccountId?.trim()) {
    return { success: false, reason: "INVALID_INPUT" };
  }

  const cleanUserId = params.userId.trim();
  const cleanProvider = normalizeProvider(params.provider);
  const cleanAccountId = normalizeProviderAccountId(params.providerAccountId);

  try {
    const existing = await prisma.linked_accounts.findUnique({
      where: {
        provider_provider_account_id: {
          provider: cleanProvider,
          provider_account_id: cleanAccountId,
        },
      },
    });

    if (existing) {
      if (existing.user_id === cleanUserId) {
        return { success: true, reason: "ALREADY_LINKED_TO_SAME_USER", account: existing };
      }
      return { success: false, reason: "ALREADY_LINKED_TO_OTHER_USER" };
    }

    const created = await prisma.linked_accounts.create({
      data: {
        user_id: cleanUserId,
        provider: cleanProvider,
        provider_account_id: cleanAccountId,
      },
    });

    return { success: true, reason: "SUCCESS", account: created };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const afterConflict = await prisma.linked_accounts.findUnique({
        where: {
          provider_provider_account_id: {
            provider: cleanProvider,
            provider_account_id: cleanAccountId,
          },
        },
      });

      if (afterConflict?.user_id === cleanUserId) {
        return { success: true, reason: "ALREADY_LINKED_TO_SAME_USER", account: afterConflict };
      }
      return { success: false, reason: "ALREADY_LINKED_TO_OTHER_USER" };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { success: false, reason: "USER_NOT_FOUND" };
    }

    console.error("Error al vincular cuenta externa:", error);
    return { success: false, reason: "INVALID_INPUT" };
  }
}

// ---------------------------------------------------------------------------
// Suite de pruebas
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("HU05-BD — Test de Cuentas Vinculadas (Google / OAuth)");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  // Buscar rol customer para usuarios de prueba
  const customerRole = await prisma.roles.findFirst({
    where: { name: "customer" },
  });

  if (!customerRole) {
    console.error("❌ Rol 'customer' no encontrado en la base de datos.");
    process.exit(1);
  }

  // Crear dos usuarios temporales para validar propiedad y traspaso
  const timestamp = Date.now();
  const testUserA = await prisma.users.create({
    data: {
      email: `test-oauth-a-${timestamp}@vicecity-test.com`,
      full_name: "Usuario OAuth A",
      role_id: customerRole.id,
      is_active: true,
    },
  });

  const testUserB = await prisma.users.create({
    data: {
      email: `test-oauth-b-${timestamp}@vicecity-test.com`,
      full_name: "Usuario OAuth B",
      role_id: customerRole.id,
      is_active: true,
    },
  });

  console.log(`👤 Usuario A: ${testUserA.email} (${testUserA.id})`);
  console.log(`👤 Usuario B: ${testUserB.email} (${testUserB.id})\n`);

  try {
    // -------------------------------------------------------------------------
    // CA01 — El modelo y la migración se ejecutan sin errores en Supabase
    // -------------------------------------------------------------------------
    console.log("─".repeat(60));
    console.log("CA01 — Modelo y migración ejecutan sin errores en Supabase");
    console.log("─".repeat(60));

    try {
      const count = await prisma.linked_accounts.count();
      console.log(`✅ CA01 PASS — Tabla linked_accounts existe y accesible en Supabase (registros: ${count}).`);
      passed++;
    } catch (err) {
      console.error("❌ CA01 FAIL — Error consultando linked_accounts:", err.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA02 — Buscar y vincular una cuenta funciona
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(60));
    console.log("CA02 — Buscar y vincular una cuenta funciona");
    console.log("─".repeat(60));

    const googleAccountId = `google_sub_${crypto.randomBytes(8).toString("hex")}`;
    const provider = "google";

    try {
      // 2.1 Vincular cuenta al usuario A
      const linkResult = await linkAccount({
        userId: testUserA.id,
        provider,
        providerAccountId: googleAccountId,
      });

      if (linkResult.success && linkResult.reason === "SUCCESS" && linkResult.account?.id) {
        console.log("✅ CA02.1 PASS — Cuenta de Google vinculada al Usuario A con éxito.");
        console.log(`   ID vinculado: ${linkResult.account.id}`);
        passed++;
      } else {
        console.error("❌ CA02.1 FAIL — Falló la vinculación inicial:", linkResult);
        failed++;
      }

      // 2.2 Buscar la cuenta vinculada y validar relación users
      const found = await findLinkedAccount(provider, googleAccountId);
      if (found && found.user_id === testUserA.id && found.users?.email === testUserA.email) {
        console.log("✅ CA02.2 PASS — findLinkedAccount encontró la cuenta y su usuario asociado.");
        console.log(`   Usuario vinculado verificado: ${found.users.email}`);
        passed++;
      } else {
        console.error("❌ CA02.2 FAIL — No se encontró la cuenta o faltan datos de usuario:", found);
        failed++;
      }

      // 2.3 Búsqueda de cuenta inexistente devuelve null de forma controlada
      const notFound = await findLinkedAccount(provider, "cuenta_que_no_existe_12345");
      if (notFound === null) {
        console.log("✅ CA02.3 PASS — findLinkedAccount con cuenta inexistente devuelve null controlado.");
        passed++;
      } else {
        console.error("❌ CA02.3 FAIL — Se esperaba null para cuenta inexistente, se obtuvo:", notFound);
        failed++;
      }
    } catch (err) {
      console.error("❌ CA02 FAIL — Excepción inesperada:", err.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA03 — Vincular una cuenta ya vinculada a otro usuario es rechazado
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(60));
    console.log("CA03 — Rechazo de vinculación si ya pertenece a otro usuario");
    console.log("─".repeat(60));

    try {
      // Intentar vincular la misma cuenta de Google al Usuario B
      const conflictResult = await linkAccount({
        userId: testUserB.id,
        provider,
        providerAccountId: googleAccountId,
      });

      if (!conflictResult.success && conflictResult.reason === "ALREADY_LINKED_TO_OTHER_USER") {
        console.log("✅ CA03 PASS — Rechazo controlado con motivo ALREADY_LINKED_TO_OTHER_USER.");
        passed++;
      } else {
        console.error("❌ CA03 FAIL — Resultado inesperado:", conflictResult);
        failed++;
      }
    } catch (err) {
      console.error("❌ CA03 FAIL — Lanzó excepción no controlada:", err.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA04 — Dos vinculaciones simultáneas de la misma cuenta, solo una se guarda
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(60));
    console.log("CA04 — Concurrencia: dos vinculaciones simultáneas, solo una se guarda");
    console.log("─".repeat(60));

    try {
      const concurrentAccountId = `google_sub_concurrent_${crypto.randomBytes(8).toString("hex")}`;

      // Lanzar en paralelo dos vinculaciones de la misma cuenta a usuarios distintos
      const [res1, res2] = await Promise.all([
        linkAccount({
          userId: testUserA.id,
          provider: "google",
          providerAccountId: concurrentAccountId,
        }),
        linkAccount({
          userId: testUserB.id,
          provider: "google",
          providerAccountId: concurrentAccountId,
        }),
      ]);

      console.log(`   Resultado intento 1: success=${res1.success}, reason=${res1.reason}`);
      console.log(`   Resultado intento 2: success=${res2.success}, reason=${res2.reason}`);

      const successes = [res1, res2].filter((r) => r.success && r.reason === "SUCCESS").length;
      const rejected = [res1, res2].filter(
        (r) => !r.success && r.reason === "ALREADY_LINKED_TO_OTHER_USER"
      ).length;

      // Verificar en base de datos cuántos registros se guardaron
      const persistedAccounts = await prisma.linked_accounts.findMany({
        where: {
          provider: "google",
          provider_account_id: concurrentAccountId,
        },
      });

      if (successes === 1 && rejected === 1 && persistedAccounts.length === 1) {
        console.log("✅ CA04 PASS — Solo una de las vinculaciones simultáneas fue aceptada y guardada.");
        console.log(`   Dueño final asignado: ${persistedAccounts[0].user_id}`);
        passed++;
      } else {
        console.error(
          `❌ CA04 FAIL — Esperado: 1 éxito, 1 rechazado, 1 en BD. Obtenido: ${successes} éxitos, ${rejected} rechazados, ${persistedAccounts.length} en BD.`
        );
        failed++;
      }
    } catch (err) {
      console.error("❌ CA04 FAIL — Error en prueba de concurrencia:", err.message);
      failed++;
    }
  } finally {
    // Limpieza de datos de prueba
    console.log("\n" + "─".repeat(60));
    console.log("🧹 Limpiando registros de prueba...");
    try {
      await prisma.linked_accounts.deleteMany({
        where: {
          user_id: { in: [testUserA.id, testUserB.id] },
        },
      });
      await prisma.users.deleteMany({
        where: {
          id: { in: [testUserA.id, testUserB.id] },
        },
      });
      console.log("✅ Limpieza completada.");
    } catch (cleanupErr) {
      console.warn("⚠️ Advertencia en limpieza:", cleanupErr.message);
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
  .finally(async () => {
    await prisma.$disconnect();
  });
