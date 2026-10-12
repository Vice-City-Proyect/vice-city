/**
 * FT-06 / HU25: Servicio de Venta Presencial en POS para Empleados (RN-017)
 * Vice City - Features: POS
 *
 * Implementa las Reglas de Negocio Oficiales:
 * - RN-017: Empleado vendedor (TICKET_SELLER) registra ventas presenciales en taquilla.
 * - RN-012: Misma fuente de verdad de disponibilidad y aforo que la web.
 * - RN-001 y RN-003: Respeta horario operativo (8:00 AM - 5:00 PM) y bloqueo por mantenimiento semanal.
 * - RN-004: Validación estricta de aforo por servicio.
 * - RN-010: Franjas ya iniciadas cobran tarifa completa de la hora y el QR vence al finalizar la franja.
 * - Transacción atómica: Genera la reserva confirmada, el pago registrado y el ticket con QR.
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { CreatePosSaleParams, PosSaleResult } from "../types/pos.types";
import {
  ForbiddenPosAccessError,
  PosCapacityExceededError,
  PosMaintenanceDayError,
  PosServiceNotFoundError,
  PosOperatingHoursError,
  PosPastSlotError,
} from "../errors/pos.errors";
import { checkMaintenanceDay } from "@/features/services/utils/colombian-holidays.util";
import { getTodayBogotaString } from "@/features/services/utils/date-bogota.util";

export interface PosSaleServiceDependencies {
  findSellerByIdFn?: (sellerId: string) => Promise<any | null>;
  findServiceByIdFn?: (serviceId: string) => Promise<any | null>;
  findActiveBookingsFn?: (serviceId: string, startAt: Date, endAt: Date) => Promise<any[]>;
  transactionFn?: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  getCurrentTimeFn?: () => Date;
}

export class PosSaleService {
  private readonly deps?: PosSaleServiceDependencies;

  constructor(dependencies?: PosSaleServiceDependencies) {
    this.deps = dependencies;
  }

  private getNow(): Date {
    return this.deps?.getCurrentTimeFn ? this.deps.getCurrentTimeFn() : new Date();
  }

  /**
   * Registra una venta presencial en el POS, valida rol de taquillero, disponibilidad y emite el ticket
   */
  async processSale(params: CreatePosSaleParams): Promise<PosSaleResult> {
    const {
      sellerId,
      clientName,
      clientId,
      serviceId,
      startAt,
      endAt,
      quantity,
      paymentMethod,
      clientPhone,
      clientEmail,
      notes,
    } = params;

    const now = this.getNow();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    // 1. Criterio 3: Validación de Rol de Vendedor (TICKET_SELLER o ADMIN)
    let seller: any = null;
    if (this.deps?.findSellerByIdFn) {
      seller = await this.deps.findSellerByIdFn(sellerId);
    } else {
      seller = await prisma.users.findUnique({
        where: { id: sellerId },
        include: { roles: true },
      });
    }

    if (!seller) {
      throw new ForbiddenPosAccessError(
        "Acceso denegado: El usuario vendedor especificado no existe."
      );
    }

    const sellerRole = seller.roles?.name?.toUpperCase() || "";
    if (sellerRole !== "TICKET_SELLER" && sellerRole !== "ADMIN") {
      throw new ForbiddenPosAccessError(
        `Acceso denegado: Solo el personal con rol TICKET_SELLER o ADMIN puede registrar ventas en el POS. Rol actual: '${sellerRole || "SIN_ROL"}'.`
      );
    }

    // 2. Criterio 2: Validar Servicio y Estado Activo
    let service: any = null;
    if (this.deps?.findServiceByIdFn) {
      service = await this.deps.findServiceByIdFn(serviceId);
    } else {
      service = await prisma.services.findUnique({
        where: { id: serviceId },
      });
    }

    if (!service || !service.is_active) {
      throw new PosServiceNotFoundError(
        `El servicio con id '${serviceId}' no existe o no se encuentra activo.`
      );
    }

    // 3. Criterio 2: Mantenimiento semanal (Lunes, o Martes si el lunes es festivo - RN-003)
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(startDate);
    const maintenanceCheck = checkMaintenanceDay(dateStr);
    if (maintenanceCheck.isMaintenance) {
      throw new PosMaintenanceDayError(
        `No es posible realizar ventas: ${maintenanceCheck.reason} (RN-003).`
      );
    }

    // 4. Horario operativo oficial de 8:00 AM a 5:00 PM (RN-001)
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();
    if (startHour < 8 || endHour > 17 || (endHour === 17 && endDate.getMinutes() > 0)) {
      throw new PosOperatingHoursError(
        "La franja solicitada excede el horario operativo del complejo deportivo (8:00 AM a 5:00 PM - RN-001)."
      );
    }

    // 5. Criterio 4 (Caso Límite): Franja ya finalizada vs Franja en curso (RN-010)
    if (endDate <= now) {
      throw new PosPastSlotError(
        "No es posible registrar ventas en una franja horaria que ya ha finalizado."
      );
    }

    const isStartedSlotPurchased = startDate <= now && now < endDate;

    // 6. Criterio 2: Misma disponibilidad y aforo que la web (RN-004 y RN-012)
    let activeBookings: any[] = [];
    if (this.deps?.findActiveBookingsFn) {
      activeBookings = await this.deps.findActiveBookingsFn(serviceId, startDate, endDate);
    } else {
      activeBookings = await prisma.bookings.findMany({
        where: {
          service_id: serviceId,
          start_at: { lt: endDate },
          end_at: { gt: startDate },
          status: { in: ["confirmed", "pending"] },
        },
      });
    }

    // Filtrar cupos ocupados (excluyendo holds vencidos)
    const occupiedCapacity = activeBookings.reduce((sum, b) => {
      if (b.status === "confirmed") {
        return sum + b.quantity;
      }
      if (b.status === "pending" && b.expires_at && new Date(b.expires_at) > now) {
        return sum + b.quantity;
      }
      return sum;
    }, 0);

    const availableCapacity = Math.max(0, service.capacity - occupiedCapacity);
    if (quantity > availableCapacity) {
      throw new PosCapacityExceededError(
        `Aforo insuficiente para la cantidad solicitada. Disponibles: ${availableCapacity}, solicitados: ${quantity} (RN-004).`
      );
    }

    // 7. Cálculo de valor a cobrar (Tarifa completa de la hora según RN-010)
    const durationHours = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
    );
    const unitPrice = Number(service.price);
    const totalAmount = unitPrice * durationHours * quantity;

    // 8. Criterio 1: Transacción atómica de Venta Presencial (Reserva + Pago + Ticket)
    const executeSaleTransaction = async (tx: any) => {
      // a. Resolver usuario cliente en taquilla
      let clientUser = await tx.users.findFirst({
        where: { document_id: clientId },
      });

      if (!clientUser) {
        const clientRole = await tx.roles.findFirst({
          where: { name: "CLIENT" },
        });

        clientUser = await tx.users.create({
          data: {
            full_name: clientName,
            document_id: clientId,
            email: clientEmail || `pos_${clientId.replace(/\s+/g, "")}@vicecity.local`,
            phone: clientPhone || null,
            role_id: clientRole?.id || seller.role_id,
            is_active: true,
          },
        });
      }

      // b. Crear la reserva directamente en estado 'confirmed'
      const booking = await tx.bookings.create({
        data: {
          user_id: clientUser.id,
          service_id: service.id,
          start_at: startDate,
          end_at: endDate,
          quantity,
          total_amount: totalAmount,
          status: "confirmed",
          notes: notes || `Venta POS en taquilla por empleado ${seller.full_name}`,
          metadata: {
            pos_sale: true,
            seller_id: seller.id,
            seller_name: seller.full_name,
            client_doc: clientId,
            client_name: clientName,
            payment_method: paymentMethod,
            is_started_slot_purchased: isStartedSlotPurchased,
          },
        },
      });

      // c. Registrar el pago inmediato como 'paid'
      const paymentRef = `POS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const payment = await tx.payments.create({
        data: {
          booking_id: booking.id,
          amount: totalAmount,
          currency: service.currency || "COP",
          method: paymentMethod,
          status: "paid",
          provider: "pos_terminal",
          provider_reference: paymentRef,
          paid_at: now,
          raw_response: {
            seller_id: seller.id,
            client_id: clientId,
            channel: "POS_TAQUILLA",
            payment_method: paymentMethod,
          },
        },
      });

      // d. Generar el Ticket Digital con QR seguro
      // El QR vence exactamente al final de la franja horaria (endDate) según RN-010
      const secureTicketCode = crypto.randomUUID().replace(/-/g, "").toUpperCase();
      const ticket = await tx.tickets.create({
        data: {
          booking_id: booking.id,
          code: secureTicketCode,
          holder_name: clientName,
          status: "valid",
          valid_from: startDate,
          valid_until: endDate,
          metadata: {
            pos_sale: true,
            seller_id: seller.id,
            client_doc: clientId,
            is_started_slot_purchased: isStartedSlotPurchased,
            qr_payload: {
              ticketCode: secureTicketCode,
              bookingId: booking.id,
              validFrom: startDate.toISOString(),
              validUntil: endDate.toISOString(),
            },
          },
        },
      });

      return {
        bookingId: booking.id,
        ticketId: ticket.id,
        ticketCode: ticket.code,
        paymentId: payment.id,
        amount: totalAmount,
        currency: service.currency || "COP",
        clientName,
        clientId,
        serviceName: service.name,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        quantity,
        paymentMethod,
        status: "confirmed" as const,
        sellerId: seller.id,
        isStartedSlotPurchased,
        qrPayload: {
          ticketCode: ticket.code,
          bookingId: booking.id,
          validFrom: startDate.toISOString(),
          validUntil: endDate.toISOString(),
        },
      };
    };

    if (this.deps?.transactionFn) {
      return this.deps.transactionFn(executeSaleTransaction);
    } else {
      return prisma.$transaction(executeSaleTransaction);
    }
  }
}

export const posSaleService = new PosSaleService();
