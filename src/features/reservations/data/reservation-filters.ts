import type { Reservation } from '@/types/reservation';

export interface ReservationFilters {
  query: string;
  date: string;
  service: string;
  status: string;
  slot: string;
}

export const EMPTY_FILTERS: ReservationFilters = {
  query: '',
  date: '',
  service: '',
  status: '',
  slot: '',
};

export const RESERVATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'FINISHED', label: 'Finalizada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export const TIME_SLOT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Toda la jornada' },
  { value: '08:00', label: '08:00 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '16:00', label: '04:00 PM' },
];

export function filterReservations(
  reservations: Reservation[],
  filters: ReservationFilters,
): Reservation[] {
  const query = filters.query.trim().toLowerCase();

  return reservations.filter((reservation) => {
    if (query) {
      const haystack = `${reservation.clientName} ${reservation.serviceName} ${reservation.code}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.date && reservation.date !== filters.date) return false;
    if (filters.service && reservation.serviceName !== filters.service) return false;
    if (filters.status && reservation.status !== filters.status) return false;
    if (filters.slot && reservation.startTime !== filters.slot) return false;
    return true;
  });
}

export function hasActiveFilters(filters: ReservationFilters): boolean {
  return Object.values(filters).some((value) => value !== '');
}

export function clientSection(
  reservation: Reservation,
): 'UPCOMING' | 'COMPLETED' | 'CANCELLED' {
  if (reservation.status === 'CANCELLED') return 'CANCELLED';
  if (reservation.status === 'FINISHED') return 'COMPLETED';
  return 'UPCOMING';
}
