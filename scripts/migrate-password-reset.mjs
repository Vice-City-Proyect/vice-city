/**
 * Script de Migración para HU04-BD: Tokens de Recuperación de Contraseña
 *
 * Extiende la tabla verification_tokens (creada en HU03-BD) añadiendo
 * la columna `type` para diferenciar tokens de:
 *   - 'email_verification' (HU03-BD)
 *   - 'password_reset'     (HU04-BD)
 *
 * Esto evita crear una tabla nueva y mantiene un esquema cohesionado.
 * Los índices existentes siguen siendo válidos y eficientes.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Iniciando migración para HU04-BD: tokens de recuperación de contraseña...\n");

  // 1. Agregar columna type a verification_tokens
  // Por defecto 'email_verification' para mantener compatibilidad con tokens de HU03
  console.log("1️⃣  Agregando columna 'type' a verification_tokens...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.verification_tokens
    ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'email_verification';
  `);
  console.log("   ✅ Columna 'type' agregada con valor por defecto 'email_verification'.");

  // 2. Crear índice sobre la columna type para consultas de recuperación
  console.log("2️⃣  Creando índice en verification_tokens(type)...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS verification_tokens_type_idx
    ON public.verification_tokens(type);
  `);
  console.log("   ✅ Índice verification_tokens_type_idx creado.");

  // 3. Crear índice compuesto (user_id, type) para invalidaciones eficientes
  console.log("3️⃣  Creando índice compuesto (user_id, type)...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS verification_tokens_user_type_idx
    ON public.verification_tokens(user_id, type);
  `);
  console.log("   ✅ Índice compuesto verification_tokens_user_type_idx creado.");

  console.log("\n🎉 Migración de HU04-BD ejecutada con éxito en Supabase.");
}

main()
  .catch((e) => {
    console.error("❌ Error en la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

