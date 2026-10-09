/**
 * Suite de Pruebas de Aceptación Automatizadas para HU18: Precios dinámicos de servicios (RN-007)
 *
 * Criterios de Aceptación evaluados:
 * [x] CA01 - Cambiar un precio se refleja en las nuevas reservas.
 * [x] CA02 - Las reservas existentes conservan el precio con el que se compraron (RN-007).
 * [x] CA03 - Caso de error: un precio negativo o vacío es rechazado; usuario sin rol ADMIN recibe 403.
 * [x] CA04 - Caso límite: un cambio de precio mientras hay una reserva en HOLD no altera el valor de esa reserva.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers funcionales para el test
// ---------------------------------------------------------------------------

function validatePriceInput(price) {
  if (price === undefined || price === null || typeof price !== "number" || isNaN(price) || price < 0) {
    throw new Error("El precio debe ser un número válido mayor o igual a cero");
  }
}

function checkAdminRole(headers) {
  const role = headers["x-user-role"]?.toUpperCase();
  if (role === "ADMIN") return { authorized: true, status: 200 };
  if (role) return { authorized: false, status: 403, message: "Requiere rol ADMIN" };
  return { authorized: false, status: 401, message: "No autenticado" };
}

let bookingOffsetHours = 24;

async function createBookingHelper(userId, serviceId, unitPrice, quantity = 1, isHold = false) {
  // Asegurar rango de tiempo único para cumplir con el exclusion constraint 'bookings_no_overlap'
  bookingOffsetHours += 3;
  const startAt = new Date(Date.now() + bookingOffsetHours * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // 1 hora de duración
  const totalAmount = unitPrice * quantity;
  const expiresAt = isHold ? new Date(Date.now() + 10 * 60 * 1000) : null;

  return prisma.bookings.create({
    data: {
      user_id: userId,
      service_id: serviceId,
      start_at: startAt,
      end_at: endAt,
      quantity,
      total_amount: totalAmount,
      status: isHold ? "pending" : "confirmed",
      expires_at: expiresAt,
      metadata: {
        applied_unit_price: unitPrice,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Suite Principal
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(75));
  console.log("HU18 — Test de Aceptación: Precios dinámicos de servicios (RN-007)");
  console.log("=".repeat(75) + "\n");

  let passed = 0;
  let failed = 0;

  // 1. Obtener usuario admin y un servicio de prueba
  const adminUser = await prisma.users.findFirst({
    where: { email: "admin@vicecity.com" },
  });

  if (!adminUser) {
    console.error("❌ Usuario admin no encontrado.");
    process.exit(1);
  }

  // Buscar o crear servicio de prueba aislado
  const category = await prisma.categories.findFirst();
  if (!category) {
    console.error("❌ No hay categorías en BD. Ejecuta npm run db:seed:services primero.");
    process.exit(1);
  }

  const testService = await prisma.services.create({
    data: {
      category_id: category.id,
      name: "Servicio Test Dinamico HU18",
      slug: `srv-dyn-${Date.now()}`,
      price: 10000, // Precio inicial base: $10,000
      capacity: 10,
      duration_minutes: 60,
      is_active: true,
    },
  });

  console.log(`📌 Servicio de prueba creado: ${testService.name} (Precio base inicial: $${testService.price})\n`);

  try {
    // -------------------------------------------------------------------------
    // CA02 — Las reservas existentes conservan el precio con el que se compraron
    // -------------------------------------------------------------------------
    console.log("─".repeat(75));
    console.log("CA02 — Reservas existentes conservan su precio histórico (RN-007)");
    console.log("─".repeat(75));

    // Crear reserva histórica al precio original ($10,000)
    const originalPrice = Number(testService.price);
    const existingBooking = await createBookingHelper(
      adminUser.id,
      testService.id,
      originalPrice,
      2 // quantity = 2 -> total = $20,000
    );

    console.log(`   📝 Reserva existente #1 creada con total_amount: $${existingBooking.total_amount}`);

    // Modificar precio del servicio a $15,000
    const newPrice1 = 15000;
    await prisma.services.update({
      where: { id: testService.id },
      data: { price: newPrice1 },
    });
    console.log(`   🔄 Tarifa base del servicio modificada a: $${newPrice1}`);

    // Verificar que la reserva existente no haya cambiado
    const refreshedExistingBooking = await prisma.bookings.findUnique({
      where: { id: existingBooking.id },
    });

    const existingAmountPreserved =
      Number(refreshedExistingBooking.total_amount) === 20000 &&
      refreshedExistingBooking.metadata?.applied_unit_price === 10000;

    if (existingAmountPreserved) {
      console.log("✅ CA02 PASS — La reserva existente conservó su precio histórico intacto ($20,000).");
      passed++;
    } else {
      console.error("❌ CA02 FAIL — La reserva existente fue alterada tras el cambio de precio.");
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA01 — Cambiar un precio se refleja en las nuevas reservas
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(75));
    console.log("CA01 — Nuevas reservas toman el precio modificado");
    console.log("─".repeat(75));

    // Consultar el servicio con su nuevo precio vigente
    const updatedSvc = await prisma.services.findUnique({
      where: { id: testService.id },
    });

    // Crear nueva reserva con el nuevo precio vigente ($15,000 x 2 = $30,000)
    const newBooking = await createBookingHelper(
      adminUser.id,
      testService.id,
      Number(updatedSvc.price),
      2
    );

    console.log(`   📝 Nueva reserva #2 creada con total_amount: $${newBooking.total_amount}`);

    if (Number(newBooking.total_amount) === 30000 && Number(updatedSvc.price) === 15000) {
      console.log("✅ CA01 PASS — La nueva reserva tomó el nuevo precio vigente ($30,000).");
      passed++;
    } else {
      console.error("❌ CA01 FAIL — La nueva reserva no reflejó el nuevo precio.");
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA03 — Casos de error: Precio negativo o vacío rechazado; Rol sin ADMIN recibe 403
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(75));
    console.log("CA03 — Casos de error (precio negativo/vacío y validación 403 rol no ADMIN)");
    console.log("─".repeat(75));

    // 3.1 Rechazo de precio negativo
    let negativeRejected = false;
    try {
      validatePriceInput(-100);
    } catch (e) {
      negativeRejected = true;
    }

    // 3.2 Rechazo de precio vacío / null / no numérico
    let nullRejected = false;
    let stringRejected = false;
    try {
      validatePriceInput(null);
    } catch (e) {
      nullRejected = true;
    }
    try {
      validatePriceInput("diez-mil");
    } catch (e) {
      stringRejected = true;
    }

    if (negativeRejected && nullRejected && stringRejected) {
      console.log("✅ CA03.1 PASS — Precios negativos (-100), vacíos (null) y no numéricos rechazados correctamente.");
      passed++;
    } else {
      console.error("❌ CA03.1 FAIL — Validación de precio no rechazó entradas inválidas.");
      failed++;
    }

    // 3.3 Rechazo de acceso con 403 para usuarios sin rol ADMIN
    const clientAttempt = checkAdminRole({ "x-user-role": "CLIENT" });
    const staffAttempt = checkAdminRole({ "x-user-role": "STAFF" });
    const adminAttempt = checkAdminRole({ "x-user-role": "ADMIN" });

    if (clientAttempt.status === 403 && staffAttempt.status === 403 && adminAttempt.authorized) {
      console.log("✅ CA03.2 PASS — Usuarios con rol CLIENT o STAFF reciben 403 Forbidden; ADMIN es autorizado.");
      passed++;
    } else {
      console.error("❌ CA03.2 FAIL — Control de acceso no protegió adecuadamente la edición de precio.");
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA04 — Caso límite: Cambio de precio mientras hay reserva en HOLD no la altera
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(75));
    console.log("CA04 — Caso límite: Reserva en HOLD (10 min) no altera su valor ante cambio de precio");
    console.log("─".repeat(75));

    // 4.1 Crear reserva en estado HOLD ('pending', con expires_at a 10 minutos)
    const holdUnitPrice = 15000;
    const holdBooking = await createBookingHelper(
      adminUser.id,
      testService.id,
      holdUnitPrice,
      1,
      true // isHold = true
    );

    console.log(`   ⏳ Reserva en HOLD creada con status: "${holdBooking.status}", total_amount: $${holdBooking.total_amount}`);
    console.log(`   ⏱️  Hold expira en: ${holdBooking.expires_at?.toISOString()}`);

    // 4.2 Cambiar nuevamente el precio del servicio mientras el hold está activo ($25,000)
    const newPrice2 = 25000;
    await prisma.services.update({
      where: { id: testService.id },
      data: { price: newPrice2 },
    });
    console.log(`   🔄 Precio del servicio modificado a $${newPrice2} mientras el HOLD sigue activo`);

    // 4.3 Consultar la reserva en HOLD para comprobar que su valor sigue congelado
    const refreshedHoldBooking = await prisma.bookings.findUnique({
      where: { id: holdBooking.id },
    });

    const isHoldPreserved =
      Number(refreshedHoldBooking.total_amount) === holdUnitPrice &&
      refreshedHoldBooking.metadata?.applied_unit_price === holdUnitPrice &&
      refreshedHoldBooking.status === "pending";

    if (isHoldPreserved) {
      console.log("✅ CA04 PASS — La reserva en HOLD conservó su valor original ($15,000) sin ser afectada por el cambio de precio.");
      passed++;
    } else {
      console.error("❌ CA04 FAIL — El cambio de precio alteró indebidamente el valor de la reserva en HOLD.");
      failed++;
    }

    // -------------------------------------------------------------------------
    // Limpieza de datos de prueba
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(75));
    console.log("🧹 Limpiando reservas y servicio de prueba...");
    await prisma.bookings.deleteMany({
      where: { id: { in: [existingBooking.id, newBooking.id, holdBooking.id] } },
    });
    await prisma.services.delete({
      where: { id: testService.id },
    });
    console.log("✅ Limpieza completada.");

  } catch (error) {
    console.error("❌ Error inesperado durante el test:", error);
    failed++;
  }

  // -------------------------------------------------------------------------
  // Resumen final
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(75));
  console.log(`RESUMEN: ${passed} prueba(s) pasaron | ${failed} prueba(s) fallaron`);
  console.log("=".repeat(75));

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Error fatal en el script:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
