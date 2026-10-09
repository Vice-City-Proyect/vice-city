import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@vicecity.com";
const ADMIN_NAME = "admin";
const ADMIN_PASSWORD_PLAIN = "vicecity123*";

async function main() {
  console.log("⏳ Iniciando siembra de usuario administrador...");

  // 1. Obtener el rol 'admin'
  const adminRole = await prisma.roles.findFirst({
    where: { name: "admin" },
  });

  if (!adminRole) {
    throw new Error("El rol 'admin' no existe en la tabla roles.");
  }
  console.log(`✅ Rol 'admin' encontrado con id: ${adminRole.id}`);

  // 2. Verificar o activar pgcrypto para hash de contraseña estándar bcrypt
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // 3. Generar hash bcrypt usando crypt() y gen_salt('bf', 10) de pgcrypto
  const hashResult = await prisma.$queryRawUnsafe(
    `SELECT crypt($1, gen_salt('bf', 10)) as hash;`,
    ADMIN_PASSWORD_PLAIN
  );
  const passwordHash = hashResult[0].hash;
  console.log("✅ Hash de contraseña generado exitosamente con bcrypt.");

  // 4. Sembrar el usuario administrador si no existe
  const existingUser = await prisma.users.findFirst({
    where: {
      email: { equals: ADMIN_EMAIL, mode: "insensitive" },
    },
  });

  let userId;
  if (!existingUser) {
    const newUser = await prisma.users.create({
      data: {
        role_id: adminRole.id,
        email: ADMIN_EMAIL.toLowerCase(),
        full_name: ADMIN_NAME,
        password_hash: passwordHash,
        is_active: true,
        metadata: {
          immutable: true,
          system_root: true,
          description: "Usuario administrador principal del sistema",
        },
      },
    });
    userId = newUser.id;
    console.log(`✅ Usuario admin creado con ID: ${userId}`);
  } else {
    userId = existingUser.id;
    console.log(`ℹ️ El usuario admin ya existe con ID: ${userId}.`);
  }

  // 5. Aplicar trigger en la base de datos para proteger al usuario admin contra UPDATE y DELETE
  console.log("⏳ Configurando trigger de inmutabilidad en la base de datos...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.protect_admin_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
    BEGIN
      IF OLD.email = '${ADMIN_EMAIL}' THEN
        RAISE EXCEPTION 'El usuario administrador principal (%) no puede ser modificado ni eliminado.', OLD.email;
      END IF;
      RETURN NEW;
    END;
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_protect_admin_user ON public.users;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_protect_admin_user
      BEFORE UPDATE OR DELETE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION protect_admin_user();
  `);
  console.log("✅ Trigger de protección de base de datos aplicado correctamente.");

  // 6. Probar la protección intentando actualizar
  console.log("⏳ Verificando protección (intentando actualización de prueba)...");
  try {
    await prisma.users.update({
      where: { id: userId },
      data: { full_name: "admin_modificado" },
    });
    console.warn("⚠️ ALERTA: La actualización fue permitida (el trigger no bloqueó).");
  } catch (error) {
    console.log("✅ Éxito: La base de datos rechazó la modificación tal como se requiere:");
    console.log(`   Mensaje: ${error.message.split("\n").slice(-2).join(" ").trim()}`);
  }

  console.log("\n🎉 Proceso de siembra finalizado exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error en la siembra:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
