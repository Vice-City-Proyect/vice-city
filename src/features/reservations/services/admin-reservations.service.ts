import type { PrismaClient, services } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import type {
  AdminReservationsQueryParams,
  UpdateAdminReservationInput,
} from "../schemas/admin-reservations.schema";
import {
  mapBookingToAdminDto,
  mapBookingToAdminDetailDto,
  toBogotaDateParts,
  type AdminReservationDto,
  type AdminReservationDetailDto,
} from "../dto/admin-reservation.dto";
import {
  BookingNotFoundError,
  InvalidDurationError,
} from "../errors/reservation.errors";
import {
  availabilityService as defaultAvailabilityService,
  AvailabilityService,
} from "./availability.service";
import {
  ReservationError,
} from "../errors/reservations.errors";

/**
 * Restricciones adicionales del listado (VCP-93): `userId` limita a las reservas de
 * un usuario (CLIENT); `dateFrom`/`dateTo` (YYYY-MM-DD, Bogotá) acotan el rango; `order`
 * ordena por fecha de inicio.
 */
export interface ReservationsListScope {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  order?: "asc" | "desc";
}

export interface AdminReservationsListResult {
  reservations: AdminReservationDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminReservationsServiceDeps {
  db?: PrismaClient | any;
  availability?: Pick<AvailabilityService, "assertAvailable">;
  nowFn?: () => Date;
}

export class AdminReservationsService {
  private db: PrismaClient | any;
  private availability: Pick<AvailabilityService, "assertAvailable">;
  private nowFn: () => Date;

  constructor(deps: AdminReservationsServiceDeps = {}) {
    this.db = deps.db ?? defaultPrisma;
    this.availability = deps.availability ?? defaultAvailabilityService;
    this.nowFn = deps.nowFn ?? (() => new Date());
  }

  /**
   * 1. Listado paginado con filtros y búsqueda administrativa
   */
  async listReservations(
    params: AdminReservationsQueryParams,
    scope: ReservationsListScope = {}
  ): Promise<AdminReservationsListResult> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtro por servicio
    if (params.serviceId) {
      where.service_id = params.serviceId;
    }

    // Filtro por estado
    if (params.status && params.status !== "ALL") {
      const cleanStatus = params.status.toLowerCase();
      if (cleanStatus === "cancelled") {
        where.status = "cancelled";
      } else if (cleanStatus === "pending") {
        where.status = "pending";
      } else if (
        cleanStatus === "confirmed" ||
        cleanStatus === "in_progress" ||
        cleanStatus === "finished"
      ) {
        // En base de datos estos estados operativos derivan de 'confirmed'
        where.status = "confirmed";
      }
    }

