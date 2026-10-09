/**
 * Servicio de Lógica de Negocio: Creación de Reservas y Retención (HOLD) de 10 Minutos (HU21 / RN-011)
 * Vice City - Features: Reservations
 *
 * Implementa las Reglas de Negocio Oficiales:
 * - RN-011: Retención exacta de 10 minutos (expires_at) mientras el cliente realiza el pago.
 * - Liberación automática: Si expira sin confirmación, el cupo queda disponible nuevamente.
 * - RN-006: Recurso físico inmutable (service_id, start_at, end_at fijos).
 * - RN-009: Duración mínima 1 hora y máxima 9 horas continuas.
 * - RN-012: Transacciones atómicas (prisma.$transaction) para control de aforo y concurrencia.
 * - Congelación de precio histórico (total_amount inmutable).
 */

import { prisma } from "@/lib/prisma";
import type {
  CreateHoldParams,
  HoldReservationResult,
  BookingDetails,
} from "../types/reservation.types";
import {
  SlotFullConflictError,
  InvalidDurationError,
  BookingNotFoundError,
} from "../errors/reservation.errors";
import {
  ServiceNotFoundError,
  OperatingHoursError,
  PastDateError,
  AdvanceBookingLimitError,
} from "@/features/services";
import {
  getDaysDifference,
  getTodayBogotaString,
} from "@/features/services/utils/date-bogota.util";
import { checkMaintenanceDay } from "@/features/services/utils/colombian-holidays.util";

export const HOLD_DURATION_MINUTES = 10;
export const HOLD_DURATION_MS = HOLD_DURATION_MINUTES * 60 * 1000;

export interface ReservationHoldServiceDependencies {
  findServiceByIdFn?: (serviceId: string) => Promise<any | null>;
  findActiveBookingsFn?: (serviceId: string, startAt: Date, endAt: Date, now: Date) => Promise<any[]>;
  createBookingFn?: (data: any) => Promise<any>;
  findBookingByIdFn?: (id: string) => Promise<any | null>;
  transactionFn?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  mockNow?: Date;
}

export class ReservationHoldService {
  private findServiceByIdFn?: (serviceId: string) => Promise<any | null>;
  private findActiveBookingsFn?: (serviceId: string, startAt: Date, endAt: Date, now: Date) => Promise<any[]>;
  private createBookingFn?: (data: any) => Promise<any>;
  private findBookingByIdFn?: (id: string) => Promise<any | null>;
  private transactionFn?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  private mockNow?: Date;

  constructor(dependencies: ReservationHoldServiceDependencies = {}) {
    this.findServiceByIdFn = dependencies.findServiceByIdFn;
    this.findActiveBookingsFn = dependencies.findActiveBookingsFn;
    this.createBookingFn = dependencies.createBookingFn;
    this.findBookingByIdFn = dependencies.findBookingByIdFn;
    this.transactionFn = dependencies.transactionFn;
    this.mockNow = dependencies.mockNow;
  }

  /**
   * Crea una nueva reserva con retención (HOLD) de 10 minutos (RN-011).
   * Operación 100% atómica con protección de concurrencia para evitar sobreventa.
   *
   * @param params Parámetros de la reserva
   * @returns HoldReservationResult con la reserva y tiempo de retención
   */
  async holdReservation(params: CreateHoldParams): Promise<HoldReservationResult> {
    const startDate = new Date(params.startAt);
    const endDate = new Date(params.endAt);
    const quantity = params.quantity && params.quantity > 0 ? params.quantity : 1;
    const now = this.mockNow ?? new Date();

    // 1. Validar fechas lógicas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Fechas de inicio o fin inválidas.");
    }
    if (endDate <= startDate) {
      throw new Error("La fecha de finalización debe ser posterior a la fecha de inicio.");
    }

