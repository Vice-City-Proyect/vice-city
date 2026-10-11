/**
 * Script de Migración para HU05-BD: Cuentas Vinculadas (Google / OAuth)
 *
 * Aplica los cambios estructurales en la base de datos Supabase:
 * 1. Crea la tabla public.linked_accounts si no existe.
 * 2. Define restricción única sobre (provider, provider_account_id) para garantizar
 *    que una cuenta externa solo pertenezca a un único usuario del sistema.
 * 3. Crea índices para búsquedas eficientes por usuario y por proveedor.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Iniciando migración de cuentas vinculadas (HU05-BD) en Supabase...\n");

  // 1. Crear tabla linked_accounts si no existe
  console.log("1️⃣  Creando tabla public.linked_accounts si no existe...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.linked_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT linked_accounts_provider_provider_account_id_key UNIQUE (provider, provider_account_id)
    );
  `);
  console.log("   ✅ Tabla linked_accounts creada/verificada con constraint UNIQUE (provider, provider_account_id).");

  // 2. Crear índices
  console.log("2️⃣  Creando índices en public.linked_accounts...");
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS linked_accounts_user_id_idx 
    ON public.linked_accounts(user_id);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS linked_accounts_provider_idx 
    ON public.linked_accounts(provider);
  `);
  console.log("   ✅ Índices creados exitosamente en linked_accounts.");

  console.log("\n🎉 Migración de HU05-BD completada exitosamente en Supabase.");
}

main()
  .catch((e) => {
    console.error("❌ Error en la migración de cuentas vinculadas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
