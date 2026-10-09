/**
 * Motor de Disponibilidad y Aforo (FT-04 / HU20)
 * Vice City - Features: Services
 *
 * Implementa las Reglas de Negocio Oficiales:
 * - RN-001: Operación 8:00 AM a 5:00 PM (9 franjas de 1h).
 * - RN-002: Zona horaria America/Bogota para todos los cálculos.
 * - RN-003: Mantenimiento semanal (Lunes, o Martes si el lunes es festivo) = SIN DISPONIBILIDAD.
 * - RN-004: Aforo por servicio (fútbol: 11, micro: 11, múltiple: 11, gym: 20, húmeda: 10, piscinas: 50).
 * - RN-008: Anticipación máxima (normal: 15 días, piscina completa: 20 días).
 * - RN-009: Duración mínima 1h y máxima 9h continuas.
 * - RN-010: Franja ya iniciada se puede comprar a tarifa completa si no ha finalizado.
 * - RN-012: Misma fuente de verdad para Web y POS.
 */

import { prisma } from "@/lib/prisma";
import type {
  ServiceAvailabilityResult,
  TimeSlot,
  SlotStatus,
  ServiceSummary,
} from "../types/availability.types";
import {
  ServiceNotFoundError,
  AdvanceBookingLimitError,
  PastDateError,
  InvalidDateFormatError,
} from "../errors/availability.errors";
import {
  getTodayBogotaString,
  getDaysDifference,
  getDayOfWeekBogota,
  isTimeSlotCurrent,
  isTimeSlotPast,
} from "../utils/date-bogota.util";
import { checkMaintenanceDay } from "../utils/colombian-holidays.util";

export const OPERATING_HOURS = {
  open: "08:00",
  close: "17:00",
};

// 9 franjas horarias estándar de 1 hora
export const STANDARD_SLOTS = [
  { startTime: "08:00", endTime: "09:00" },
  { startTime: "09:00", endTime: "10:00" },
  { startTime: "10:00", endTime: "11:00" },
  { startTime: "11:00", endTime: "12:00" },
  { startTime: "12:00", endTime: "13:00" },
  { startTime: "13:00", endTime: "14:00" },
  { startTime: "14:00", endTime: "15:00" },
  { startTime: "15:00", endTime: "16:00" },
  { startTime: "16:00", endTime: "17:00" },
];

export interface AvailabilityServiceDependencies {
  findServiceByIdFn?: (serviceId: string) => Promise<any | null>;
  findBookingsForServiceDateFn?: (serviceId: string, dateStr: string) => Promise<any[]>;
  mockNowBogota?: { hours: number; minutes: number; dateStr?: string };
}

export class AvailabilityService {
  private findServiceByIdFn: (serviceId: string) => Promise<any | null>;
  private findBookingsForServiceDateFn: (serviceId: string, dateStr: string) => Promise<any[]>;
  private mockNowBogota?: { hours: number; minutes: number; dateStr?: string };

  constructor(dependencies: AvailabilityServiceDependencies = {}) {
    this.mockNowBogota = dependencies.mockNowBogota;

    this.findServiceByIdFn =
      dependencies.findServiceByIdFn ??
      (async (serviceId: string) => {
        return prisma.services.findFirst({
          where: { id: serviceId, is_active: true },
          include: { categories: true },
        });
      });

    this.findBookingsForServiceDateFn =
      dependencies.findBookingsForServiceDateFn ??
      (async (serviceId: string, dateStr: string) => {
        const startOfDay = new Date(`${dateStr}T00:00:00-05:00`);
        const endOfDay = new Date(`${dateStr}T23:59:59-05:00`);

        return prisma.bookings.findMany({
          where: {
            service_id: serviceId,
            start_at: { gte: startOfDay, lte: endOfDay },
            status: {
              in: ["confirmed", "pending"], // reservas confirmadas o en hold de pago
            },
          },
        });
      });
  }

  /**
   * Calcula la disponibilidad y aforo restante para un servicio y fecha específicos.
   *
   * @param serviceId UUID del servicio
   * @param dateStr Fecha en formato YYYY-MM-DD
   * @returns ServiceAvailabilityResult con la matriz de 9 franjas horarias y aforos
   */
  async getServiceAvailability(
    serviceId: string,
    dateStr: string
  ): Promise<ServiceAvailabilityResult> {
    // 1. Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new InvalidDateFormatError();
    }

    // 2. Consultar servicio vía ORM
    const serviceRecord = await this.findServiceByIdFn(serviceId);
    if (!serviceRecord) {
      throw new ServiceNotFoundError();
    }

    const service: ServiceSummary = {
      id: serviceRecord.id,
      name: serviceRecord.name,
      slug: serviceRecord.slug,
      capacity: serviceRecord.capacity,
      price: Number(serviceRecord.price),
      currency: serviceRecord.currency || "COP",
      duration_minutes: serviceRecord.duration_minutes || 60,
    };

