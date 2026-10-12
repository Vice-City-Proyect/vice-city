/**
 * FT-06 / HU25: Errores de Dominio para el Módulo POS de Empleado
 */

export class PosError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = "POS_ERROR", statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ForbiddenPosAccessError extends PosError {
  constructor(
    message: string = "Acceso denegado: solo el personal con rol TICKET_SELLER o ADMIN puede registrar ventas en el POS."
  ) {
    super(message, "FORBIDDEN_POS_ACCESS", 403);
  }
}

export class PosCapacityExceededError extends PosError {
  constructor(
    message: string = "Aforo insuficiente para la cantidad solicitada en la franja seleccionada."
  ) {
    super(message, "POS_CAPACITY_EXCEEDED", 409);
  }
}

export class PosMaintenanceDayError extends PosError {
  constructor(
    message: string = "No hay servicio disponible por mantenimiento semanal (Lunes, o Martes si el lunes es festivo - RN-003)."
  ) {
    super(message, "POS_MAINTENANCE_DAY_CLOSED", 422);
  }
}

export class PosServiceNotFoundError extends PosError {
  constructor(message: string = "El servicio solicitado en taquilla no existe o se encuentra inactivo.") {
    super(message, "POS_SERVICE_NOT_FOUND", 404);
  }
}

export class PosOperatingHoursError extends PosError {
  constructor(
    message: string = "La franja seleccionada está fuera del horario operativo oficial de 8:00 AM a 5:00 PM (RN-001)."
  ) {
    super(message, "POS_OPERATING_HOURS_EXCEEDED", 400);
  }
}

export class PosPastSlotError extends PosError {
  constructor(
    message: string = "No es posible vender una franja horaria que ya ha finalizado completamente."
  ) {
    super(message, "POS_PAST_SLOT_NOT_ALLOWED", 400);
  }
}
