/**
 * Servicio de disponibilidad de reservas: verifica aforo y franjas ocupadas
 * antes de crear una reserva (PREVENCIÓN DE SOBREVENTA).
 *
 * Reglas de negocio aplicadas:
 * - Operación: 8:00 AM – 5:00 PM; lunes y martes post-mantenimiento cerrados.
 * - Anticipación máxima: 15 días (20 días para piscina completa).
 * - La reserva siempre debe ser futura (hasta 1 segundo antes del inicio).
 * - Duraciones de 1 a 9 horas en horas enteras.
 * - Modalidad EXCLUSIVE_RESERVATION: aforo efectivo 1 (no se puede co-reservar).
 * - Modalidad PER_PERSON_HOUR: aforo efectivo = service.capacity.
 * - Las reservas PENDING con HOLD vencido (10 min) no ocupan la franja.
 */

import type { services } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  isWithinOperatingHours,
  isMaintenanceDay,
  MAX_ADVANCE_DAYS_NORMAL,
  MAX_ADVANCE_DAYS_FULL_POOL,
} from "@/lib/schedule";
import { computeDurationHours, isFullPool } from "@/features/payments/lib/pricing";
import {
  OperatingHoursError,
  MaintenanceDayClosedError,
  AdvanceWindowExceededError,
  DurationLimitError,
  CapacityExceededError,
  SlotUnavailableError,
} from "../errors/reservations.errors";

export interface AvailabilityDeps {
  /**
   * Cliente de datos. Acepta tanto el PrismaClient completo como un cliente de
   * transacción (`tx`) mediante tipado estructural (solo usa `bookings.findMany`).
   */
  db?: AvailabilityDb;
  /** Función de conteo de reservas activas solapadas (inyectable para tests) */
  findOverlappingBookings?: (params: {
    serviceId: string;
    startAt: Date;
    endAt: Date;
    excludeBookingId?: string;
  }) => Promise<any[]>;
}

/** Superficie mínima de datos requerida por el servicio de disponibilidad. */
export interface AvailabilityDb {
  bookings: {
    findMany: (args: any) => Promise<any[]>;
  };
}

export interface AvailabilityInput {
  service: services;
  startAt: Date;
  endAt: Date;
  quantity: number;
  excludeBookingId?: string;
}

export interface AvailabilityResult {
  available: boolean;
  serviceId: string;
  modality: "PER_PERSON_HOUR" | "EXCLUSIVE_RESERVATION";
  /** Aforo efectivo para esta franja: 1 si es exclusiva, si no service.capacity */
  effectiveCapacity: number;
  /** Cantidad solicitada */
  requestedCapacity: number;
  /** Cantidad de cupos ocupados por reservas activas (no vencidas) */
  occupiedCapacity: number;
  remainingCapacity: number;
  conflicts: number;
}

export class AvailabilityService {
  private db: AvailabilityDb;
  private findOverlappingBookings: NonNullable<AvailabilityDeps["findOverlappingBookings"]>;

  constructor(deps: AvailabilityDeps = {}) {
    this.db = deps.db ?? defaultPrisma;
    this.findOverlappingBookings =
      deps.findOverlappingBookings ?? this.defaultFindOverlappingBookings;
  }

  private defaultFindOverlappingBookings = async (params: {
    serviceId: string;
    startAt: Date;
    endAt: Date;
    excludeBookingId?: string;
  }): Promise<any[]> => {
    return this.db.bookings.findMany({
      where: {
        service_id: params.serviceId,
        status: { in: ["pending", "confirmed"] },
        start_at: { lt: params.endAt },
        end_at: { gt: params.startAt },
      },
    });
  };

  private getModality(service: services): "PER_PERSON_HOUR" | "EXCLUSIVE_RESERVATION" {
    const meta = (service.metadata as Record<string, any>) || {};
    return meta.modality === "PER_PERSON_HOUR" ? "PER_PERSON_HOUR" : "EXCLUSIVE_RESERVATION";
  }

