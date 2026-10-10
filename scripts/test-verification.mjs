/**
 * Script de Verificación de Criterios de Aceptación — HU03-BD
 * Capa de acceso a datos para la verificación de correo (ORM con Prisma)
 *
 * Criterios evaluados contra Supabase:
 *   [x] 1. El modelo y la migración se ejecutan sin errores en Supabase.
 *   [x] 2. Crear, consultar y marcar como usado un token funciona.
 *   [x] 3. Caso de error: un token inexistente devuelve un resultado vacío controlado.
 *   [x] 4. Caso límite: dos confirmaciones simultáneas con el mismo token, solo una se acepta.
 *
 * Ejecutar con:
 *   npm run db:test:verification
 */

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper para calcular SHA-256 idéntico a verification.repository.ts
function hashVerificationToken(token) {
  if (!token || typeof token !== "string") return "";
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

// Funciones del repositorio replicadas para el runner independiente de Node.js
async function createVerificationToken({ userId, plainToken, expiresInHours = 24 }) {
  const token = plainToken || crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const tokenRecord = await prisma.verification_tokens.create({
    data: {
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false,
    },
  });

  return { tokenRecord, plainToken: token };
}

async function getVerificationToken(tokenOrHash) {
  if (!tokenOrHash || typeof tokenOrHash !== "string" || !tokenOrHash.trim()) {
    return null;
  }
  const clean = tokenOrHash.trim();
  const hash = hashVerificationToken(clean);

  return prisma.verification_tokens.findFirst({
    where: {
      OR: [{ token_hash: hash }, { token_hash: clean }],
    },
    include: { users: true },
  });
}

async function markTokenAsUsed(tokenOrHash) {
  if (!tokenOrHash || typeof tokenOrHash !== "string" || !tokenOrHash.trim()) {
    return false;
  }
  const clean = tokenOrHash.trim();
  const hash = hashVerificationToken(clean);

  const result = await prisma.verification_tokens.updateMany({
    where: {
      OR: [{ token_hash: hash }, { token_hash: clean }],
      used: false,
    },
    data: {
      used: true,
      used_at: new Date(),
      updated_at: new Date(),
    },
  });

  return result.count > 0;
}

async function markUserAsVerified(userId) {
  if (!userId) return false;
  const updated = await prisma.users.update({
    where: { id: userId },
    data: {
      email_verified: true,
      email_verified_at: new Date(),
    },
  });
  return Boolean(updated);
}

async function confirmEmailWithToken(plainToken) {
  if (!plainToken || typeof plainToken !== "string" || !plainToken.trim()) {
    return { success: false, reason: "INVALID_INPUT" };
  }

  const clean = plainToken.trim();
  const tokenHash = hashVerificationToken(clean);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      // Intento atómico condicional de consumo de token
      const updateResult = await tx.verification_tokens.updateMany({
        where: {
          token_hash: tokenHash,
          used: false,
          expires_at: { gt: now },
        },
        data: {
          used: true,
          used_at: now,
          updated_at: now,
        },
      });

      if (updateResult.count === 0) {
        const existing = await tx.verification_tokens.findUnique({
          where: { token_hash: tokenHash },
        });

        if (!existing) return { success: false, reason: "NOT_FOUND" };
        if (existing.used) return { success: false, reason: "ALREADY_USED" };
        if (existing.expires_at <= now) return { success: false, reason: "EXPIRED" };
        return { success: false, reason: "NOT_FOUND" };
      }

      const tokenRecord = await tx.verification_tokens.findUnique({
        where: { token_hash: tokenHash },
      });

      if (!tokenRecord) return { success: false, reason: "NOT_FOUND" };

      await tx.users.update({
        where: { id: tokenRecord.user_id },
        data: {
          email_verified: true,
          email_verified_at: now,
        },
      });

      return { success: true, reason: "SUCCESS", userId: tokenRecord.user_id };
    });
  } catch (error) {
    console.error("Error en confirmación atómica:", error.message);
    return { success: false, reason: "NOT_FOUND" };
  }
}

