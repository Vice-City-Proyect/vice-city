import type { Reservation } from '@/types/reservation';

export interface AdminReservation extends Reservation {
  clientEmail: string;
  clientPhone?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminReservationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminReservationsPage {
  items: AdminReservation[];
  pagination: AdminReservationsPagination;
}

export interface UpdateAdminReservationPayload {
  date: string;
  startTime: string;
  guests: number;
  status?: Reservation['status'];
}

/** Respuesta de GET /api/reports/dashboard-summary (solo ADMIN). */
export interface AdminDashboardSummaryData {
  pendingReservations: number;
  activeUsers: number;
  upcomingReservations: AdminReservation[];
}

export interface CancelAdminReservationPayload {
  status: 'CANCELLED';
  cancellationReason?: string;
}
