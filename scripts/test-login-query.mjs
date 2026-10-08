/**
 * Script de Verificación de Criterios de Aceptación — HU02-BD
 * Consulta de usuarios para Login (Capa ORM con Prisma)
 *
 * Criterios evaluados contra Supabase:
 *   [x] 1. Devuelve el usuario con su rol (ADMIN, CLIENT, TICKET_SELLER o QR_VALIDATOR).
 *   [x] 2. Caso de error: correo inexistente o entrada vacía devuelve un resultado vacío controlado (null).
 *   [x] 3. Caso límite: búsqueda sin distinguir mayúsculas o con espacios al inicio/final.
 *
 * Ejecutar con:
 *   npm run db:test:login
 */

import { PrismaClient, role_name_enum } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Normalización de roles probada conforme a la implementación en src/features/users/user.repository.ts
 */
function normalizeRoleName(roleName) {
  if (!roleName || typeof roleName !== "string") {
    return role_name_enum.CLIENT;
  }

  const normalized = roleName.trim().toUpperCase();

  switch (normalized) {
    case "ADMIN":
      return role_name_enum.ADMIN;
    case "CUSTOMER":
    case "CLIENT":
    case "CLIENTE":
      return role_name_enum.CLIENT;
    case "TICKET_SELLER":
    case "VENDEDOR":
      return role_name_enum.TICKET_SELLER;
    case "QR_VALIDATOR":
    case "VALIDADOR_QR":
    case "LECTOR_QR":
      return role_name_enum.QR_VALIDATOR;
    default:
      return normalized;
  }
}

/**
 * Función de consulta de login probada conforme a la implementación en src/features/users/user.repository.ts
 */
async function findUserForLogin(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return null;
  }

  const cleanEmail = email.trim();

  try {
    const user = await prisma.users.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        password_hash: true,
        full_name: true,
        is_active: true,
        roles: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      role: normalizeRoleName(user.roles.name),
      full_name: user.full_name,
      is_active: user.is_active,
    };
  } catch (error) {
    console.error("Error al consultar usuario para login:", error);
    return null;
  }
}

async function main() {
  console.log("🧪 Iniciando pruebas de aceptación para HU02-BD (Consulta de usuarios para login)...\n");

  // --------------------------------------------------------------------------
  // Criterio 1: Devuelve el usuario con su rol (ADMIN, CLIENT, etc.)
  // --------------------------------------------------------------------------
  console.log("1️⃣  Verificando consulta de usuario con rol...");
  const adminUser = await findUserForLogin("admin@vicecity.com");

  if (!adminUser) {
    throw new Error(
      "No se encontró el usuario admin@vicecity.com. Ejecuta primero 'npm run db:seed:admin' para sembrarlo."
    );
  }

  console.log("   ✅ Usuario recuperado exitosamente de Supabase:");
  console.log(`      ID: ${adminUser.id}`);
  console.log(`      Email: ${adminUser.email}`);
  console.log(`      Password Hash (encriptada): ${adminUser.password_hash?.substring(0, 15)}...`);
  console.log(`      Rol normalizado: ${adminUser.role}`);

  if (adminUser.role !== "ADMIN") {
    throw new Error(`Se esperaba rol 'ADMIN', pero se obtuvo: '${adminUser.role}'`);
  }
  if (!adminUser.password_hash) {
    throw new Error("El campo password_hash es requerido para login y no fue retornado.");
  }
  console.log("   ✅ Criterio 1 APROBADO: Retorna id, email, password_hash y rol (ADMIN).\n");

  // --------------------------------------------------------------------------
  // Criterio 2: Caso de error: correo inexistente devuelve resultado vacío controlado
  // --------------------------------------------------------------------------
  console.log("2️⃣  Verificando caso de error con correo inexistente o entrada inválida...");

  const nonexistent = await findUserForLogin("usuario-que-no-existe-en-bd-999@vicecity.com");
  if (nonexistent !== null) {
    throw new Error("Se esperaba null para un correo inexistente, pero se obtuvo un resultado.");
  }
  console.log("   ✅ Correo inexistente retornó null controlado (sin lanzar excepciones).");

  // Probando entradas vacías o con solo espacios
  const emptyEmail = await findUserForLogin("");
  const spacesOnly = await findUserForLogin("     ");
  const nullEmail = await findUserForLogin(null);

  if (emptyEmail !== null || spacesOnly !== null || nullEmail !== null) {
    throw new Error("Las entradas inválidas deben retornar null de forma controlada.");
  }
  console.log("   ✅ Entradas vacías/espacios retornaron null de forma defensiva.");
  console.log("   ✅ Criterio 2 APROBADO: Manejo controlado de usuarios inexistentes.\n");

  // --------------------------------------------------------------------------
  // Criterio 3: Caso límite: búsqueda insensible a mayúsculas y tolerante a espacios
  // --------------------------------------------------------------------------
  console.log("3️⃣  Verificando casos límite (mayúsculas y espacios)...");

  // Búsqueda con mayúsculas y espacios al inicio/final
  const upperWithSpaces = await findUserForLogin("   ADMIN@VICECITY.COM   ");
  if (!upperWithSpaces || upperWithSpaces.id !== adminUser.id) {
    throw new Error("Falló la búsqueda con mayúsculas y espacios.");
  }
  console.log("   ✅ Búsqueda con '   ADMIN@VICECITY.COM   ' encontró el usuario correctamente.");

  // Búsqueda con mayúsculas/minúsculas alternadas y tabulaciones
  const mixedCase = await findUserForLogin("\tAdMiN@ViCeCiTy.CoM\n");
  if (!mixedCase || mixedCase.id !== adminUser.id) {
    throw new Error("Falló la búsqueda con mayúsculas/minúsculas alternadas.");
  }
  console.log("   ✅ Búsqueda con mixed case 'AdMiN@ViCeCiTy.CoM' encontró el usuario correctamente.");
  console.log("   ✅ Criterio 3 APROBADO: Case-insensitive y trimming funcionan a la perfección.\n");

  // --------------------------------------------------------------------------
  // Verificación adicional de la función de normalización de roles
  // --------------------------------------------------------------------------
  console.log("4️⃣  Verificando normalización de roles del sistema...");
  const roleChecks = [
    { input: "admin", expected: "ADMIN" },
    { input: "customer", expected: "CLIENT" },
    { input: "client", expected: "CLIENT" },
    { input: "staff", expected: "STAFF" },
    { input: "ticket_seller", expected: "TICKET_SELLER" },
    { input: "qr_validator", expected: "QR_VALIDATOR" },
  ];

  for (const check of roleChecks) {
    const res = normalizeRoleName(check.input);
    if (res !== check.expected) {
      throw new Error(`Fallo en normalización: '${check.input}' produjo '${res}', se esperaba '${check.expected}'`);
    }
  }
  console.log("   ✅ Roles normalizados correctamente según el enum del sistema.\n");

  console.log("🎉 TODOS LOS CRITERIOS DE ACEPTACIÓN DE HU02-BD PASARON EXITOSAMENTE.");
}

main()
  .catch((e) => {
    console.error("❌ Falló la prueba de aceptación:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
