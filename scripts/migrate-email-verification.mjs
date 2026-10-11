/**
 * Script de Migración para HU03-BD: Verificación de Correo Electrónico
 *
 * Aplica los cambios estructurales en la base de datos Supabase:
 * 1. Agrega las columnas email_verified y email_verified_at en public.users.
 * 2. Crea la tabla public.verification_tokens con restricción única sobre token_hash.
 * 3. Crea los índices necesarios para consultas rápidas y seguras.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Iniciando migración de verificación de correo en Supabase...\n");

  // 1. Modificar tabla users
  console.log("1️⃣  Verificando/agregando columnas a la tabla users...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL;
  `);
  console.log("   ✅ Columnas email_verified y email_verified_at verificadas en users.");

  // 2. Crear tabla verification_tokens
  console.log("2️⃣  Creando tabla verification_tokens si no existe...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT false,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT verification_tokens_token_hash_unique UNIQUE (token_hash)
    );
  `);
  console.log("   ✅ Tabla verification_tokens creada/verificada.");

  // 3. Crear índices
  console.log("3️⃣  Creando índices en verification_tokens...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS verification_tokens_user_id_idx 
    ON public.verification_tokens(user_id);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS verification_tokens_token_hash_idx 
    ON public.verification_tokens(token_hash);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS verification_tokens_expires_at_idx 
    ON public.verification_tokens(expires_at);
  `);
  console.log("   ✅ Índices de verificación creados exitosamente.");

  console.log("\n🎉 Migración ejecutada con éxito en Supabase.");
}

main()
  .catch((e) => {
    console.error("❌ Error en la migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

