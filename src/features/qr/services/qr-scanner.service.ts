/**
 * Servicio Central de Validación y Control de Acceso por Código QR (HU13 - VCP-57)
 * Vice City - Feature: QR Scanner
 */

import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { checkMaintenanceDay } from "@/features/services/utils/colombian-holidays.util";
import {
  TicketNotFoundError,
  TicketAlreadyUsedError,
  TicketCancelledError,
  MaintenanceDayError,
  OutOfScheduleError,
  UnauthorizedValidatorError,
} from "../errors/qr.errors";
import type {
  QRValidationResponse,
  ConfirmEntryResult,
  AccessValidationResult,
  AccessReasonCode,
} from "../types";

/**
 * Valores que acepta la base de datos (CHECK constraints en Supabase):
 * - tickets.status: 'valid' | 'used' | 'cancelled' | 'expired'
 * - access_logs.result: 'granted' | 'denied'
 * En la API se exponen en mayúscula (USED, GRANTED...), en la BD van en minúscula.
 */
const TICKET_STATUS = {
  VALID: "valid",
  USED: "used",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

const ACCESS_RESULT = { GRANTED: "granted", DENIED: "denied" } as const;

/** Colombia no tiene horario de verano: America/Bogota es UTC-5 todo el año (RN-002). */
const BOGOTA_UTC_OFFSET_MS = -5 * 60 * 60 * 1000;

/** Minutos de gracia tras el inicio de la franja antes de marcar el ingreso como tardío. */
const LATE_ENTRY_GRACE_MINUTES = 5;

/** Convierte un instante UTC a fecha (YYYY-MM-DD) y hora (HH:mm) de Bogotá. */
function toBogota(instant: Date): { date: string; time: string } {
  const iso = new Date(instant.getTime() + BOGOTA_UTC_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export class QRScannerService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /**
   * Valida si el rol del usuario cuenta con permisos de escaneo.
   * La HU13 restringe el acceso exclusivamente al rol QR_VALIDATOR (otros roles reciben 403).
   */
  public ensureValidatorRole(roleName?: string | null): void {
    const normalized = (roleName || "").toUpperCase();
    if (normalized !== "QR_VALIDATOR") {
      throw new UnauthorizedValidatorError(
        `El rol '${roleName || "SIN_ROL"}' no tiene permisos para validar códigos QR. Se requiere rol QR_VALIDATOR.`
      );
    }
  }

  /**
   * Consulta el ticket por su identificador seguro (code) y evalúa su vigencia.
   * Permite consultar la información al portador y conocer si el paso está autorizado.
   */
  async validateQRCode(
    code: string,
    validatorRole?: string | null,
    now: Date = new Date()
  ): Promise<QRValidationResponse> {
    this.ensureValidatorRole(validatorRole);

    const ticket = await this.db.tickets.findUnique({
      where: { code },
      include: {
        bookings: {
          include: {
            users: true,
            services: true,
            service_schedules: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new TicketNotFoundError();
    }

    const booking = ticket.bookings;
    const user = booking?.users;
    const service = booking?.services;

    // La franja sale de la reserva; valid_from/valid_until del ticket es el respaldo.
    // Sin franja no hay forma de validar vigencia: se rechaza en vez de inventar una fecha.
    const startRaw = booking?.start_at ?? ticket.valid_from;
    const endRaw = booking?.end_at ?? ticket.valid_until;
    if (!startRaw || !endRaw) {
      throw new OutOfScheduleError(
        "El ticket no tiene una franja horaria asociada, no es posible validar su vigencia"
      );
    }
    const startAt = new Date(startRaw);
    const endAt = new Date(endRaw);

    // Fecha y hora de la franja y del momento del escaneo, ambas en America/Bogota (RN-002)
    const slotStart = toBogota(startAt);
    const slotEnd = toBogota(endAt);
    const today = toBogota(now);

    // Evaluar reglas de negocio para determinar si puede entrar
    const validation = this.evaluateAccessRules(
      ticket.status,
      slotStart.date,
      today.date,
      startAt,
      endAt,
      now
    );

    return {
      ticketId: ticket.id,
      code: ticket.code,
      status: ticket.status.toUpperCase(),
      holderName: ticket.holder_name || user?.full_name || "Al Portador",
      customer: {
        fullName: user?.full_name || "Cliente Desconocido",
        email: user?.email || "",
        phone: user?.phone || null,
        documentId: user?.document_id || null,
      },
      service: {
        id: service?.id || booking?.service_id || "",
        name: service?.name || "Servicio Deportivo",
        durationMinutes: service?.duration_minutes || 60,
      },
      schedule: {
        date: slotStart.date,
        startTime: slotStart.time,
        endTime: slotEnd.time,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
      accessValidation: validation,
    };
  }

  /**
   * Confirma y registra el ingreso efectivo (marcando USED de forma atómica y registrando trazas).
   * Maneja el caso de concurrencia: si dos escaneos ocurren simultáneamente, solo uno autoriza.
   */
  async confirmEntry(
    code: string,
    validatorUserId: string,
    validatorRole: string = "QR_VALIDATOR",
    accessPoint: string = "Torniquete Principal",
    ipAddress?: string | null,
    now: Date = new Date()
  ): Promise<ConfirmEntryResult> {
    this.ensureValidatorRole(validatorRole);

    // 1. Obtener y validar el ticket previamente
    const validationResult = await this.validateQRCode(code, validatorRole, now);

    if (!validationResult.accessValidation.canEnter) {
      // Registrar intento denegado en access_logs
      await this.logAccessAttempt(
        validationResult.ticketId,
        validatorUserId,
        ACCESS_RESULT.DENIED,
        validationResult.accessValidation.reasonCode,
        accessPoint,
        ipAddress
      );

      // Lanzar error específico según la causa
      const reason = validationResult.accessValidation.reasonCode;
      if (reason === "ALREADY_USED") {
        throw new TicketAlreadyUsedError();
      }
      if (reason === "MAINTENANCE_DAY_CLOSED") {
        throw new MaintenanceDayError(validationResult.accessValidation.message);
      }
      if (validationResult.status === "CANCELLED") {
        throw new TicketCancelledError(validationResult.accessValidation.message);
      }
      throw new OutOfScheduleError(validationResult.accessValidation.message);
    }

    // 2. Transacción Atómica: UPDATE condicional para evitar concurrencia
    return await this.db.$transaction(async (tx) => {
      // Intentar actualizar solo si el ticket sigue en estado 'valid'
      const updateResult = await tx.tickets.updateMany({
        where: {
          code,
          status: TICKET_STATUS.VALID,
        },
        data: {
          status: TICKET_STATUS.USED,
          used_at: now,
          updated_at: now,
        },
      });

      // Si count es 0, otro escaneo concurrente ganó la carrera milisegundos antes
      if (updateResult.count === 0) {
        await this.logAccessAttempt(
          validationResult.ticketId,
          validatorUserId,
          ACCESS_RESULT.DENIED,
          "ALREADY_USED",
          accessPoint,
          ipAddress
        );
        throw new TicketAlreadyUsedError();
      }

      // 3. Registrar acceso permitido en access_logs
      const log = await tx.access_logs.create({
        data: {
          ticket_id: validationResult.ticketId,
          scanned_by: validatorUserId,
          result: ACCESS_RESULT.GRANTED,
          reason: validationResult.accessValidation.reasonCode,
          access_point: accessPoint,
          ip_address: ipAddress || null,
          metadata: {
            isLateEntry: validationResult.accessValidation.isLateEntry,
            serviceName: validationResult.service.name,
            timestamp: now.toISOString(),
          },
        },
      });

      // 4. Registrar en audit_logs la confirmación
      await tx.audit_logs.create({
        data: {
          user_id: validatorUserId,
          action: "TICKET_ENTRY_CONFIRMED",
          entity: "tickets",
          entity_id: validationResult.ticketId,
          details: {
            code,
            accessPoint,
            isLateEntry: validationResult.accessValidation.isLateEntry,
            reasonCode: validationResult.accessValidation.reasonCode,
          },
          ip_address: ipAddress || null,
        },
      });

      return {
        ticketId: validationResult.ticketId,
        code,
        status: "USED",
        usedAt: now.toISOString(),
        accessLogId: log.id,
        reasonCode: validationResult.accessValidation.reasonCode,
        message: validationResult.accessValidation.message,
      };
    });
  }

  /**
   * Evalúa las reglas de negocio de fecha, franja, mantenimiento y estado del ticket.
   */
  private evaluateAccessRules(
    status: string,
    scheduleDateStr: string,
    todayStr: string,
    slotStartAt: Date,
    slotEndAt: Date,
    now: Date
  ): AccessValidationResult {
    const normalizedStatus = status.toLowerCase();

    // 1. Verificar si ya fue utilizado
    if (normalizedStatus === TICKET_STATUS.USED) {
      return {
        canEnter: false,
        isLateEntry: false,
        reasonCode: "ALREADY_USED",
        message: "El ticket ya fue utilizado previamente y no admite reingresos",
      };
    }

    // 2. Verificar si está cancelado o vencido
    if (
      normalizedStatus === TICKET_STATUS.CANCELLED ||
      normalizedStatus === TICKET_STATUS.EXPIRED
    ) {
      return {
        canEnter: false,
        isLateEntry: false,
        reasonCode: "EXPIRED_TICKET",
        message:
          normalizedStatus === TICKET_STATUS.CANCELLED
            ? "El ticket se encuentra cancelado"
            : "El ticket se encuentra vencido",
      };
    }

    // 3. Verificar si el día de hoy es de mantenimiento en Colombia
    const maintenance = checkMaintenanceDay(todayStr);
    if (maintenance.isMaintenance) {
      return {
        canEnter: false,
        isLateEntry: false,
        reasonCode: "MAINTENANCE_DAY_CLOSED",
        message: maintenance.reason || "Complejo deportivo cerrado por mantenimiento programado",
      };
    }

    // 4. Verificar fecha del servicio (debe coincidir con la fecha de hoy)
    if (scheduleDateStr !== todayStr) {
      const isPast = scheduleDateStr < todayStr;
      return {
        canEnter: false,
        isLateEntry: false,
        reasonCode: isPast ? "EXPIRED_TICKET" : "OUT_OF_SCHEDULE",
        message: isPast
          ? "El ticket ha expirado porque corresponde a una fecha pasada"
          : `El ticket no es válido para hoy. Corresponde a la fecha ${scheduleDateStr}`,
      };
    }

    // 5. Verificar franja horaria comparando instantes exactos (inicio inclusivo, fin exclusivo):
    // Caso A: Llegó antes del inicio de la franja
    if (now.getTime() < slotStartAt.getTime()) {
      return {
        canEnter: false,
        isLateEntry: false,
        reasonCode: "OUT_OF_SCHEDULE",
        message: "Aún no ha iniciado la franja horaria programada para este servicio",
      };
    }

    // Caso B: Llegó después del cierre de la franja
    if (now.getTime() >= slotEndAt.getTime()) {
      return {
        canEnter: false,
        isLateEntry: false,
        reasonCode: "EXPIRED_TICKET",
        message: "La franja horaria programada para este servicio ya ha concluido",
      };
    }

    // Caso C: Llegó dentro de la franja. ¿Es tardío? (pasó el tiempo de gracia desde el inicio)
    const isLate =
      now.getTime() > slotStartAt.getTime() + LATE_ENTRY_GRACE_MINUTES * 60 * 1000;
    return {
      canEnter: true,
      isLateEntry: isLate,
      reasonCode: isLate ? "LATE_ENTRY_ALLOWED" : "ENTRY_GRANTED",
      message: isLate
        ? "Ingreso tardío permitido dentro de la franja horaria del servicio"
        : "Acceso autorizado dentro del horario programado",
    };
  }

  /**
   * Inserta un registro de auditoría en la tabla access_logs.
   */
  private async logAccessAttempt(
    ticketId: string,
    scannedBy: string,
    result: (typeof ACCESS_RESULT)[keyof typeof ACCESS_RESULT],
    reason: AccessReasonCode,
    accessPoint: string,
    ipAddress?: string | null
  ): Promise<void> {
    try {
      await this.db.access_logs.create({
        data: {
          ticket_id: ticketId,
          scanned_by: scannedBy,
          result,
          reason,
          access_point: accessPoint,
          ip_address: ipAddress || null,
        },
      });
    } catch (err) {
      console.error("[QRScannerService] Error al registrar intento en access_logs:", err);
    }
  }
}
