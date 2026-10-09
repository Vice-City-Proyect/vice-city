/**
 * Tipos para la Disponibilidad y Franjas Horarias (HU20)
 * Vice City - Features: Services
 */

export type SlotStatus =
  | "AVAILABLE"    // Franja con cupos disponibles
  | "FULL"         // Aforo completo
  | "MAINTENANCE"  // Bloqueada por mantenimiento semanal
  | "IN_PROGRESS"  // Franja ya iniciada pero aún activa para compra (RN-010)
  | "PAST";        // Franja finalizada (ya transcurrió)

export interface TimeSlot {
  /** Hora de inicio en formato HH:mm (ej. "08:00") */
  startTime: string;
  /** Hora de fin en formato HH:mm (ej. "09:00") */
  endTime: string;
  /** Capacidad total configurada para el servicio (RN-004) */
  totalCapacity: number;
  /** Cantidad de cupos actualmente ocupados en esta franja */
  occupiedCapacity: number;
  /** Aforo restante disponible para reservar */
  remainingCapacity: number;
  /** Estado de la franja horaria */
  status: SlotStatus;
  /** Indica si la franja es la que está en curso en este momento (RN-010) */
  isCurrentSlot: boolean;
  /** Indica si se puede comprar/reservar en esta franja */
  canBePurchased: boolean;
  /** Tarifa aplicable a la franja (tarifa completa de 1h) */
  price: number;
  currency: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  price: number;
  currency: string;
  duration_minutes: number;
}

export interface ServiceAvailabilityResult {
  service: ServiceSummary;
  /** Fecha consultada en formato YYYY-MM-DD */
  date: string;
  /** Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado) */
  dayOfWeek: number;
  /** Indica si es día de mantenimiento semanal (RN-001 y RN-003) */
  isMaintenanceDay: boolean;
  /** Detalle o motivo de mantenimiento */
  maintenanceReason?: string;
  /** Horario operativo del complejo (RN-001) */
  operatingHours: {
    open: string;
    close: string;
  };
  /** Lista de las 9 franjas horarias de 1 hora (08:00 a 17:00) */
  slots: TimeSlot[];
  /** Resumen de disponibilidad de la jornada */
  summary: {
    totalSlots: number;
    availableSlots: number;
    isFullyBooked: boolean;
  };
}