    // Filtro por fecha en zona horaria Bogotá (America/Bogota: UTC-5)
    if (params.date) {
      const startOfDay = new Date(`${params.date}T00:00:00-05:00`);
      const endOfDay = new Date(`${params.date}T23:59:59.999-05:00`);
      where.start_at = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Alcance por usuario y rango de fechas (VCP-93)
    if (scope.userId) {
      where.user_id = scope.userId;
    }
    if (scope.dateFrom || scope.dateTo) {
      where.start_at = {
        ...(scope.dateFrom && {
          gte: new Date(`${scope.dateFrom}T00:00:00-05:00`),
        }),
        ...(scope.dateTo && {
          lte: new Date(`${scope.dateTo}T23:59:59.999-05:00`),
        }),
      };
    }

    // Búsqueda por cliente (nombre o email) o por código de ticket
    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        {
          users: {
            full_name: {
              contains: term,
              mode: "insensitive",
            },
          },
        },
        {
          users: {
            email: {
              contains: term,
              mode: "insensitive",
            },
          },
        },
        {
          tickets: {
            some: {
              code: {
                contains: term,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    const [total, rawBookings] = await Promise.all([
      this.db.bookings.count({ where }),
      this.db.bookings.findMany({
        where,
        skip,
        take: limit,
        orderBy: { start_at: scope.order ?? "desc" },
        include: {
          services: {
            include: {
              categories: true,
            },
          },
          users: true,
          tickets: {
            include: {
              access_logs: true,
            },
          },
          payments: true,
        },
      }),
    ]);

    const now = this.nowFn();
    let reservations: AdminReservationDto[] = rawBookings.map((b: any) =>
      mapBookingToAdminDto(b, now)
    );

    // Si se especificó franja horaria (slot), filtrar por startTime en formato HH:mm
    if (params.slot) {
      reservations = reservations.filter((r: AdminReservationDto) => r.startTime === params.slot);
    }

    // Si se especificó estado operativo estricto IN_PROGRESS o FINISHED, filtrar
    if (params.status === "IN_PROGRESS" || params.status === "FINISHED") {
      reservations = reservations.filter((r: AdminReservationDto) => r.status === params.status);
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * 2. Detalle completo de una reserva por ID
   */
  async getReservationById(id: string): Promise<AdminReservationDetailDto> {
    const booking = await this.db.bookings.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            categories: true,
          },
        },
        users: true,
        tickets: {
          include: {
            access_logs: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new BookingNotFoundError(`La reserva con id ${id} no existe`);
    }

    return mapBookingToAdminDetailDto(booking, this.nowFn());
  }

  /**
   * 3. Actualización y Cancelación lógica de una reserva
   */
  async updateReservation(
    id: string,
    input: UpdateAdminReservationInput
  ): Promise<AdminReservationDetailDto> {
    const existing = await this.db.bookings.findUnique({
      where: { id },
      include: {
        services: true,
      },
    });

    if (!existing) {
      throw new BookingNotFoundError(`La reserva con id ${id} no existe`);
    }

    const now = this.nowFn();

    // Caso A: Cancelación lógica
    if (input.status === "CANCELLED" || input.cancellationReason) {
      const cancellationReason =
        input.cancellationReason || "Cancelada por el administrador";

      const updateData: any = {
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: cancellationReason,
      };

      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }

      if (this.db.$transaction) {
        await this.db.$transaction(async (tx: any) => {
          await tx.bookings.update({
            where: { id },
            data: updateData,
          });

          await tx.tickets.updateMany({
            where: { booking_id: id, status: "valid" },
            data: { status: "cancelled" },
          });
        });
      } else {
        await this.db.bookings.update({
          where: { id },
          data: updateData,
        });
        if (this.db.tickets?.updateMany) {
          await this.db.tickets.updateMany({
            where: { booking_id: id, status: "valid" },
            data: { status: "cancelled" },
          });
        }
      }

      return this.getReservationById(id);
    }

    // Caso B: Reprogramación de fecha / horario o actualización de asistentes / notas
    let newStartAt = existing.start_at;
    let newEndAt = existing.end_at;
    let datesChanged = false;

    if (input.date || input.startTime) {
      const currentStartParts = toBogotaDateParts(new Date(existing.start_at));
      const targetDate = input.date || currentStartParts.date;
      const targetStartTime = input.startTime || currentStartParts.time;

      newStartAt = new Date(`${targetDate}T${targetStartTime}:00-05:00`);

      if (input.endTime) {
        newEndAt = new Date(`${targetDate}T${input.endTime}:00-05:00`);
      } else {
        // Calcular duración original o duración del servicio
        const originalDurationMs =
          new Date(existing.end_at).getTime() -
          new Date(existing.start_at).getTime();
        const durationMs =
          originalDurationMs > 0
            ? originalDurationMs
            : (existing.services?.duration_minutes || 60) * 60 * 1000;
        newEndAt = new Date(newStartAt.getTime() + durationMs);
      }

      if (newStartAt.getTime() >= newEndAt.getTime()) {
        throw new InvalidDurationError(
          "La hora de inicio debe ser anterior a la hora de finalización"
        );
      }

      const durationHours = (newEndAt.getTime() - newStartAt.getTime()) / (1000 * 60 * 60);
      if (durationHours < 1 || durationHours > 9) {
        throw new InvalidDurationError("La duración de la reserva debe ser de entre 1 y 9 horas");
      }

      datesChanged = true;
    }

    const newQuantity = input.guests ?? existing.quantity;
    const quantityChanged = input.guests !== undefined && input.guests !== existing.quantity;

    // Si cambiaron las fechas, horas o cantidad, verificar disponibilidad excluyendo la propia reserva
    if (datesChanged || quantityChanged) {
      await this.availability.assertAvailable({
        service: existing.services,
        startAt: newStartAt,
        endAt: newEndAt,
        quantity: newQuantity,
        excludeBookingId: id,
      });
    }

    const dataToUpdate: any = {};
    if (datesChanged) {
      dataToUpdate.start_at = newStartAt;
      dataToUpdate.end_at = newEndAt;
    }
    if (quantityChanged) {
      dataToUpdate.quantity = newQuantity;
    }
    if (input.notes !== undefined) {
      dataToUpdate.notes = input.notes;
    }
    if (input.status) {
      dataToUpdate.status = input.status.toLowerCase();
    }

    await this.db.bookings.update({
      where: { id },
      data: dataToUpdate,
    });

    return this.getReservationById(id);
  }
}

export const adminReservationsService = new AdminReservationsService();