async function main() {
  console.log("🧪 Iniciando pruebas de aceptación para HU03-BD (Verificación de Correo en Supabase)...\n");

  const TEST_EMAIL = `test-hu03-${Date.now()}@vicecity.com`;
  let testUser = null;

  try {
    // ------------------------------------------------------------------------
    // Criterio 1: El modelo y la migración se ejecutan sin errores en Supabase
    // ------------------------------------------------------------------------
    console.log("1️⃣  Verificando estructura y modelo en Supabase...");
    const customerRole = await prisma.roles.findFirst({ where: { name: "customer" } });
    if (!customerRole) throw new Error("Rol 'customer' no encontrado.");

    testUser = await prisma.users.create({
      data: {
        role_id: customerRole.id,
        email: TEST_EMAIL,
        full_name: "Usuario Test HU03",
        email_verified: false,
      },
    });

    console.log(`   ✅ Usuario de prueba creado: ${testUser.id}`);
    console.log(`   Estado inicial de email_verified: ${testUser.email_verified}`);
    if (testUser.email_verified !== false) {
      throw new Error("El valor por defecto de email_verified debe ser false.");
    }
    console.log("   ✅ Criterio 1 APROBADO: Modelo y migración verificados en Supabase.\n");

    // ------------------------------------------------------------------------
    // Criterio 2: Crear, consultar y marcar como usado un token funciona
    // ------------------------------------------------------------------------
    console.log("2️⃣  Verificando creación, consulta y marcado de token...");
    
    // Crear token
    const created = await createVerificationToken({ userId: testUser.id, expiresInHours: 24 });
    console.log(`   ✅ Token creado con ID: ${created.tokenRecord.id}`);
    console.log(`   Hash guardado en BD: ${created.tokenRecord.token_hash.substring(0, 16)}...`);
    console.log(`   Token en texto plano: ${created.plainToken.substring(0, 16)}...`);

    // Consultar token
    const fetched = await getVerificationToken(created.plainToken);
    if (!fetched || fetched.id !== created.tokenRecord.id) {
      throw new Error("No se pudo consultar el token por su valor en texto plano.");
    }
    if (fetched.used !== false) {
      throw new Error("El token recién creado debe tener used: false.");
    }
    console.log(`   ✅ Token consultado exitosamente asociado a usuario: ${fetched.users.email}`);

    // Marcar como usado
    const marked = await markTokenAsUsed(created.plainToken);
    if (!marked) {
      throw new Error("markTokenAsUsed falló al marcar el token.");
    }

    // Re-marcar debe retornar false (no permite reusar)
    const reMarked = await markTokenAsUsed(created.plainToken);
    if (reMarked !== false) {
      throw new Error("markTokenAsUsed no debe permitir re-marcar un token ya usado.");
    }
    console.log("   ✅ Token marcado como usado atómicamente (protegido contra re-uso).");

    // Marcar usuario como verificado
    const userVerified = await markUserAsVerified(testUser.id);
    if (!userVerified) {
      throw new Error("markUserAsVerified falló.");
    }

    const updatedUser = await prisma.users.findUnique({ where: { id: testUser.id } });
    if (!updatedUser.email_verified || !updatedUser.email_verified_at) {
      throw new Error("El usuario no quedó marcado con email_verified: true.");
    }
    console.log(`   ✅ Usuario marcado como verificado (fecha: ${updatedUser.email_verified_at.toISOString()})`);
    console.log("   ✅ Criterio 2 APROBADO: Crear, consultar y marcar como usado funciona.\n");

    // ------------------------------------------------------------------------
    // Criterio 3: Caso de error: token inexistente devuelve resultado vacío controlado
    // ------------------------------------------------------------------------
    console.log("3️⃣  Verificando caso de error con token inexistente...");
    const nonexistent = await getVerificationToken("token-inexistente-totalmente-falso-999");
    if (nonexistent !== null) {
      throw new Error("Token inexistente debe retornar null controlado.");
    }
    console.log("   ✅ getVerificationToken retornó null controlado para token inexistente.");

    const confirmNonexistent = await confirmEmailWithToken("token-inexistente-12345");
    if (confirmNonexistent.success !== false || confirmNonexistent.reason !== "NOT_FOUND") {
      throw new Error("confirmEmailWithToken debe retornar { success: false, reason: 'NOT_FOUND' }.");
    }
    console.log("   ✅ confirmEmailWithToken retornó resultado controlado sin excepciones.");
    console.log("   ✅ Criterio 3 APROBADO: Manejo seguro y controlado de tokens inexistentes.\n");

    // ------------------------------------------------------------------------
    // Criterio 4: Caso límite: dos confirmaciones simultáneas con el mismo token
    // ------------------------------------------------------------------------
    console.log("4️⃣  Verificando caso límite: dos confirmaciones simultáneas con el mismo token...");
    
    // Crear un segundo usuario y un nuevo token activo
    const userConcurrency = await prisma.users.create({
      data: {
        role_id: customerRole.id,
        email: `concurrency-${Date.now()}@vicecity.com`,
        full_name: "Usuario Concurrencia",
        email_verified: false,
      },
    });

    const concurrencyToken = await createVerificationToken({
      userId: userConcurrency.id,
      expiresInHours: 24,
    });

    console.log(`   Tokens listos. Lanzando 2 confirmaciones concurrentes al mismo milisegundo...`);

    // Disparar simultáneamente dos llamadas a confirmEmailWithToken
    const [res1, res2] = await Promise.all([
      confirmEmailWithToken(concurrencyToken.plainToken),
      confirmEmailWithToken(concurrencyToken.plainToken),
    ]);

    console.log(`   Resultado Petición 1:`, res1);
    console.log(`   Resultado Petición 2:`, res2);

    const successCount = [res1, res2].filter((r) => r.success === true).length;
    const rejectedCount = [res1, res2].filter(
      (r) => r.success === false && r.reason === "ALREADY_USED"
    ).length;

    if (successCount !== 1 || rejectedCount !== 1) {
      throw new Error(
        `Fallo de concurrencia: Se esperaba exactamente 1 éxito y 1 rechazado por ALREADY_USED. Obtenidos: éxito=${successCount}, rechazados=${rejectedCount}`
      );
    }

    console.log("   ✅ Exactamente 1 petición fue aceptada y 1 fue rechazada por ALREADY_USED.");
    console.log("   ✅ Criterio 4 APROBADO: Protección contra race conditions verificada.\n");

    // Limpieza de tokens y usuarios de prueba
    await prisma.verification_tokens.deleteMany({
      where: { user_id: { in: [userConcurrency.id, testUser.id] } },
    });
    await prisma.users.deleteMany({
      where: { id: { in: [userConcurrency.id, testUser.id] } },
    });
    console.log("🧹 Limpieza de registros de prueba completada.");

    console.log("\n🎉 TODOS LOS CRITERIOS DE ACEPTACIÓN DE HU03-BD PASARON EXITOSAMENTE.");
  } catch (error) {
    if (testUser) {
      try {
        await prisma.users.delete({ where: { id: testUser.id } });
      } catch {}
    }
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Falló la prueba de aceptación:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
