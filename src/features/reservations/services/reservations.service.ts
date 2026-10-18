/**
 * Servicio de creación de reservas (canal web / app).
 * Vice City - Features: Reservations
 *
 * Flujo:
 * 1. Carga el servicio y valida que esté activo.
 * 2. Calcula el precio CON descuentos aplicados del lado del servidor.
 * 3. Verifica disponibilidad (aforo + franjas + reglas de operación).
 * 4. Crea la reserva en estado PENDING (HOLD de 10 minutos) dentro de una
 *    transacción con advisory lock para prevenir sobreventa (concurrencia).
 */

import type { PrismaClient, services } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  calculatePricing,
  type PricingModality,
  type PricingResult,
} from "@/features/payments/lib/pricing";
import { HOLD_MINUTES } from "@/lib/schedule";
import {
  availabilityService,
  AvailabilityService,
} from "./availability.service";
import {
  ServiceNotFoundError,
  ServiceInactiveError,
} from "../errors/reservations.errors";

export interface CreateReservationInput {
  userId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  quantity?: number;
  scheduleId?: string | null;
  notes?: string | null;
}

export interface CreatedReservation {
  id: string;
  serviceId: string;
  serviceName: string;
  startAt: Date;
  endAt: Date;
  quantity: number;
  currency: string;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  status: "pending";
  expiresAt: Date;
  pricing: PricingResult;
}

export interface ReservationsServiceDeps {
  db?: PrismaClient;
  availability?: Pick<AvailabilityService, "assertAvailable">;
  /** Reloj inyectable para pruebas */
  nowFn?: () => Date;
}

function moduleNow(): Date {
  return new Date();
}

export class ReservationsService {
  private db: PrismaClient;
  private availability: Pick<AvailabilityService, "assertAvailable">;
  private nowFn: () => Date;

  constructor(deps: ReservationsServiceDeps = {}) {
    this.db = deps.db ?? defaultPrisma;
    this.availability = deps.availability ?? availabilityService;
    this.nowFn = deps.nowFn ?? moduleNow;
  }

  private getModality(service: services): PricingModality {
    const meta = (service.metadata as Record<string, any>) || {};
    return meta.modality === "PER_PERSON_HOUR" ? "PER_PERSON_HOUR" : "EXCLUSIVE_RESERVATION";
  }

  /**
   * Crea una reserva en estado PENDING con HOLD de exactamente 10 minutos.
   */
  async createPendingReservation(input: CreateReservationInput): Promise<CreatedReservation> {
    const { userId, serviceId, startAt, endAt, quantity = 1, scheduleId, notes } = input;

    if (!userId?.trim() || !serviceId?.trim()) {
      throw new ServiceNotFoundError("Usuario y servicio son obligatorios");
    }

    const service = await this.db.services.findUnique({ where: { id: serviceId } });
    if (!service) {
      throw new ServiceNotFoundError();
    }
    if (!service.is_active) {
      throw new ServiceInactiveError();
    }

    // Verificación de ventana y aforo (fuera de transacción: validación previa)
    await this.availability.assertAvailable({
      service,
      startAt,
      endAt,
      quantity,
    });

    const modality = this.getModality(service);
    const pricing = calculatePricing({
      unitPrice: Number(service.price),
      modality,
      quantity,
      startAt,
      endAt,
      capacity: service.capacity,
    });

    const expiresAt = new Date(this.nowFn().getTime() + HOLD_MINUTES * 60 * 1000);

    // Transacción con advisory lock por servicio para evitar sobreventa.
    const booking = await this.db.$transaction(async (tx) => {
      await this.acquireServiceLock(tx, serviceId);

      // Expirar atómicamente reservas pendientes con HOLD vencido en la BD
      // Esto libera la restricción de exclusión en PostgreSQL ("bookings_no_overlap")
      const currentNow = this.nowFn();
      if (typeof tx.bookings?.updateMany === "function") {
        await tx.bookings.updateMany({
          where: {
            status: { in: ["pending", "PENDING"] },
            expires_at: { lte: currentNow },
          },
          data: {
            status: "expired",
            updated_at: currentNow,
          },
        });
      }

      // Re-verificar disponibilidad dentro de la transacción (estado consonante).
      const txAvailability = new AvailabilityService({ db: tx });
      await txAvailability.assertAvailable({ service, startAt, endAt, quantity });

      return tx.bookings.create({
        data: {
          user_id: userId,
          service_id: serviceId,
          schedule_id: scheduleId || null,
          start_at: startAt,
          end_at: endAt,
          quantity,
          total_amount: pricing.totalAmount,
          status: "pending",
          expires_at: expiresAt,
          notes: notes || null,
          metadata: {
            service_name_at_booking: service.name,
            applied_unit_price: Number(service.price),
            modality,
            base_amount: pricing.baseAmount,
            discount_percent: pricing.discountPercent,
            discount_amount: pricing.discountAmount,
            discounted_unit_price: Math.round(
              pricing.totalAmount / (pricing.durationHours * (modality === "PER_PERSON_HOUR" ? Math.max(1, quantity) : 1))
            ),
          },
        },
        include: { services: true },
      });
    });

    return {
      id: booking.id,
      serviceId: booking.service_id,
      serviceName: booking.services?.name ?? service.name,
      startAt: booking.start_at,
      endAt: booking.end_at,
      quantity: booking.quantity,
      currency: "COP",
      baseAmount: pricing.baseAmount,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      status: "pending",
      expiresAt,
      pricing,
    };
  }

  /**
   * Advisory lock por servicio para serializar la creación de reservas
   * sobre el mismo recurso y evitar la sobreventa en concurrencia.
   */
  private async acquireServiceLock(tx: any, serviceId: string): Promise<void> {
    if (typeof tx?.$executeRaw === "function") {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${serviceId}))`;
    }
    // En mocks de pruebas sin $executeRaw el lock se omite (no hay concurrencia real).
  }
}

export const reservationsService = new ReservationsService();