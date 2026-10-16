import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  mapBookingToAdminDto,
  toBogotaDateParts,
  type AdminReservationDto,
} from "../dto/admin-reservation.dto";

/** Cantidad de reservas próximas que muestra el dashboard del administrador. */
export const UPCOMING_RESERVATIONS_LIMIT = 6;

const BOOKING_INCLUDE = {
  services: { include: { categories: true } },
  users: true,
  tickets: { include: { access_logs: true } },
  payments: true,
};

export interface AdminDashboardSummary {
  /** Reservas en estado pending con el HOLD de 10 minutos todavía vigente. */
  pendingReservations: number;
  /** Usuarios con la cuenta activa (todos los roles). */
  activeUsers: number;
  /** Reservas confirmadas que no han terminado, de la más próxima a la más lejana. */
  upcomingReservations: AdminReservationDto[];
}

/** Reserva sin los datos de contacto ni las notas internas, para el panel de empleados. */
export type EmployeeReservationDto = Omit<
  AdminReservationDto,
  | "clientEmail"
  | "clientPhone"
  | "notes"
  | "cancellationReason"
  | "cancelledAt"
  | "createdAt"
  | "updatedAt"
>;

export interface EmployeeDashboardSummary {
  /** Fecha operativa (YYYY-MM-DD, America/Bogota). */
  date: string;
  todayReservations: number;
  expectedVisitors: number;
  /** Reservas del día con QR vigente cuyo ingreso aún no se registra. */
  pendingEntry: number;
  activeServices: number;
  reservations: EmployeeReservationDto[];
}

export interface DashboardSummaryServiceDeps {
  db?: PrismaClient | any;
  nowFn?: () => Date;
}

export class DashboardSummaryService {
  private db: PrismaClient | any;
  private nowFn: () => Date;

  constructor(deps: DashboardSummaryServiceDeps = {}) {
    this.db = deps.db ?? defaultPrisma;
    this.nowFn = deps.nowFn ?? (() => new Date());
  }

  /**
   * Resumen del dashboard del administrador (VCP-93).
   */
  async getAdminSummary(): Promise<AdminDashboardSummary> {
    const now = this.nowFn();

    const [pendingReservations, activeUsers, upcoming] = await Promise.all([
      this.db.bookings.count({
        where: { status: "pending", expires_at: { gt: now } },
      }),
      this.db.users.count({ where: { is_active: true } }),
      this.db.bookings.findMany({
        where: { status: "confirmed", end_at: { gte: now } },
        orderBy: { start_at: "asc" },
        take: UPCOMING_RESERVATIONS_LIMIT,
        include: BOOKING_INCLUDE,
      }),
    ]);

    return {
      pendingReservations,
      activeUsers,
      upcomingReservations: upcoming.map((b: any) => mapBookingToAdminDto(b, now)),
    };
  }

  /**
   * Resumen operativo del día para el panel de empleados (VCP-93).
   */
  async getEmployeeSummary(): Promise<EmployeeDashboardSummary> {
    const now = this.nowFn();
    const today = toBogotaDateParts(now).date;
    const startOfDay = new Date(`${today}T00:00:00-05:00`);
    const endOfDay = new Date(`${today}T23:59:59.999-05:00`);

    const [bookings, activeServices] = await Promise.all([
      this.db.bookings.findMany({
        where: {
          status: { in: ["confirmed", "completed"] },
          start_at: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { start_at: "asc" },
        include: BOOKING_INCLUDE,
      }),
      this.db.services.count({ where: { is_active: true } }),
    ]);

    const reservations = bookings.map((b: any) => mapBookingToAdminDto(b, now));

    return {
      date: today,
      todayReservations: reservations.length,
      expectedVisitors: reservations.reduce(
        (sum: number, r: AdminReservationDto) => sum + r.guests,
        0
      ),
      pendingEntry: reservations.filter(
        (r: AdminReservationDto) =>
          r.accessStatus === "NOT_ENTERED" && r.qrStatus === "VALID"
      ).length,
      activeServices,
      reservations: reservations.map(toEmployeeReservation),
    };
  }
}

function toEmployeeReservation(r: AdminReservationDto): EmployeeReservationDto {
  const {
    clientEmail,
    clientPhone,
    notes,
    cancellationReason,
    cancelledAt,
    createdAt,
    updatedAt,
    ...safe
  } = r;
  void clientEmail, clientPhone, notes, cancellationReason, cancelledAt, createdAt, updatedAt;
  return safe;
}

export const dashboardSummaryService = new DashboardSummaryService();
