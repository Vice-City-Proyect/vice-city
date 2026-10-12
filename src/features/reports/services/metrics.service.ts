/**
 * FT-08 / HU27: Servicio de Métricas de Ventas y Ocupación
 * Vice City - Features: Reports
 *
 * Criterios de Aceptación implementados:
 * - CA01: Las cifras coinciden con las reservas y pagos registrados en la base de datos.
 * - CA02: Cada filtro de período devuelve el rango correcto en America/Bogota.
 * - CA03: Solo accesible para administradores (coordinado con auth guard en la ruta).
 * - CA04: Caso límite: un período sin ventas devuelve ceros limpios, no error.
 *
 * Reglas de Negocio Oficiales:
 * - RN-002: Zona horaria America/Bogota (UTC-5) para todas las agrupaciones temporales.
 * - RN-016 & RN-017: Separación de canales de venta (Web vía Stripe vs POS en taquilla).
 * - Desacoplamiento e Inyección de Dependencias: Permite pruebas unitarias rápidas
 *   mediante mocks y consultas reales vía Prisma ORM.
 */

import { prisma } from "@/lib/prisma";
import type {
  MetricsPeriod,
  MetricsResponseData,
  RevenuePointData,
  ServiceOccupancyMetric,
  TopSalesDay,
  SimpleChartPoint,
} from "../types";
import {
  getDateRangeInBogota,
  getBogotaDateParts,
  SPANISH_DAY_NAMES,
  SPANISH_MONTH_SHORT_NAMES,
} from "../utils/date-range.util";

/**
 * Interfaces de dependencias para desacoplamiento y testing unitario
 */
export interface MetricsServiceDependencies {
  findBookingsFn?: (startDate: Date, endDate: Date) => Promise<any[]>;
  findPaymentsFn?: (startDate: Date, endDate: Date) => Promise<any[]>;
  findAllServicesFn?: () => Promise<any[]>;
}

export class MetricsService {
  private readonly deps?: MetricsServiceDependencies;

  constructor(dependencies?: MetricsServiceDependencies) {
    this.deps = dependencies;
  }

  /**
   * Genera el flujo temporal inicial (esqueleto en ceros) según el período seleccionado.
   * Compatible 1:1 con las gráficas de frontend (RevenueChart) y MOCK_REVENUE.
   */
  private initializeRevenueFlow(period: MetricsPeriod): RevenuePointData[] {
    switch (period) {
      case "day":
        // Franjas horarias operativas del complejo (8:00 AM - 5:00 PM)
        return [
          { label: "08:00", value: 0, webValue: 0, posValue: 0 },
          { label: "09:00", value: 0, webValue: 0, posValue: 0 },
          { label: "10:00", value: 0, webValue: 0, posValue: 0 },
          { label: "11:00", value: 0, webValue: 0, posValue: 0 },
          { label: "12:00", value: 0, webValue: 0, posValue: 0 },
          { label: "13:00", value: 0, webValue: 0, posValue: 0 },
          { label: "14:00", value: 0, webValue: 0, posValue: 0 },
          { label: "15:00", value: 0, webValue: 0, posValue: 0 },
          { label: "16:00", value: 0, webValue: 0, posValue: 0 },
        ];

      case "week":
        // Días de la semana en español (Lunes a Domingo)
        return [
          { label: "Lun", value: 0, webValue: 0, posValue: 0 },
          { label: "Mar", value: 0, webValue: 0, posValue: 0 },
          { label: "Mié", value: 0, webValue: 0, posValue: 0 },
          { label: "Jue", value: 0, webValue: 0, posValue: 0 },
          { label: "Vie", value: 0, webValue: 0, posValue: 0 },
          { label: "Sáb", value: 0, webValue: 0, posValue: 0 },
          { label: "Dom", value: 0, webValue: 0, posValue: 0 },
        ];

      case "month":
        // Semanas del mes
        return [
          { label: "Sem 1", value: 0, webValue: 0, posValue: 0 },
          { label: "Sem 2", value: 0, webValue: 0, posValue: 0 },
          { label: "Sem 3", value: 0, webValue: 0, posValue: 0 },
          { label: "Sem 4", value: 0, webValue: 0, posValue: 0 },
        ];

      case "year":
        // 12 meses del año
        return SPANISH_MONTH_SHORT_NAMES.map((m) => ({
          label: m,
          value: 0,
          webValue: 0,
          posValue: 0,
        }));
    }
  }

