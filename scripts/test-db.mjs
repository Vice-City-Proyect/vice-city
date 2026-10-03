import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Probando conexión a la base de datos con Prisma Client...");

  // 1. Consulta SQL cruda para verificar conectividad
  const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
  console.log("✅ Conexión exitosa a PostgreSQL:");
  console.log(dbInfo[0]);

  // 2. Consulta ORM a una tabla real (roles)
  const roles = await prisma.roles.findMany();
  console.log(`\n✅ Consulta ORM exitosa: Se encontraron ${roles.length} roles:`);
  console.table(roles.map((r) => ({ id: r.id, name: r.name, description: r.description })));
}

main()
  .catch((e) => {
    console.error("❌ Error al consultar la base de datos:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

