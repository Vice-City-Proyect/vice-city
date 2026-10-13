/**
 * Tipos e Interfaces para el Módulo de Escáner QR (HU13 - VCP-57)
 * Vice City - Feature: QR Scanner
 */

export type AccessStatus = "GRANTED" | "DENIED";

export type AccessReasonCode =
  | "ENTRY_GRANTED"
  | "LATE_ENTRY_ALLOWED"
  | "EXPIRED_TICKET"
  | "ALREADY_USED"
  | "WRONG_SERVICE"
  | "MAINTENANCE_DAY_CLOSED"
  | "OUT_OF_SCHEDULE";

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone?: string | null;
  documentId?: string | null;
}

export interface ServiceInfo {
  id: string;
  name: string;
  category?: string;
  durationMinutes?: number;
}

export interface ScheduleInfo {
  date: string; // YYYY-MM-DD (Bogotá)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  startAt: string; // ISO String UTC
  endAt: string; // ISO String UTC
}

export interface AccessValidationResult {
  canEnter: boolean;
  isLateEntry: boolean;
  reasonCode: AccessReasonCode;
  message: string;
}

export interface QRValidationResponse {
  ticketId: string;
  code: string;
  status: string;
  holderName?: string | null;
  customer: CustomerInfo;
  service: ServiceInfo;
  schedule: ScheduleInfo;
  accessValidation: AccessValidationResult;
}

export interface ConfirmEntryResult {
  ticketId: string;
  code: string;
  status: "USED";
  usedAt: string;
  accessLogId: string;
  reasonCode: AccessReasonCode;
  message: string;
}
