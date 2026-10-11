'use client';

import { Search, X } from 'lucide-react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  EMPTY_FILTERS,
  RESERVATION_STATUS_OPTIONS,
  TIME_SLOT_OPTIONS,
  hasActiveFilters,
  type ReservationFilters,
} from '../data/reservation-filters';

interface ReservationFiltersProps {
  filters: ReservationFilters;
  onChange: (next: ReservationFilters) => void;
  serviceOptions: string[];
  queryLabel?: string;
  showQuery?: boolean;
}

export function ReservationFiltersBar({
  filters,
  onChange,
  serviceOptions,
  queryLabel = 'Buscar cliente',
  showQuery = true,
}: ReservationFiltersProps) {
  const update = (patch: Partial<ReservationFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {showQuery && (
          <FormField htmlFor="reservation-search" label={queryLabel}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                id="reservation-search"
                type="search"
                placeholder="Nombre, servicio o código"
                className="pl-10"
                value={filters.query}
                onChange={(event) => update({ query: event.target.value })}
              />
            </div>
          </FormField>
        )}

        <FormField htmlFor="reservation-date" label="Fecha">
          <Input
            id="reservation-date"
            type="date"
            value={filters.date}
            onChange={(event) => update({ date: event.target.value })}
          />
        </FormField>

        <FormField htmlFor="reservation-service" label="Servicio">
          <Select
            id="reservation-service"
            value={filters.service}
            onChange={(event) => update({ service: event.target.value })}
          >
            <option value="">Todos los servicios</option>
            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField htmlFor="reservation-status" label="Estado">
          <Select
            id="reservation-status"
            value={filters.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            {RESERVATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField htmlFor="reservation-slot" label="Franja horaria">
          <Select
            id="reservation-slot"
            value={filters.slot}
            onChange={(event) => update({ slot: event.target.value })}
          >
            {TIME_SLOT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="flex items-end">
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => onChange({ ...EMPTY_FILTERS })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-text-main/10 bg-club-surface px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
            >
              <X className="h-4 w-4" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
