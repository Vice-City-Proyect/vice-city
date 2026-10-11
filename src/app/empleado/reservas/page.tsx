'use client';

import { useState } from 'react';
import { Eye, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge, accessKey } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { formatDate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import { MOCK_SERVICES } from '@/features/services/data/mock-services';
import {
  EMPTY_FILTERS,
  filterReservations,
  type ReservationFilters,
} from '@/features/reservations/data/reservation-filters';
import { ReservationFiltersBar } from '@/features/reservations/components/ReservationFiltersBar';
import { ReservationDetailModal } from '@/features/reservations/components/ReservationDetailModal';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';

const SERVICE_OPTIONS = MOCK_SERVICES.map((service) => service.name);

type ModalMode = 'details' | 'verify' | null;

export default function EmployeeReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS);
  const [filters, setFilters] = useState<ReservationFilters>(EMPTY_FILTERS);
  const [modal, setModal] = useState<{ mode: ModalMode; reservation: Reservation | null }>({
    mode: null,
    reservation: null,
  });

  const filtered = filterReservations(reservations, filters);
  const active = modal.reservation;

  function updateAccess(id: string, access: Reservation['accessStatus']) {
    setReservations((current) =>
      current.map((item) => (item.id === id ? { ...item, accessStatus: access } : item)),
    );
    setModal((current) =>
      current.reservation && current.reservation.id === id
        ? { ...current, reservation: { ...current.reservation, accessStatus: access } }
        : current,
    );
  }

  function openModal(mode: Exclude<ModalMode, null>, reservation: Reservation) {
    setModal({ mode, reservation });
  }

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Reservas del"
        highlightedTitle="día"
        description="Consulta las reservas, verifica el acceso y registra entradas y salidas."
      />

      <Card className="p-5 sm:p-6">
        <ReservationFiltersBar
          filters={filters}
          onChange={setFilters}
          serviceOptions={SERVICE_OPTIONS}
          showQuery={false}
        />

        <div className="mt-5 border-t border-text-main/10 pt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {filtered.length} reserva(s)
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="Sin reservas"
            description="No hay reservas que coincidan con los filtros seleccionados."
          />
        ) : (
          <div className="mt-4">
            <Table
              data={filtered}
              rowKey={(row) => row.id}
              minWidth="70rem"
              columns={[
                {
                  key: 'time',
                  header: 'Franja',
                  render: (row) => (
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold">
                        {row.startTime} – {row.endTime}
                      </span>
                      <span className="text-[11px] text-text-muted">{formatDate(row.date)}</span>
                    </div>
                  ),
                },
                {
                  key: 'client',
                  header: 'Cliente',
                  render: (row) => (
                    <div className="flex flex-col">
                      <span className="font-bold text-club-accent">{row.clientName}</span>
                      <span className="font-mono text-[11px] text-text-muted">{row.code}</span>
                    </div>
                  ),
                },
                {
                  key: 'service',
                  header: 'Servicio / recurso',
                  render: (row) => (
                    <div className="flex flex-col">
                      <span>{row.serviceName}</span>
                      <span className="text-[11px] text-text-muted">{row.resource}</span>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Estado',
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'access',
                  header: 'Acceso',
                  render: (row) => (
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge status={accessKey(row.accessStatus)} />
                      <StatusBadge status={row.qrStatus} />
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Acciones',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex items-center justify-end gap-2">
                      <ActionButton
                        label="Ver detalles"
                        onClick={() => openModal('details', row)}
                      >
                        <Eye className="h-4 w-4" />
                      </ActionButton>
                      <ActionButton
                        label="Verificar acceso"
                        onClick={() => openModal('verify', row)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </ActionButton>
                      <ActionButton
                        label="Registrar entrada"
                        disabled={row.accessStatus === 'INSIDE'}
                        onClick={() => updateAccess(row.id, 'INSIDE')}
                      >
                        <LogIn className="h-4 w-4" />
                      </ActionButton>
                      <ActionButton
                        label="Registrar salida"
                        disabled={row.accessStatus !== 'INSIDE'}
                        onClick={() => updateAccess(row.id, 'EXITED')}
                      >
                        <LogOut className="h-4 w-4" />
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
                      <p className="font-mono text-[11px] text-text-muted">
                        {row.code} · {row.startTime} – {row.endTime}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {row.serviceName} · {row.resource} · {formatDate(row.date)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={accessKey(row.accessStatus)} />
                    <StatusBadge status={row.qrStatus} />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <ActionButton label="Ver detalles" onClick={() => openModal('details', row)}>
                      <Eye className="h-4 w-4" />
                    </ActionButton>
                    <ActionButton
                      label="Verificar acceso"
                      onClick={() => openModal('verify', row)}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </ActionButton>
                    <ActionButton
                      label="Registrar entrada"
                      disabled={row.accessStatus === 'INSIDE'}
                      onClick={() => updateAccess(row.id, 'INSIDE')}
                    >
                      <LogIn className="h-4 w-4" />
                    </ActionButton>
                    <ActionButton
                      label="Registrar salida"
                      disabled={row.accessStatus !== 'INSIDE'}
                      onClick={() => updateAccess(row.id, 'EXITED')}
                    >
                      <LogOut className="h-4 w-4" />
                    </ActionButton>
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </Card>

      <ReservationDetailModal
        reservation={modal.reservation}
        onClose={() => setModal({ mode: null, reservation: null })}
        showAccess
        showQr={modal.mode === 'verify'}
        actions={
          active && active.accessStatus !== 'INSIDE' ? (
            <>
              <button
                type="button"
                onClick={() => setModal({ mode: null, reservation: null })}
                className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:text-text-main"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => updateAccess(active.id, 'INSIDE')}
                className="inline-flex items-center gap-2 rounded-xl bg-club-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-btn-text shadow-sm transition-colors hover:bg-club-primary-hover"
              >
                <LogIn className="h-4 w-4" />
                Registrar entrada
              </button>
            </>
          ) : null
        }
      />
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
