/**
 * Errores de Dominio para el Módulo de Escáner QR (HU13 - VCP-57)
 * Vice City - Feature: QR Scanner
 */

export class QRError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class TicketNotFoundError extends QRError {
  constructor(message: string = "El código QR no corresponde a ningún ticket registrado en el sistema") {
    super(message, "TICKET_NOT_FOUND", 404);
  }
}

export class TicketAlreadyUsedError extends QRError {
  constructor(message: string = "El ticket ya fue utilizado previamente y no admite reingresos") {
    super(message, "ALREADY_USED", 409);
  }
}

export class TicketCancelledError extends QRError {
  constructor(message: string = "El ticket se encuentra cancelado o anulado") {
    super(message, "TICKET_CANCELLED", 409);
  }
}

export class TicketExpiredError extends QRError {
  constructor(message: string = "El ticket se encuentra vencido o fuera de vigencia") {
    super(message, "EXPIRED_TICKET", 422);
  }
}

export class MaintenanceDayError extends QRError {
  constructor(message: string = "El complejo deportivo se encuentra cerrado por mantenimiento programado") {
    super(message, "MAINTENANCE_DAY_CLOSED", 422);
  }
}

export class OutOfScheduleError extends QRError {
  constructor(message: string = "El ingreso no es válido fuera de la fecha y franja horaria programada") {
    super(message, "OUT_OF_SCHEDULE", 422);
  }
}

export class UnauthorizedValidatorError extends QRError {
  constructor(message: string = "El usuario no cuenta con el rol QR_VALIDATOR para autorizar accesos") {
    super(message, "FORBIDDEN_ROLE", 403);
  }
}