  /**
   * Identifica la etiqueta del flujo de ingresos correspondiente a una fecha/hora dada.
   */
  private getRevenueFlowLabel(date: Date, period: MetricsPeriod): string | null {
    const parts = getBogotaDateParts(date);

    if (period === "day") {
      const hourStr = `${String(parts.hour).padStart(2, "0")}:00`;
      return hourStr;
    }

    if (period === "week") {
      // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
      const dayMap: Record<number, string> = {
        1: "Lun",
        2: "Mar",
        3: "Mié",
        4: "Jue",
        5: "Vie",
        6: "Sáb",
        0: "Dom",
      };
      return dayMap[parts.dayOfWeek] || null;
    }

    if (period === "month") {
      // Agrupación en 4 semanas (1-7: Sem 1, 8-14: Sem 2, 15-21: Sem 3, 22+: Sem 4)
      if (parts.day <= 7) return "Sem 1";
      if (parts.day <= 14) return "Sem 2";
      if (parts.day <= 21) return "Sem 3";
      return "Sem 4";
    }

    if (period === "year") {
      // Mes 1 -> Ene (índice 0)
      return SPANISH_MONTH_SHORT_NAMES[parts.month - 1] || null;
    }

    return null;
  }

  /**
   * Obtiene las métricas consolidadas de ventas y ocupación para el período especificado.
   *
   * @param period Filtro de período: 'day' | 'week' | 'month' | 'year'
   * @param referenceDate Fecha de referencia opcional (por defecto hoy en Bogotá)
   */
  async getMetrics(
    period: MetricsPeriod,
    referenceDate: Date = new Date()
  ): Promise<MetricsResponseData> {
    // 1. CA02: Calcular rango exacto en America/Bogota
    const { startDate, endDate, metricsRange } = getDateRangeInBogota(period, referenceDate);

    // 2. Consultar servicios disponibles (para ocupación base y nombres)
    let servicesList: any[] = [];
    if (this.deps?.findAllServicesFn) {
      servicesList = await this.deps.findAllServicesFn();
    } else {
      servicesList = await prisma.services.findMany({
        include: { categories: true },
        orderBy: { name: "asc" },
      });
    }

    // 3. Consultar pagos registrados en el período con estado 'paid'
    let paymentsList: any[] = [];
    if (this.deps?.findPaymentsFn) {
      paymentsList = await this.deps.findPaymentsFn(startDate, endDate);
    } else {
      paymentsList = await prisma.payments.findMany({
        where: {
          status: "paid",
          paid_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          bookings: {
            include: {
              services: {
                include: { categories: true },
              },
            },
          },
        },
        orderBy: { paid_at: "asc" },
      });
    }

    // 4. Consultar reservas confirmadas o pagadas en el período
    let bookingsList: any[] = [];
    if (this.deps?.findBookingsFn) {
      bookingsList = await this.deps.findBookingsFn(startDate, endDate);
    } else {
      bookingsList = await prisma.bookings.findMany({
        where: {
          status: { in: ["confirmed", "paid"] },
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          payments: true,
          services: {
            include: { categories: true },
          },
        },
        orderBy: { created_at: "asc" },
      });
    }

    // 5. Consolidar eventos de venta e ingresos (evitando duplicar si hay pagos y bookings)
    // Para cada venta, identificamos: monto, canal (web/pos), fecha de venta y servicio.
    const revenueFlow = this.initializeRevenueFlow(period);
    const daySalesMap = new Map<
      string,
      { total: number; web: number; pos: number; count: number; dateStr: string; dayOfWeek: number }
    >();

    const serviceStatsMap = new Map<
      string,
      {
        service: any;
        bookedCount: number;
        revenue: number;
        webBookings: number;
        posBookings: number;
      }
    >();

    // Inicializar mapa de servicios con todos los servicios existentes (garantiza ceros limpios)
    for (const s of servicesList) {
      serviceStatsMap.set(s.id, {
        service: s,
        bookedCount: 0,
        revenue: 0,
        webBookings: 0,
        posBookings: 0,
      });
    }

    let totalRevenue = 0;
    let webRevenue = 0;
    let posRevenue = 0;
    let totalReservations = 0;
    let webReservations = 0;
    let posReservations = 0;

    // Procesar conjunto unificado de transacciones
    // Si existen pagos registrados en payments, son la fuente primaria de ingresos de HU24/HU25.
    // Si una reserva confirmada no tiene fila en payments (ej: registros históricos), se toma su total_amount.
    const processedBookingIds = new Set<string>();

    // a. Procesar pagos explícitos
    for (const payment of paymentsList) {
      const amount = Number(payment.amount) || 0;
      const booking = payment.bookings;
      const isPos =
        payment.provider === "pos_terminal" ||
        Boolean(booking?.metadata?.pos_sale) ||
        payment.method === "cash";

      const channel: "web" | "pos" = isPos ? "pos" : "web";
      const paidDate = payment.paid_at || payment.created_at || new Date();

      // Sumar ingresos
      totalRevenue += amount;
      if (channel === "pos") {
        posRevenue += amount;
      } else {
        webRevenue += amount;
      }

      // Si tiene reserva asociada, acumular estadísticas
      if (booking) {
        processedBookingIds.add(booking.id);
        totalReservations += 1;
        if (channel === "pos") {
          posReservations += 1;
        } else {
          webReservations += 1;
        }

        const serviceId = booking.service_id;
        const currentServiceStats = serviceStatsMap.get(serviceId);
        if (currentServiceStats) {
          currentServiceStats.bookedCount += booking.quantity || 1;
          currentServiceStats.revenue += amount;
          if (channel === "pos") {
            currentServiceStats.posBookings += 1;
          } else {
            currentServiceStats.webBookings += 1;
          }
        }
      }

      // Flujo de ingresos (Revenue Flow)
      const flowLabel = this.getRevenueFlowLabel(paidDate, period);
      if (flowLabel) {
        const point = revenueFlow.find((p) => p.label === flowLabel);
        if (point) {
          point.value += amount;
          if (channel === "pos") {
            point.posValue += amount;
          } else {
            point.webValue += amount;
          }
        }
      }

      // Agrupación por días para Top Sales Days
      const parts = getBogotaDateParts(paidDate);
      const existingDay = daySalesMap.get(parts.dateStr) || {
        total: 0,
        web: 0,
        pos: 0,
        count: 0,
        dateStr: parts.dateStr,
        dayOfWeek: parts.dayOfWeek,
      };
      existingDay.total += amount;
      if (channel === "pos") existingDay.pos += amount;
      else existingDay.web += amount;
      existingDay.count += 1;
      daySalesMap.set(parts.dateStr, existingDay);
    }

    // b. Procesar reservas confirmadas que no vinieron en la consulta de pagos (evitar duplicados)
    for (const booking of bookingsList) {
      if (processedBookingIds.has(booking.id)) {
        continue;
      }

      const amount = Number(booking.total_amount) || 0;
      const isPos = Boolean(booking.metadata?.pos_sale);
      const channel: "web" | "pos" = isPos ? "pos" : "web";
      const bookingDate = booking.created_at || new Date();

      totalRevenue += amount;
      totalReservations += 1;

      if (channel === "pos") {
        posRevenue += amount;
        posReservations += 1;
      } else {
        webRevenue += amount;
        webReservations += 1;
      }

      const serviceId = booking.service_id;
      const currentServiceStats = serviceStatsMap.get(serviceId);
      if (currentServiceStats) {
        currentServiceStats.bookedCount += booking.quantity || 1;
        currentServiceStats.revenue += amount;
        if (channel === "pos") {
          currentServiceStats.posBookings += 1;
        } else {
          currentServiceStats.webBookings += 1;
        }
      }

      // Flujo de ingresos
      const flowLabel = this.getRevenueFlowLabel(bookingDate, period);
      if (flowLabel) {
        const point = revenueFlow.find((p) => p.label === flowLabel);
        if (point) {
          point.value += amount;
          if (channel === "pos") {
            point.posValue += amount;
          } else {
            point.webValue += amount;
          }
        }
      }

      // Agrupación de días
      const parts = getBogotaDateParts(bookingDate);
      const existingDay = daySalesMap.get(parts.dateStr) || {
        total: 0,
        web: 0,
        pos: 0,
        count: 0,
        dateStr: parts.dateStr,
        dayOfWeek: parts.dayOfWeek,
      };
      existingDay.total += amount;
      if (channel === "pos") existingDay.pos += amount;
      else existingDay.web += amount;
      existingDay.count += 1;
      daySalesMap.set(parts.dateStr, existingDay);
    }

    // 6. Construir lista de Días de Mayor Venta (Top Sales Days)
    const topSalesDays: TopSalesDay[] = Array.from(daySalesMap.values())
      .map((d) => ({
        date: d.dateStr,
        dayName: SPANISH_DAY_NAMES[d.dayOfWeek] || d.dateStr,
        totalRevenue: d.total,
        webRevenue: d.web,
        posRevenue: d.pos,
        reservationsCount: d.count,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 7. Calcular Ocupación por Servicio y Ocupación Promedio
    // En Vice City, el complejo opera 9 horas diarias (8:00 AM - 5:00 PM = 9 franjas por día).
    let daysInPeriod = 1;
    if (period === "week") daysInPeriod = 6; // 6 días operativos (excluyendo mantenimiento lunes)
    if (period === "month") daysInPeriod = 26; // aprox días operativos al mes
    if (period === "year") daysInPeriod = 312; // aprox días operativos al año

    let totalOccupancyRates = 0;
    let activeServicesCount = 0;

    const occupancyByService: ServiceOccupancyMetric[] = [];
    const reservationsByService: SimpleChartPoint[] = [];
    const revenueDistribution: SimpleChartPoint[] = [];

    let topServiceRevenue = -1;
    let topServiceName = "N/A";

    for (const stats of Array.from(serviceStatsMap.values())) {
      const s = stats.service;
      const capacity = s.capacity || 1;
      const maxPossibleCapacity = capacity * 9 * daysInPeriod;

      // Tasa de ocupación: porcentaje de cupos reservados sobre la capacidad operativa máxima
      const occupancyRate =
        maxPossibleCapacity > 0
          ? Math.min(100, Math.round((stats.bookedCount / maxPossibleCapacity) * 100))
          : 0;

      if (s.is_active) {
        totalOccupancyRates += occupancyRate;
        activeServicesCount += 1;
      }

      occupancyByService.push({
        serviceId: s.id,
        serviceName: s.name,
        categoryName: s.categories?.name || "General",
        capacity,
        bookedCount: stats.bookedCount,
        occupancyRate,
        revenue: stats.revenue,
        webBookings: stats.webBookings,
        posBookings: stats.posBookings,
      });

      reservationsByService.push({
        label: s.name,
        value: stats.bookedCount,
      });

      revenueDistribution.push({
        label: s.name,
        value: stats.revenue,
      });

      if (stats.revenue > topServiceRevenue && stats.revenue > 0) {
        topServiceRevenue = stats.revenue;
        topServiceName = s.name;
      }
    }

    // Si no hubo facturación, topService queda "N/A" (CA04)
    if (topServiceRevenue <= 0 && servicesList.length > 0) {
      topServiceName = "N/A";
    }

    const averageOccupancy =
      activeServicesCount > 0 ? Math.round(totalOccupancyRates / activeServicesCount) : 0;

    // Determinar Top Day (Día de mayor venta)
    const topDay = topSalesDays.length > 0 ? topSalesDays[0].dayName : "N/A";

    // 8. Construir respuesta final unificada (CA01 y CA04)
    return {
      period,
      range: metricsRange,
      summary: {
        totalRevenue,
        webRevenue,
        posRevenue,
        totalReservations,
        webReservations,
        posReservations,
        topService: topServiceName,
        topDay,
        averageOccupancy,
      },
      revenueFlow,
      occupancyByService,
      reservationsByService,
      revenueDistribution,
      topSalesDays,
    };
  }
}

/**
 * Instancia singleton exportada por defecto
 */
export const metricsService = new MetricsService();

