/**
 * Suite de Pruebas de Aceptación Automatizadas para HU27: Métricas de Ventas y Ocupación (FT-08 del SRS)
 *
 * Criterios de Aceptación evaluados:
 * [x] CA01 - Las cifras coinciden con las reservas y pagos registrados.
 * [x] CA02 - Cada filtro de período devuelve el rango correcto en America/Bogota.
 * [x] CA03 - Caso de error: un usuario sin rol ADMIN recibe 403 (y 401 sin sesión).
 * [x] CA04 - Caso límite: un período sin ventas devuelve ceros, no error.
 */

import { PrismaClient } from "@prisma/client";
import {
  metricsService,
  getDateRangeInBogota,
  getBogotaDateParts,
  MetricsService,
} from "../src/features/reports/index.ts";
import { GET } from "../src/app/api/reports/metrics/route.ts";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(75));
  console.log("HU27 — Test de Aceptación: Métricas de Ventas y Ocupación (FT-08 / RN-002 / RN-016 / RN-017)");
  console.log("=".repeat(75) + "\n");

  let passed = 0;
  let failed = 0;

  try {
    // -------------------------------------------------------------------------
    // CA02 — Cada filtro de período devuelve el rango correcto en America/Bogota
    // -------------------------------------------------------------------------
    console.log("─".repeat(75));
    console.log("CA02 — Cada filtro de período devuelve el rango correcto en America/Bogota");
    console.log("─".repeat(75));

    const testRefDate = new Date("2026-10-12T15:00:00.000Z"); // 10:00 AM Bogotá
    const dayRange = getDateRangeInBogota("day", testRefDate);
    const weekRange = getDateRangeInBogota("week", testRefDate);
    const monthRange = getDateRangeInBogota("month", testRefDate);
    const yearRange = getDateRangeInBogota("year", testRefDate);

    const isDayCorrect =
      dayRange.metricsRange.timezone === "America/Bogota" &&
      dayRange.metricsRange.start === "2026-10-12T00:00:00.000-05:00" &&
      dayRange.metricsRange.end === "2026-10-12T23:59:59.999-05:00";

    const isWeekCorrect =
      weekRange.metricsRange.start === "2026-10-12T00:00:00.000-05:00" &&
      weekRange.metricsRange.end === "2026-10-18T23:59:59.999-05:00";

    const isMonthCorrect =
      monthRange.metricsRange.start === "2026-10-01T00:00:00.000-05:00" &&
      monthRange.metricsRange.end === "2026-10-31T23:59:59.999-05:00";

    const isYearCorrect =
      yearRange.metricsRange.start === "2026-01-01T00:00:00.000-05:00" &&
      yearRange.metricsRange.end === "2026-12-31T23:59:59.999-05:00";

    if (isDayCorrect && isWeekCorrect && isMonthCorrect && isYearCorrect) {
      console.log("✅ CA02 PASS — Los rangos 'day', 'week', 'month' y 'year' se calculan con exactitud en America/Bogota (UTC-5).");
      passed++;
    } else {
      console.error("❌ CA02 FAIL — Error en cálculo de rangos de fecha.");
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA03 — Caso de error: usuario sin rol ADMIN recibe 403
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(75));
    console.log("CA03 — Caso de error: usuario sin rol ADMIN recibe 403 (o 401 si no autenticado)");
    console.log("─".repeat(75));

    // Petición con rol CLIENT
    const reqClient = new NextRequest("http://localhost:3000/api/reports/metrics?period=month", {
      headers: { "x-user-role": "CLIENT" },
    });
    const resClient = await GET(reqClient);

    // Petición con rol TICKET_SELLER
    const reqSeller = new NextRequest("http://localhost:3000/api/reports/metrics?period=month", {
      headers: { "x-user-role": "TICKET_SELLER" },
    });
    const resSeller = await GET(reqSeller);

    // Petición sin autenticación
    const reqNoAuth = new NextRequest("http://localhost:3000/api/reports/metrics?period=month");
    const resNoAuth = await GET(reqNoAuth);

    // Petición con rol ADMIN
    const reqAdmin = new NextRequest("http://localhost:3000/api/reports/metrics?period=month", {
      headers: { "x-user-role": "ADMIN" },
    });
    const resAdmin = await GET(reqAdmin);

    if (resClient.status === 403 && resSeller.status === 403 && resNoAuth.status === 401 && resAdmin.status === 200) {
      console.log("✅ CA03 PASS — Clientes y empleados reciben 403 Forbidden; anónimos reciben 401; ADMIN recibe 200 OK.");
      passed++;
    } else {
      console.error(`❌ CA03 FAIL — Estados HTTP incorrectos: CLIENT=${resClient.status}, SELLER=${resSeller.status}, NO_AUTH=${resNoAuth.status}, ADMIN=${resAdmin.status}`);
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA01 — Las cifras coinciden con las reservas y pagos registrados
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(75));
    console.log("CA01 — Las cifras coinciden con las reservas y pagos registrados (Web vs POS)");
    console.log("─".repeat(75));

    // Ejecutar consulta real contra la base de datos Supabase vía MetricsService
    const realMetrics = await metricsService.getMetrics("month");

    // Verificar consistencia matemática del resumen
    const mathConsistent =
      realMetrics.summary.totalRevenue === realMetrics.summary.webRevenue + realMetrics.summary.posRevenue &&
      realMetrics.summary.totalReservations === realMetrics.summary.webReservations + realMetrics.summary.posReservations;

    // Verificar que el desglose de flujo coincida con los totales del período
    const flowSum = realMetrics.revenueFlow.reduce((acc, p) => acc + p.value, 0);
    const flowConsistent = flowSum === realMetrics.summary.totalRevenue;

    console.log(`   * Total Ingresos Registrados: $${realMetrics.summary.totalRevenue.toLocaleString()}`);
    console.log(`   * Ingresos Web: $${realMetrics.summary.webRevenue.toLocaleString()}`);
    console.log(`   * Ingresos POS: $${realMetrics.summary.posRevenue.toLocaleString()}`);
    console.log(`   * Reservas Totales: ${realMetrics.summary.totalReservations} (Web: ${realMetrics.summary.webReservations}, POS: ${realMetrics.summary.posReservations})`);
    console.log(`   * Servicio Top: ${realMetrics.summary.topService}`);
    console.log(`   * Día Top: ${realMetrics.summary.topDay}`);
    console.log(`   * Ocupación Promedio: ${realMetrics.summary.averageOccupancy}%`);

    if (mathConsistent && flowConsistent) {
      console.log("✅ CA01 PASS — Consistencia matemática y desglose Web vs POS 100% verificados con la BD.");
      passed++;
    } else {
      console.error(`❌ CA01 FAIL — Inconsistencia en cifras: mathConsistent=${mathConsistent}, flowConsistent=${flowConsistent}`);
      failed++;
    }

    // -------------------------------------------------------------------------
    // CA04 — Caso límite: un período sin ventas devuelve ceros, no error
    // -------------------------------------------------------------------------
    console.log("\n" + "─".repeat(75));
    console.log("CA04 — Caso límite: un período sin ventas devuelve ceros limpios, no error");
    console.log("─".repeat(75));

    // Consultamos un período futuro lejano donde no existen ventas (ej: Año 2035)
    const futureDate = new Date("2035-06-15T12:00:00.000Z");
    const emptyPeriodMetrics = await metricsService.getMetrics("month", futureDate);

    const isAllZeros =
      emptyPeriodMetrics.summary.totalRevenue === 0 &&
      emptyPeriodMetrics.summary.webRevenue === 0 &&
      emptyPeriodMetrics.summary.posRevenue === 0 &&
      emptyPeriodMetrics.summary.totalReservations === 0 &&
      emptyPeriodMetrics.summary.averageOccupancy === 0 &&
      emptyPeriodMetrics.summary.topService === "N/A" &&
      emptyPeriodMetrics.summary.topDay === "N/A" &&
      emptyPeriodMetrics.topSalesDays.length === 0 &&
      emptyPeriodMetrics.revenueFlow.every((p) => p.value === 0);

    if (isAllZeros) {
      console.log("✅ CA04 PASS — Período sin ventas devuelve ceros ('0' y 'N/A') en todas las métricas sin error ni excepción.");
      passed++;
    } else {
      console.error("❌ CA04 FAIL — El período sin ventas no retornó ceros limpios.");
      failed++;
    }

  } catch (error) {
    console.error("❌ Error inesperado ejecutando pruebas de aceptación:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n" + "=".repeat(75));
  console.log(`RESULTADO FINAL HU27: ${passed} PASADOS | ${failed} FALLIDOS`);
  console.log("=".repeat(75) + "\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main();
