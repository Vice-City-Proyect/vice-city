'use client';

import { useMemo, useState } from 'react';
import { Eye, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge, accessKey } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { formatDate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import {
  EMPTY_FILTERS,
  filterReservations,
  type ReservationFilters,
} from '@/features/reservations/data/reservation-filters';
import { ReservationFiltersBar } from '@/features/reservations/components/ReservationFiltersBar';
import { ReservationDetailModal } from '@/features/reservations/components/ReservationDetailModal';
import { RemoteStatus } from '@/features/reservations/components/RemoteStatus';
import { useEmployeeSummary } from '@/features/reservations/hooks/use-employee-summary';

type ModalMode = 'details' | 'verify' | null;

/**
 * Reservas del día para el equipo de empleados. Los datos salen de GET /api/employee/summary.
 * El ingreso y la salida se registran en la validación de QR, no desde esta tabla.
 */
export default function EmployeeReservationsPage() {
  const { data, loading, error, reload } = useEmployeeSummary();
  const [filters, setFilters] = useState<ReservationFilters>(EMPTY_FILTERS);
  const [modal, setModal] = useState<{ mode: ModalMode; reservation: Reservation | null }>({
    mode: null,
    reservation: null,
  });

  const reservations = useMemo(() => data?.reservations ?? [], [data]);
  const serviceOptions = useMemo(
    () => Array.from(new Set(reservations.map((reservation) => reservation.serviceName))).sort(),
    [reservations],
  );
  const filtered = filterReservations(reservations, filters);

  function openModal(mode: Exclude<ModalMode, null>, reservation: Reservation) {
    setModal({ mode, reservation });
  }

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Reservas del"
        highlightedTitle="día"
        description="Consulta las reservas de hoy y verifica el estado del tiquete y del acceso."
      />

      <Card className="p-5 sm:p-6">
        <ReservationFiltersBar
          filters={filters}
          onChange={setFilters}
          serviceOptions={serviceOptions}
          showQuery={false}
        />

        <div className="mt-5 border-t border-text-main/10 pt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {data ? `${filtered.length} reserva(s)` : 'Reservas'}
          </span>
        </div>

        <div className="mt-4">
          <RemoteStatus
            loading={loading}
            error={error}
            onRetry={reload}
            loadingLabel="Cargando las reservas de hoy..."
          />
        </div>

        {data && filtered.length === 0 && (
          <EmptyState
            className="mt-4"
            title="Sin reservas"
            description={
              reservations.length === 0
                ? 'No hay reservas confirmadas para hoy.'
                : 'No hay reservas que coincidan con los filtros seleccionados.'
            }
          />
        )}

        {data && filtered.length > 0 && (
          <div className="mt-4">
            <Table
              data={filtered}
              rowKey={(row) => row.id}
              minWidth="60rem"
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
      />
    </>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-text-main/10 bg-club-bg/70 text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
    >
      {children}
    </button>
  );
}
