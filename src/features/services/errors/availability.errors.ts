/**
 * Errores de Dominio para Disponibilidad y Catálogo (HU20)
 * Vice City - Features: Services
 */

export class CatalogError extends Error {
  public readonly code: string;

  constructor(message: string, code = "CATALOG_ERROR") {
    super(message);
    this.name = "CatalogError";
    this.code = code;
    Object.setPrototypeOf(this, CatalogError.prototype);
  }
}

/**
 * Lanzado cuando se consulta una fecha en día de mantenimiento (RN-003).
 */
export class MaintenanceDayError extends CatalogError {
  constructor(
    message = "El complejo deportivo se encuentra cerrado por mantenimiento programado (lunes o martes posterior a festivo)."
  ) {
    super(message, "MAINTENANCE_DAY");
    this.name = "MaintenanceDayError";
    Object.setPrototypeOf(this, MaintenanceDayError.prototype);
  }
}

/**
 * Lanzado cuando la fecha supera el límite máximo de anticipación (RN-008).
 * (15 días para reservas normales, 20 días para reserva completa de piscina).
 */
export class AdvanceBookingLimitError extends CatalogError {
  constructor(
    maxDays = 15,
    message = `La fecha seleccionada supera el límite máximo de anticipación permitido (${maxDays} días).`
  ) {
    super(message, "ADVANCE_BOOKING_LIMIT_EXCEEDED");
    this.name = "AdvanceBookingLimitError";
    Object.setPrototypeOf(this, AdvanceBookingLimitError.prototype);
  }
}

/**
 * Lanzado cuando se intenta consultar o reservar una fecha en el pasado.
 */
export class PastDateError extends CatalogError {
  constructor(message = "No es posible consultar disponibilidad para fechas anteriores a hoy.") {
    super(message, "PAST_DATE_NOT_ALLOWED");
    this.name = "PastDateError";
    Object.setPrototypeOf(this, PastDateError.prototype);
  }
}

/**
 * Lanzado cuando se solicita una franja fuera del horario de operación (RN-001: 8:00 AM - 5:00 PM).
 */
export class OperatingHoursError extends CatalogError {
  constructor(
    message = "El horario solicitado está fuera de la jornada de operación del complejo (8:00 AM a 5:00 PM)."
  ) {
    super(message, "OUT_OF_OPERATING_HOURS");
    this.name = "OperatingHoursError";
    Object.setPrototypeOf(this, OperatingHoursError.prototype);
  }
}

/**
 * Lanzado cuando el servicio consultado no existe o se encuentra inactivo.
 */
export class ServiceNotFoundError extends CatalogError {
  constructor(message = "El servicio solicitado no existe o no se encuentra activo.") {
    super(message, "SERVICE_NOT_FOUND");
    this.name = "ServiceNotFoundError";
    Object.setPrototypeOf(this, ServiceNotFoundError.prototype);
  }
}

/**
 * Lanzado cuando el formato de fecha provisto es inválido.
 */
export class InvalidDateFormatError extends CatalogError {
  constructor(message = "El formato de fecha no es válido. Debe tener el formato YYYY-MM-DD.") {
    super(message, "INVALID_DATE_FORMAT");
    this.name = "InvalidDateFormatError";
    Object.setPrototypeOf(this, InvalidDateFormatError.prototype);
  }
}

