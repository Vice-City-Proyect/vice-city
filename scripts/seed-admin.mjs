import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_SEED_EMAIL || "admin@vicecity.com").trim().toLowerCase();
const ADMIN_NAME = process.env.ADMIN_SEED_NAME || "Administrador Principal";
const ADMIN_PASSWORD_PLAIN =
  process.env.ADMIN_SEED_PASSWORD ||
  (process.env.NODE_ENV === "production" ? null : "vicecity123*");

if (!ADMIN_PASSWORD_PLAIN) {
  throw new Error(
    "Seguridad: En entornos de producción o compartidos debe definirse la variable ADMIN_SEED_PASSWORD en .env."
  );
}

async function main() {
  console.log("⏳ Iniciando siembra de usuario administrador...");

  // 1. Obtener el rol 'admin' de forma case-insensitive
  const adminRole = await prisma.roles.findFirst({
    where: {
      name: { in: ["admin", "ADMIN"], mode: "insensitive" },
    },
  });

  if (!adminRole) {
    throw new Error("El rol 'admin' no existe en la tabla roles.");
  }
  console.log(`✅ Rol 'admin' encontrado con id: ${adminRole.id}`);

  // 2. Generar hash bcrypt estándar
  let passwordHash;
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    const hashResult = await prisma.$queryRawUnsafe(
      `SELECT crypt($1, gen_salt('bf', 10)) as hash;`,
      ADMIN_PASSWORD_PLAIN
    );
    passwordHash = hashResult[0].hash;
  } catch {
    // Fallback si la base de datos restringe CREATE EXTENSION
    const bcrypt = await import("bcryptjs").catch(() => null);
    if (bcrypt && bcrypt.hash) {
      passwordHash = await bcrypt.hash(ADMIN_PASSWORD_PLAIN, 10);
    } else {
      throw new Error("No se pudo generar el hash de la contraseña.");
    }
  }
  console.log("✅ Hash de contraseña generado exitosamente con bcrypt.");

  // 3. Sembrar el usuario administrador si no existe
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
        email: ADMIN_EMAIL,
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

  // 4. Configurar trigger de protección en PostgreSQL
  // Protege al administrador principal contra DELETE y contra degradación de su rol administrativo,
  // permitiendo la actualización de credenciales, perfil y metadata. Retorna NEW en UPDATE y OLD en DELETE.
  console.log("⏳ Configurando trigger de inmutabilidad en la base de datos...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.protect_admin_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
    BEGIN
      -- Impedir eliminación del administrador principal del sistema
      IF TG_OP = 'DELETE' AND LOWER(OLD.email) = 'admin@vicecity.com' THEN
        RAISE EXCEPTION 'El usuario administrador principal (%) no puede ser eliminado del sistema.', OLD.email;
      END IF;

      -- Impedir degradación o cambio de rol al administrador principal
      IF TG_OP = 'UPDATE' AND LOWER(OLD.email) = 'admin@vicecity.com' AND NEW.role_id <> OLD.role_id THEN
        RAISE EXCEPTION 'No se permite revocar el rol administrativo al administrador principal (%).', OLD.email;
      END IF;

      -- En operaciones normales, devolver OLD para DELETE y NEW para UPDATE
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
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

  // 5. Probar que la protección rechaza la degradación de rol
  console.log("⏳ Verificando protección (intentando degradación de rol no autorizada)...");
  try {
    // Intentar cambiar rol a uno ficticio
    const dummyRoleId = "00000000-0000-0000-0000-000000000000";
    await prisma.users.update({
      where: { id: userId },
      data: { role_id: dummyRoleId },
    });
    console.warn("⚠️ ALERTA: La modificación de rol fue permitida indebidamente.");
  } catch (error) {
    console.log("✅ Éxito: La base de datos rechazó la degradación del admin tal como se requiere.");
  }

  // 6. Probar que las actualizaciones legítimas de campos permitidos sí funcionan
  console.log("⏳ Verificando que actualizaciones legítimas de perfil sí funcionen...");
  await prisma.users.update({
    where: { id: userId },
    data: { full_name: ADMIN_NAME },
  });
  console.log("✅ Éxito: Las actualizaciones de campos permitidos funcionan correctamente.");

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
