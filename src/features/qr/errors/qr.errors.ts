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

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      instance !== null &&
      typeof instance === "object" &&
      (instance instanceof Error || "message" in instance) &&
      typeof (instance as any).code === "string" &&
      typeof (instance as any).statusCode === "number"
    );
  }
}

export class TicketNotFoundError extends QRError {
  constructor(message: string = "El código QR no corresponde a ningún ticket registrado en el sistema") {
    super(message, "TICKET_NOT_FOUND", 404);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "TICKET_NOT_FOUND"
    );
  }
}

export class TicketAlreadyUsedError extends QRError {
  constructor(message: string = "El ticket ya fue utilizado previamente y no admite reingresos") {
    super(message, "ALREADY_USED", 409);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "ALREADY_USED"
    );
  }
}

export class TicketCancelledError extends QRError {
  constructor(message: string = "El ticket se encuentra cancelado o anulado") {
    super(message, "TICKET_CANCELLED", 409);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "TICKET_CANCELLED"
    );
  }
}

export class TicketExpiredError extends QRError {
  constructor(message: string = "El ticket se encuentra vencido o fuera de vigencia") {
    super(message, "EXPIRED_TICKET", 422);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "EXPIRED_TICKET"
    );
  }
}

export class MaintenanceDayError extends QRError {
  constructor(message: string = "El complejo deportivo se encuentra cerrado por mantenimiento programado") {
    super(message, "MAINTENANCE_DAY_CLOSED", 422);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "MAINTENANCE_DAY_CLOSED"
    );
  }
}

export class OutOfScheduleError extends QRError {
  constructor(message: string = "El ingreso no es válido fuera de la fecha y franja horaria programada") {
    super(message, "OUT_OF_SCHEDULE", 422);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "OUT_OF_SCHEDULE"
    );
  }
}

export class UnauthorizedValidatorError extends QRError {
  constructor(message: string = "El usuario no cuenta con el rol QR_VALIDATOR para autorizar accesos") {
    super(message, "FORBIDDEN_ROLE", 403);
  }

  static [Symbol.hasInstance](instance: unknown): boolean {
    return (
      Boolean(instance) &&
      typeof instance === "object" &&
      (instance as any).code === "FORBIDDEN_ROLE"
    );
  }
}
