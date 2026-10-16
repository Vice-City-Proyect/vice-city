'use client';

import { Search, X } from 'lucide-react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TIME_SLOT_OPTIONS } from '@/features/reservations/data/reservation-filters';

export type AdminReservationStatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'FINISHED';

export interface AdminReservationFilters {
  search: string;
  date: string;
  serviceId: string;
  status: AdminReservationStatusFilter;
  slot: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

interface AdminReservationFiltersBarProps {
  filters: AdminReservationFilters;
  onChange: (next: AdminReservationFilters) => void;
  serviceOptions: ServiceOption[];
}

const EMPTY_FILTERS: AdminReservationFilters = {
  search: '',
  date: '',
  serviceId: '',
  status: 'ALL',
  slot: '',
};

const STATUS_OPTIONS: { value: AdminReservationStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'FINISHED', label: 'Finalizada' },
];

export function AdminReservationFiltersBar({
  filters,
  onChange,
  serviceOptions,
}: AdminReservationFiltersBarProps) {
  const update = (patch: Partial<AdminReservationFilters>) =>
    onChange({ ...filters, ...patch });
  const hasFilters =
    filters.search !== '' ||
    filters.date !== '' ||
    filters.serviceId !== '' ||
    filters.status !== 'ALL' ||
    filters.slot !== '';

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      <FormField htmlFor="admin-reservation-search" label="Buscar cliente">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            id="admin-reservation-search"
            type="search"
            placeholder="Nombre, correo o código"
            className="pl-10"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
          />
        </div>
      </FormField>

      <FormField htmlFor="admin-reservation-date" label="Fecha">
        <Input
          id="admin-reservation-date"
          type="date"
          value={filters.date}
          onChange={(event) => update({ date: event.target.value })}
        />
      </FormField>

      <FormField htmlFor="admin-reservation-service" label="Servicio">
        <Select
          id="admin-reservation-service"
          value={filters.serviceId}
          onChange={(event) => update({ serviceId: event.target.value })}
        >
          <option value="">Todos los servicios</option>
          {serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField htmlFor="admin-reservation-status" label="Estado">
        <Select
          id="admin-reservation-status"
          value={filters.status}
          onChange={(event) =>
            update({ status: event.target.value as AdminReservationStatusFilter })
          }
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField htmlFor="admin-reservation-slot" label="Franja horaria">
        <Select
          id="admin-reservation-slot"
          value={filters.slot}
          onChange={(event) => update({ slot: event.target.value })}
        >
          {TIME_SLOT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value || option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {hasFilters && (
        <div className="flex items-end md:col-span-2 xl:col-span-5">
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-text-main/10 bg-club-surface px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
