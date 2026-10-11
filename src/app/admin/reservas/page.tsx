'use client';

import { useState } from 'react';
import { Ban, Eye, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { formatCOP, formatDate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import { MOCK_SERVICES } from '@/features/services/data/mock-services';
import {
  EMPTY_FILTERS,
  filterReservations,
  type ReservationFilters,
} from '@/features/reservations/data/reservation-filters';
import { ReservationFiltersBar } from '@/features/reservations/components/ReservationFiltersBar';
import { ReservationDetailModal } from '@/features/reservations/components/ReservationDetailModal';
import { ReservationEditModal } from '@/features/reservations/components/ReservationEditModal';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';

const SERVICE_OPTIONS = MOCK_SERVICES.map((service) => service.name);

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS);
  const [filters, setFilters] = useState<ReservationFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const filtered = filterReservations(reservations, filters);

  function handleCancel(reservation: Reservation) {
    setReservations((current) =>
      current.map((item) =>
        item.id === reservation.id
          ? { ...item, status: 'CANCELLED', qrStatus: 'CANCELLED' }
          : item,
      ),
    );
    setSelected(null);
    setEditing(null);
  }

  function handleSave(updated: Reservation) {
    setReservations((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setEditing(null);
    setSelected((current) => (current && current.id === updated.id ? updated : current));
  }

  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="Reservas del"
        highlightedTitle="complejo"
        description="Consulta, filtra y administra todas las reservas del complejo deportivo."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nueva reserva
          </Button>
        }
      />

      <Card className="p-5 sm:p-6">
        <ReservationFiltersBar
          filters={filters}
          onChange={setFilters}
          serviceOptions={SERVICE_OPTIONS}
        />

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-text-main/10 pt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {filtered.length} reserva(s)
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-5"
            title="Sin resultados"
            description="Ajusta los filtros o la búsqueda para encontrar una reserva."
          />
        ) : (
          <div className="mt-4">
            <Table
              data={filtered}
              rowKey={(row) => row.id}
              minWidth="68rem"
              columns={[
                {
                  key: 'code',
                  header: 'Código',
                  render: (row) => (
                    <span className="font-mono text-xs font-bold text-text-muted">{row.code}</span>
                  ),
                },
                {
                  key: 'client',
                  header: 'Cliente',
                  render: (row) => (
                    <span className="font-bold text-club-accent">{row.clientName}</span>
                  ),
                },
                {
                  key: 'service',
                  header: 'Servicio',
                  render: (row) => (
                    <div className="flex flex-col">
                      <span>{row.serviceName}</span>
                      <span className="text-[11px] text-text-muted">{row.resource}</span>
                    </div>
                  ),
                },
                { key: 'date', header: 'Fecha', render: (row) => formatDate(row.date) },
                {
                  key: 'time',
                  header: 'Hora',
                  render: (row) => (
                    <span className="font-mono text-xs">
                      {row.startTime} – {row.endTime}
                    </span>
                  ),
                },
                {
                  key: 'price',
                  header: 'Precio',
                  render: (row) => <span className="font-bold">{formatCOP(row.total)}</span>,
                },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'actions',
                  header: 'Acciones',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex items-center justify-end gap-2">
                      <ActionButton label="Ver detalles" onClick={() => setSelected(row)}>
                        <Eye className="h-4 w-4" />
                      </ActionButton>
                      <ActionButton label="Editar" onClick={() => setEditing(row)}>
                        <Pencil className="h-4 w-4" />
                      </ActionButton>
                      <ActionButton
                        label="Cancelar"
                        disabled={row.status === 'CANCELLED' || row.status === 'FINISHED'}
                        onClick={() => handleCancel(row)}
                      >
                        <Ban className="h-4 w-4" />
                      </ActionButton>
                    </div>
                  ),
                },
              ]}
              renderCard={(row) => (
                <div className="flex flex-col gap-3 rounded-2xl border border-text-main/10 bg-club-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase text-club-accent">
                        {row.clientName}
                      </p>
                      <p className="font-mono text-[11px] text-text-muted">{row.code}</p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {row.serviceName} · {formatDate(row.date)} · {row.startTime} – {row.endTime}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">{formatCOP(row.total)}</span>
                    <div className="flex items-center gap-2">
                      <ActionButton label="Ver detalles" onClick={() => setSelected(row)}>
                        <Eye className="h-4 w-4" />
                      </ActionButton>
                      <ActionButton label="Editar" onClick={() => setEditing(row)}>
                        <Pencil className="h-4 w-4" />
                      </ActionButton>
                      <ActionButton
                        label="Cancelar"
                        disabled={row.status === 'CANCELLED' || row.status === 'FINISHED'}
                        onClick={() => handleCancel(row)}
                      >
                        <Ban className="h-4 w-4" />
                      </ActionButton>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </Card>

      <ReservationDetailModal reservation={selected} onClose={() => setSelected(null)} />

      {editing && (
        <ReservationEditModal
          reservation={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function ActionButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-text-main/10 bg-club-bg/70 text-text-muted transition-colors hover:border-club-primary hover:text-club-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
