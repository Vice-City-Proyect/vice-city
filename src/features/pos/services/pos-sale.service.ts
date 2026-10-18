/**
 * FT-06 / HU25 & HU26: Servicio de Venta Presencial y Previsualización POS
 * Vice City - Features: POS
 *
 * Implementa las Reglas de Negocio Oficiales:
 * - RN-017: Empleado vendedor (TICKET_SELLER) registra ventas presenciales en taquilla.
 * - RN-012: Misma fuente de verdad de disponibilidad y aforo que la web.
 * - RN-001 y RN-003: Respeta horario operativo (8:00 AM - 5:00 PM) y bloqueo por mantenimiento semanal.
 * - RN-004: Validación estricta de aforo por servicio.
 * - RN-010: Franjas ya iniciadas cobran tarifa completa de la hora y el QR vence al finalizar la franja.
 * - RN-019 & RN-020: Ticket digital con QR seguro al portador verificable en base de datos.
 * - HU26: Previsualización fiel 1:1, rechazo si la disponibilidad cambió e idempotencia ante doble clic.
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type {
  CreatePosSaleParams,
  PosSaleResult,
  PosPreviewParams,
  PosPreviewResult,
} from "../types/pos.types";
import {
  ForbiddenPosAccessError,
  PosCapacityExceededError,
  PosAvailabilityChangedError,
  PosMaintenanceDayError,
  PosServiceNotFoundError,
  PosOperatingHoursError,
  PosPastSlotError,
} from "../errors/pos.errors";
import { checkMaintenanceDay } from "@/features/services/utils/colombian-holidays.util";

export interface PosSaleServiceDependencies {
  findSellerByIdFn?: (sellerId: string) => Promise<any | null>;
  findServiceByIdFn?: (serviceId: string) => Promise<any | null>;
  findActiveBookingsFn?: (serviceId: string, startAt: Date, endAt: Date) => Promise<any[]>;
  findExistingBookingByIdempotencyFn?: (idempotencyKey: string) => Promise<any | null>;
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
   * Valida permisos del vendedor, vigencia del servicio, horario y aforo común
   */
  private async validateCommonParameters(params: {
    sellerId: string;
    serviceId: string;
    startDate: Date;
    endDate: Date;
    now: Date;
  }) {
    const { sellerId, serviceId, startDate, endDate, now } = params;

    // 1. Rol de Vendedor
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

    // 2. Servicio activo
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

    // 3. Mantenimiento semanal (Lunes, o Martes si el lunes es festivo - RN-003)
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

    // 5. Franja ya finalizada vs Franja en curso (RN-010)
    if (endDate <= now) {
      throw new PosPastSlotError(
        "No es posible registrar ventas en una franja horaria que ya ha finalizado."
      );
    }

    const isStartedSlotPurchased = startDate <= now && now < endDate;

    // 6. Consultar ocupación actual
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

    return {
      seller,
      service,
      availableCapacity,
      isStartedSlotPurchased,
    };
  }

  /**
   * HU26 (Criterio 1): Previsualiza la venta y el ticket sin realizar mutaciones en la base de datos
   */
  async previewSale(params: PosPreviewParams): Promise<PosPreviewResult> {
    const {
      sellerId,
      clientName,
      clientId,
      serviceId,
      startAt,
      endAt,
      quantity,
      paymentMethod,
    } = params;

    const now = this.getNow();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const { seller, service, availableCapacity, isStartedSlotPurchased } =
      await this.validateCommonParameters({
        sellerId,
        serviceId,
        startDate,
        endDate,
        now,
      });

    if (quantity > availableCapacity) {
      throw new PosCapacityExceededError(
        `Aforo insuficiente para la cantidad solicitada. Disponibles: ${availableCapacity}, solicitados: ${quantity} (RN-004).`
      );
    }

    const durationHours = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
    );
    const unitPrice = Number(service.price);
    const totalAmount = unitPrice * durationHours * quantity;

    // Generar un previewId seguro para control de consistencia
    const previewId = crypto
      .createHash("sha256")
      .update(`${service.id}-${startDate.getTime()}-${clientId}-${quantity}-${totalAmount}`)
      .digest("hex")
      .slice(0, 16);

    return {
      previewId,
      sellerId: seller.id,
      sellerName: seller.full_name,
      clientName,
      clientId,
      serviceId: service.id,
      serviceName: service.name,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      quantity,
      unitPrice,
      totalAmount,
      currency: service.currency || "COP",
      paymentMethod,
      availableCapacity,
      isStartedSlotPurchased,
      expiresAtEndOfSlot: endDate.toISOString(),
    };
  }

  /**
   * HU25 & HU26: Registra y confirma la venta presencial en el POS, emitiendo el ticket QR
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
      idempotencyKey,
      previewAvailableCapacity,
    } = params;

    const now = this.getNow();
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    // 1. Criterio 4 (Caso Límite HU26): Idempotencia ante doble clic
    if (idempotencyKey) {
      let existingBooking: any = null;
      if (this.deps?.findExistingBookingByIdempotencyFn) {
        existingBooking = await this.deps.findExistingBookingByIdempotencyFn(idempotencyKey);
      } else {
        existingBooking = await prisma.bookings.findFirst({
          where: {
            metadata: { path: ["idempotency_key"], equals: idempotencyKey },
          },
          include: { tickets: true, payments: true, services: true },
        });
      }

      if (existingBooking && existingBooking.tickets && existingBooking.tickets.length > 0) {
        const ticket = existingBooking.tickets[0];
        const payment = existingBooking.payments?.[0];
        return {
          bookingId: existingBooking.id,
          ticketId: ticket.id,
          ticketCode: ticket.code,
          paymentId: payment?.id || "",
          amount: Number(existingBooking.total_amount),
          currency: existingBooking.services?.currency || "COP",
          clientName,
          clientId,
          serviceName: existingBooking.services?.name || "Servicio Deportivo",
          startAt: existingBooking.start_at.toISOString(),
          endAt: existingBooking.end_at.toISOString(),
          quantity: existingBooking.quantity,
          paymentMethod,
          status: "confirmed",
          sellerId,
          isStartedSlotPurchased: Boolean(existingBooking.metadata?.is_started_slot_purchased),
          isReused: true,
          qrPayload: {
            ticketCode: ticket.code,
            bookingId: existingBooking.id,
            validFrom: existingBooking.start_at.toISOString(),
            validUntil: existingBooking.end_at.toISOString(),
          },
        };
      }
    }

    // 2. Validación común
    const { seller, service, availableCapacity, isStartedSlotPurchased } =
      await this.validateCommonParameters({
        sellerId,
        serviceId,
        startDate,
        endDate,
        now,
      });

    // 3. Criterio 3 (Caso de Error HU26): La disponibilidad cambió entre previsualización y confirmación
    if (previewAvailableCapacity !== undefined && availableCapacity < quantity) {
      throw new PosAvailabilityChangedError(
        `La disponibilidad del servicio cambió entre la previsualización y la confirmación. Aforo restante disponible: ${availableCapacity}, solicitado: ${quantity}.`
      );
    }

    if (quantity > availableCapacity) {
      throw new PosCapacityExceededError(
        `Aforo insuficiente para la cantidad solicitada. Disponibles: ${availableCapacity}, solicitados: ${quantity} (RN-004).`
      );
    }

    // 4. Cálculo de tarifa
    const durationHours = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
    );
    const unitPrice = Number(service.price);
    const totalAmount = unitPrice * durationHours * quantity;

    // 5. Transacción atómica
    const executeSaleTransaction = async (tx: any) => {
      // Expirar atómicamente reservas pendientes con HOLD vencido en la BD
      if (typeof tx.bookings?.updateMany === "function") {
        await tx.bookings.updateMany({
          where: {
            status: { in: ["pending", "PENDING"] },
            expires_at: { lte: now },
          },
          data: {
            status: "expired",
            updated_at: now,
          },
        });
      }

      // a. Resolver usuario cliente
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

      // b. Crear reserva confirmed
      const bookingMetadata = {
        pos_sale: true,
        seller_id: seller.id,
        seller_name: seller.full_name,
        client_doc: clientId,
        client_name: clientName,
        payment_method: paymentMethod,
        is_started_slot_purchased: isStartedSlotPurchased,
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      };

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
          metadata: bookingMetadata,
        },
      });

      // c. Registrar pago
      const paymentRef = `POS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const payment = await tx.payments.create({
        data: {
          booking_id: booking.id,
          amount: totalAmount,
          currency: service.currency || "COP",
          method: paymentMethod,
          // 'approved': estado de pago exitoso que admite el CHECK payments_status_valid ('paid' no existe)
          status: "approved",
          provider: "pos_terminal",
          provider_reference: paymentRef,
          paid_at: now,
          raw_response: {
            seller_id: seller.id,
            client_id: clientId,
            channel: "POS_TAQUILLA",
            payment_method: paymentMethod,
            ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
          },
        },
      });

      // d. Generar Ticket con QR único al portador (RN-019, RN-020)
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
        isReused: false,
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