    // 3. RN-008: Validar anticipación permitida
    const todayStr = this.mockNowBogota?.dateStr ?? getTodayBogotaString();
    const daysDiff = getDaysDifference(dateStr, todayStr);

    if (daysDiff < 0) {
      throw new PastDateError();
    }

    const isFullPool =
      service.slug.toLowerCase().includes("full-pool") ||
      service.slug.toLowerCase().includes("completa") ||
      service.duration_minutes >= 540;

    const maxAdvanceDays = isFullPool ? 20 : 15;
    if (daysDiff > maxAdvanceDays) {
      throw new AdvanceBookingLimitError(maxAdvanceDays);
    }

    // 4. RN-001 y RN-003: Validar día de mantenimiento semanal
    const dayOfWeek = getDayOfWeekBogota(dateStr);
    const maintenanceCheck = checkMaintenanceDay(dateStr);

    if (maintenanceCheck.isMaintenance) {
      // En día de mantenimiento, no hay disponibilidad para ningún servicio
      const maintenanceSlots: TimeSlot[] = STANDARD_SLOTS.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalCapacity: service.capacity,
        occupiedCapacity: 0,
        remainingCapacity: 0,
        status: "MAINTENANCE" as SlotStatus,
        isCurrentSlot: false,
        canBePurchased: false,
        price: service.price,
        currency: service.currency,
      }));

      return {
        service,
        date: dateStr,
        dayOfWeek,
        isMaintenanceDay: true,
        maintenanceReason: maintenanceCheck.reason,
        operatingHours: OPERATING_HOURS,
        slots: maintenanceSlots,
        summary: {
          totalSlots: maintenanceSlots.length,
          availableSlots: 0,
          isFullyBooked: true,
        },
      };
    }

    // 5. Consultar reservas existentes para el servicio y fecha vía ORM
    const existingBookings = await this.findBookingsForServiceDateFn(
      serviceId,
      dateStr
    );

    // 6. RN-004, RN-010: Calcular aforo restante y estado de cada franja horaria
    let availableSlotsCount = 0;

    const slots: TimeSlot[] = STANDARD_SLOTS.map((slot) => {
      // Calcular cupos ocupados en esta franja
      const occupiedCapacity = this.calculateOccupiedCapacity(
        slot.startTime,
        slot.endTime,
        dateStr,
        existingBookings
      );

      const remainingCapacity = Math.max(0, service.capacity - occupiedCapacity);

      // Evaluar si la franja ya terminó o está en curso (RN-010)
      const isPast = isTimeSlotPast(slot.endTime, dateStr, this.mockNowBogota);
      const isCurrent = isTimeSlotCurrent(
        slot.startTime,
        slot.endTime,
        dateStr,
        this.mockNowBogota
      );

      let status: SlotStatus;
      let canBePurchased = false;

      if (isPast) {
        status = "PAST";
        canBePurchased = false;
      } else if (isCurrent) {
        // RN-010: Si la franja ya inició pero no ha terminado, se puede comprar con tarifa completa de la hora
        if (remainingCapacity > 0) {
          status = "IN_PROGRESS";
          canBePurchased = true;
          availableSlotsCount++;
        } else {
          status = "FULL";
          canBePurchased = false;
        }
      } else {
        // Franja futura dentro de la jornada
        if (remainingCapacity > 0) {
          status = "AVAILABLE";
          canBePurchased = true;
          availableSlotsCount++;
        } else {
          status = "FULL";
          canBePurchased = false;
        }
      }

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalCapacity: service.capacity,
        occupiedCapacity,
        remainingCapacity,
        status,
        isCurrentSlot: isCurrent,
        canBePurchased,
        price: service.price, // Tarifa completa de 1h
        currency: service.currency,
      };
    });

    return {
      service,
      date: dateStr,
      dayOfWeek,
      isMaintenanceDay: false,
      operatingHours: OPERATING_HOURS,
      slots,
      summary: {
        totalSlots: slots.length,
        availableSlots: availableSlotsCount,
        isFullyBooked: availableSlotsCount === 0,
      },
    };
  }

  /**
   * Suma la cantidad de cupos ocupados por reservas que se traslapan con la franja [startTime, endTime].
   */
  private calculateOccupiedCapacity(
    slotStartTime: string,
    slotEndTime: string,
    dateStr: string,
    bookings: any[]
  ): number {
    const slotStart = new Date(`${dateStr}T${slotStartTime}:00-05:00`).getTime();
    const slotEnd = new Date(`${dateStr}T${slotEndTime}:00-05:00`).getTime();

    let totalOccupied = 0;

    for (const booking of bookings) {
      const bStart = new Date(booking.start_at).getTime();
      const bEnd = new Date(booking.end_at).getTime();

      // Comprobar si existe solapamiento: (bStart < slotEnd) && (bEnd > slotStart)
      if (bStart < slotEnd && bEnd > slotStart) {
        totalOccupied += booking.quantity || 1;
      }
    }

    return totalOccupied;
  }
}

// Instancia singleton por defecto
export const availabilityService = new AvailabilityService();