  private toHHMM(date: Date): string {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  /**
   * Valida reglas de ventana, horario y duración. Lanza los errores de dominio.
   */
  assertReservationWindow(input: AvailabilityInput): void {
    const { service, startAt, endAt, quantity } = input;

    if (!service.is_active) {
      throw new SlotUnavailableError("El servicio no se encuentra disponible para reserva");
    }

    // 1. La reserva debe ser futura (se permite hasta 1 segundo antes del inicio)
    if (startAt.getTime() <= now().getTime()) {
      throw new SlotUnavailableError("La reserva debe tener una fecha/hora futura");
    }

    // 2. Horario de operación
    if (
      !isWithinOperatingHours({
        start: this.toHHMM(startAt),
        end: this.toHHMM(endAt),
      })
    ) {
      throw new OperatingHoursError();
    }

    // 3. Día de mantenimiento (lunes). El flag de feriado queda desactivado
    //    por defecto, igual que en el flujo POS existente (lib/schedule.ts).
    const dateOnly = toDateOnly(startAt);
    if (isMaintenanceDay(dateOnly)) {
      throw new MaintenanceDayClosedError();
    }

    // 4. Duración 1..9 horas enteras
    let durationHours: number;
    try {
      durationHours = computeDurationHours(startAt, endAt);
    } catch {
      throw new DurationLimitError();
    }

    // 5. Anticipación máxima (15 días normal, 20 si es piscina completa)
    const modality = this.getModality(service);
    const fullPool = isFullPool(quantity, service.capacity);
    const maxAdvanceDays =
      modality === "PER_PERSON_HOUR" && fullPool
        ? MAX_ADVANCE_DAYS_FULL_POOL
        : MAX_ADVANCE_DAYS_NORMAL;

    const maxStart = new Date(now().getTime() + maxAdvanceDays * 24 * 3600 * 1000);
    if (startAt.getTime() > maxStart.getTime()) {
      throw new AdvanceWindowExceededError(
        `La reserva supera el límite de ${maxAdvanceDays} días de anticipación`
      );
    }

    void durationHours;
  }

  /**
   * Verifica falta de cupo y sobreventa dentro de la franja.
   */
  async checkAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    const { service, startAt, endAt, quantity: rawQuantity, excludeBookingId } = input;

    const modality = this.getModality(service);
    const effectiveCapacity = modality === "PER_PERSON_HOUR" ? service.capacity : 1;
    const requestedCapacity = modality === "PER_PERSON_HOUR" ? Math.max(1, Math.floor(rawQuantity)) : 1;

    const bookings = await this.findOverlappingBookings({
      serviceId: service.id,
      startAt,
      endAt,
      excludeBookingId,
    });

    // Descartar reservas PENDING cuyo HOLD (10 min) ya venció: no ocupan la franja.
    const activeBookings = bookings.filter((b) => {
      if (b.id && excludeBookingId && b.id === excludeBookingId) return false;
      if (b.status === "pending") {
        if (!b.expires_at) return true;
        return new Date(b.expires_at).getTime() > now().getTime();
      }
      return true;
    });

    // EXCLUSIVE_RESERVATION: cada reserva consume 1 cupo del recurso completo.
    // PER_PERSON_HOUR: cada reserva consume su cantidad de personas.
    const occupiedCapacity =
      modality === "PER_PERSON_HOUR"
        ? activeBookings.reduce((acc, b) => acc + (Number(b.quantity) || 1), 0)
        : Math.min(activeBookings.length, effectiveCapacity);

    const remainingCapacity = Math.max(0, effectiveCapacity - occupiedCapacity);
    const available = requestedCapacity <= remainingCapacity;

    return {
      available,
      serviceId: service.id,
      modality,
      effectiveCapacity,
      requestedCapacity,
      occupiedCapacity,
      remainingCapacity,
      conflicts: activeBookings.length,
    };
  }

  /**
   * Combina validación de ventana + aforo, lanzando el error de dominio adecuado.
   */
  async assertAvailable(input: AvailabilityInput): Promise<AvailabilityResult> {
    this.assertReservationWindow(input);
    const result = await this.checkAvailability(input);
    if (!result.available) {
      throw new CapacityExceededError(
        `No hay cupos disponibles para la cantidad solicitada (disponibles: ${result.remainingCapacity})`
      );
    }
    return result;
  }

  static getModality(service: services): "PER_PERSON_HOUR" | "EXCLUSIVE_RESERVATION" {
    const meta = (service.metadata as Record<string, any>) || {};
    return meta.modality === "PER_PERSON_HOUR" ? "PER_PERSON_HOUR" : "EXCLUSIVE_RESERVATION";
  }
}

export const availabilityService = new AvailabilityService();

/** Punto único de reloj para facilitar pruebas y revisión. */
export function now(): Date {
  return new Date();
}

/** 'YYYY-MM-DD' a partir de un Date, en fecha local. */
export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}