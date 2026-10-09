/**
 * Errores de Dominio para Descuentos y Promociones (HU22)
 * Vice City - Features: Pricing
 */

export class PricingError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "PRICING_ERROR", statusCode = 400) {
    super(message);
    this.name = "PricingError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, PricingError.prototype);
  }
}

/**
 * Error lanzado cuando se intenta reservar piscina completa en un día prohibido (RN-014).
 * Días prohibidos: Viernes, Sábado, Domingo y Lunes festivos.
 * Criterio de Aceptación:
 * "Caso de error: una reserva completa de piscina en un día prohibido es rechazada."
 */
export class FullPoolDayRestrictedError extends PricingError {
  constructor(
    message = "Las reservas completas de piscina están prohibidas los viernes, sábados, domingos y lunes festivos (RN-014)."
  ) {
    super(message, "FULL_POOL_DAY_RESTRICTED", 422); // 422 Unprocessable Entity
    this.name = "FullPoolDayRestrictedError";
    Object.setPrototypeOf(this, FullPoolDayRestrictedError.prototype);
  }
}

