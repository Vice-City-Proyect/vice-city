/**
 * Script de verificación — HU01-BD: capa ORM de usuarios.
 *
 * Prueba contra Supabase:
 *   1. Crear un usuario de prueba.
 *   2. Buscar por email (case-insensitive).
 *   3. Insertar un correo duplicado → rechazado por la BD.
 *   4. Limpieza: eliminar el usuario de prueba.
 *
 * Ejecutar con:  npm run db:test:users
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_EMAIL = `test-hu01-${Date.now()}@example.com`;

async function main() {
  // Obtener el role_id de "customer" o "client" (SRS)
  const customerRole = await prisma.roles.findFirst({
    where: {
      name: {
        in: ["customer", "client", "CLIENT", "CUSTOMER"],
        mode: "insensitive",
      },
    },
  });

  if (!customerRole) {
    throw new Error("Role 'customer' no encontrado en la base de datos.");
  }

  console.log(`✅ Role 'customer' encontrado: ${customerRole.id}\n`);

  // --- 1. Crear usuario ---
  console.log("1️⃣  Creando usuario de prueba...");
  const user = await prisma.users.create({
    data: {
      role_id: customerRole.id,
      email: TEST_EMAIL,
      full_name: "Test HU01",
    },
    include: { roles: true },
  });
  console.log(`   ✅ Usuario creado: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Rol: ${user.roles.name}\n`);

  // --- 2. Buscar por email (case-insensitive) ---
  console.log("2️⃣  Buscando por email (mayúsculas)...");
  const found = await prisma.users.findFirst({
    where: {
      email: { equals: TEST_EMAIL.toUpperCase(), mode: "insensitive" },
    },
    include: { roles: true },
  });

  if (found && found.id === user.id) {
    console.log(`   ✅ Encontrado correctamente (case-insensitive)\n`);
  } else {
    throw new Error("Búsqueda case-insensitive falló");
  }

  // --- 3. Insertar duplicado → rechazado ---
  console.log("3️⃣  Insertando email duplicado (debe fallar)...");
  try {
    await prisma.users.create({
      data: {
        role_id: customerRole.id,
        email: TEST_EMAIL.toUpperCase(), // misma dirección, diferente case
        full_name: "Duplicado",
      },
    });
    throw new Error("⚠️  El duplicado NO fue rechazado — la constraint falla");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      console.log(
        `   ✅ Rechazado correctamente (P2002 — unique constraint)\n`,
      );
    } else {
      throw error;
    }
  }

  // --- 4. Limpieza ---
  console.log("4️⃣  Eliminando usuario de prueba...");
  await prisma.users.delete({ where: { id: user.id } });
  console.log("   ✅ Limpieza completada\n");

  console.log("🎉 Todas las verificaciones pasaron.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    // Limpiar en caso de error parcial
    try {
      await prisma.users.deleteMany({
        where: { email: { equals: TEST_EMAIL, mode: "insensitive" } },
      });
    } catch {
      // ignorar si ya fue eliminado
    }
    await prisma.$disconnect();
  });