    // 2. RN-009: Duración mínima 1h y máxima 9h continuas
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours < 1 || durationHours > 9) {
      throw new InvalidDurationError();
    }

    // 3. RN-001: Operación 8:00 AM a 5:00 PM (formato Bogotá UTC-5)
    const dateStr = startDate.toISOString().split("T")[0];
    const todayStr = this.mockNow ? this.mockNow.toISOString().split("T")[0] : getTodayBogotaString();

    const startHours = (startDate.getUTCHours() - 5 + 24) % 24;
    const endHours = (endDate.getUTCHours() - 5 + 24) % 24;

    if (startHours < 8 || endHours > 17 || (endHours === 17 && endDate.getUTCMinutes() > 0)) {
      throw new OperatingHoursError();
    }

    // 4. Anticipación (RN-008)
    const daysDiff = getDaysDifference(dateStr, todayStr);
    if (daysDiff < 0) {
      throw new PastDateError();
    }

    // 5. Mantenimiento semanal (RN-003)
    const maintenanceCheck = checkMaintenanceDay(dateStr);
    if (maintenanceCheck.isMaintenance) {
      throw new Error(maintenanceCheck.reason || "Complejo cerrado por mantenimiento semanal.");
    }

    // 6. Ejecución Atómica (RN-012)
    const executeInTransaction = async (tx: any) => {
      // 6.1. Obtener servicio vía ORM
      let service: any;
      if (this.findServiceByIdFn) {
        service = await this.findServiceByIdFn(params.serviceId);
      } else {
        service = await tx.services.findFirst({
          where: { id: params.serviceId, is_active: true },
        });
      }

      if (!service) {
        throw new ServiceNotFoundError();
      }

      // Validar anticipación según tipo de servicio (15 vs 20 días)
      const isFullPool =
        service.slug?.toLowerCase().includes("full-pool") ||
        service.slug?.toLowerCase().includes("completa") ||
        service.duration_minutes >= 540;
      const maxAdvance = isFullPool ? 20 : 15;
      if (daysDiff > maxAdvance) {
        throw new AdvanceBookingLimitError(maxAdvance);
      }

      // 6.2. Calcular cupos ocupados (reservas confirmed + reservas pending activas con hold vigentes)
      let activeBookings: any[];
      if (this.findActiveBookingsFn) {
        activeBookings = await this.findActiveBookingsFn(
          params.serviceId,
          startDate,
          endDate,
          now
        );
      } else {
        activeBookings = await tx.bookings.findMany({
          where: {
            service_id: params.serviceId,
            start_at: { lt: endDate },
            end_at: { gt: startDate },
            OR: [
              { status: { in: ["confirmed", "CONFIRMED"] } },
              {
                status: { in: ["pending", "PENDING"] },
                expires_at: { gt: now }, // Solo holds activos que no han expirado
              },
            ],
          },
        });
      }

      const occupiedCapacity = activeBookings.reduce(
        (sum, b) => sum + (b.quantity || 1),
        0
      );

      const availableCapacity = service.capacity - occupiedCapacity;

      // 6.3. Criterio 3 & 4: Validación de Aforo y Conflicto por Concurrencia
      if (quantity > availableCapacity) {
        throw new SlotFullConflictError();
      }

      // 6.4. Calcular Precio Histórico Congelado (Inmutable)
      const pricePerHour = Number(service.price);
      const totalAmount = pricePerHour * quantity * durationHours;

      // 6.5. Criterio 1: expires_at de 10 minutos exactos
      const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);

      const bookingData = {
        user_id: params.userId,
        service_id: params.serviceId,
        start_at: startDate,
        end_at: endDate,
        quantity,
        total_amount: totalAmount,
        status: "pending",
        expires_at: expiresAt,
        notes: params.notes || null,
        metadata: {
          service_name: service.name,
          price_per_hour: pricePerHour,
          hold_duration_minutes: HOLD_DURATION_MINUTES,
        },
      };

      let createdBooking: any;
      if (this.createBookingFn) {
        createdBooking = await this.createBookingFn(bookingData);
      } else {
        createdBooking = await tx.bookings.create({
          data: bookingData,
        });
      }

      const remainingSeconds = Math.max(
        0,
        Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
      );

      return {
        bookingId: createdBooking.id,
        userId: createdBooking.user_id,
        serviceId: createdBooking.service_id,
        serviceName: service.name,
        startAt: createdBooking.start_at.toISOString(),
        endAt: createdBooking.end_at.toISOString(),
        quantity: createdBooking.quantity,
        totalAmount: Number(createdBooking.total_amount),
        currency: service.currency || "COP",
        status: "pending" as const,
        expiresAt: expiresAt.toISOString(),
        remainingSeconds,
        metadata: (createdBooking.metadata as Record<string, any>) || {},
      };
    };

    if (this.transactionFn) {
      return this.transactionFn(executeInTransaction);
    }

    return prisma.$transaction(executeInTransaction);
  }

  /**
   * Consulta el estado de una reserva y los segundos restantes de su retención (HOLD).
   */
  async getBookingDetails(bookingId: string): Promise<BookingDetails> {
    const now = this.mockNow ?? new Date();

    let booking: any;
    if (this.findBookingByIdFn) {
      booking = await this.findBookingByIdFn(bookingId);
    } else {
      booking = await prisma.bookings.findUnique({
        where: { id: bookingId },
        include: { services: true },
      });
    }

    if (!booking) {
      throw new BookingNotFoundError();
    }

    const expiresAt = booking.expires_at ? new Date(booking.expires_at) : null;
    const isHoldExpired =
      booking.status.toLowerCase() === "pending" &&
      expiresAt !== null &&
      expiresAt.getTime() <= now.getTime();

    const remainingSeconds =
      expiresAt && !isHoldExpired
        ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
        : 0;

    return {
      id: booking.id,
      userId: booking.user_id,
      serviceId: booking.service_id,
      serviceName: booking.services?.name || booking.metadata?.service_name || "Servicio",
      startAt: new Date(booking.start_at).toISOString(),
      endAt: new Date(booking.end_at).toISOString(),
      quantity: booking.quantity,
      totalAmount: Number(booking.total_amount),
      currency: booking.services?.currency || "COP",
      status: isHoldExpired ? "expired" : booking.status,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      isHoldExpired,
      remainingSeconds,
      notes: booking.notes,
      createdAt: new Date(booking.created_at).toISOString(),
      updatedAt: new Date(booking.updated_at).toISOString(),
    };
  }
}

// Instancia singleton por defecto
export const reservationHoldService = new ReservationHoldService();

