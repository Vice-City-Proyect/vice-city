'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Ban, Eye, Pencil, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { formatCOP, formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/api-client';
import type { Reservation } from '@/types/reservation';
import { fetchServices } from '@/features/services/api/services.api';
import { AdminReservationFiltersBar, type AdminReservationFilters } from '@/features/reservations/components/AdminReservationFiltersBar';
import { AdminReservationPagination } from '@/features/reservations/components/AdminReservationPagination';
import { CancelReservationModal } from '@/features/reservations/components/CancelReservationModal';
import { ReservationDetailModal } from '@/features/reservations/components/ReservationDetailModal';
import { ReservationEditModal } from '@/features/reservations/components/ReservationEditModal';
import {
  cancelAdminReservation,
  fetchAdminReservations,
  updateAdminReservation,
} from '@/features/reservations/api/reservations.api';
import type { AdminReservation } from '@/features/reservations/types/admin-reservations.types';

const PAGE_SIZE = 10;

const EMPTY_FILTERS: AdminReservationFilters = {
  search: '',
  date: '',
  serviceId: '',
  status: 'ALL',
  slot: '',
};

interface ServiceOption {
  id: string;
  name: string;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [filters, setFilters] = useState<AdminReservationFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [canceling, setCanceling] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [retryServices, setRetryServices] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(filters.search);
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [filters.search]);

  useEffect(() => {
    let active = true;

    fetchServices()
      .then((records) => {
        if (!active) return;
        setServices(records.map(({ id, name }) => ({ id, name })));
        setServicesError(null);
      })
      .catch((err: unknown) => {
        if (active) setServicesError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryServices]);

  useEffect(() => {
    let active = true;

    fetchAdminReservations({
      page,
      limit: PAGE_SIZE,
      status: filters.status,
      serviceId: filters.serviceId,
      date: filters.date,
      slot: filters.slot,
      search,
    })
      .then(({ items, pagination }) => {
        if (!active) return;
        setReservations(items);
        setTotal(pagination.total);
        setTotalPages(pagination.totalPages);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, filters.status, filters.serviceId, filters.date, filters.slot, search, reload]);

  function updateFilters(next: AdminReservationFilters) {
    if (next.search === filters.search) setLoading(true);
    setFilters(next);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setPage(nextPage);
  }

  function retry() {
    setError(null);
    setServicesError(null);
    setLoading(true);
    setServicesLoading(true);
    setReload((current) => current + 1);
    setRetryServices((current) => current + 1);
  }

  async function handleSave(updated: Reservation) {
    if (!editing) return;

    await updateAdminReservation(updated.id, {
      date: updated.date,
      startTime: updated.startTime,
      guests: updated.guests,
      ...(updated.status !== editing.status ? { status: updated.status } : {}),
    });
    setEditing(null);
    setLoading(true);
    setReload((current) => current + 1);
  }

  async function handleCancel(reason: string) {
    if (!canceling) return;

    await cancelAdminReservation(canceling.id, {
      status: 'CANCELLED',
      ...(reason ? { cancellationReason: reason } : {}),
    });
    setCanceling(null);
    setSelected(null);
    setEditing(null);
    setLoading(true);
    setReload((current) => current + 1);
  }

  const retryButton = (
    <button
      type="button"
      onClick={retry}
      className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-400/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-red-500/10"
    >
      <RefreshCw className="h-3.5 w-3.5" />
      Reintentar
    </button>
  );

  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="Reservas del"
        highlightedTitle="complejo"
        description="Consulta, filtra y administra todas las reservas del complejo deportivo."
      />

      {(error || servicesError) && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="font-bold">{error ?? servicesError}</span>
            {retryButton}
          </div>
        </div>
      )}

      <Card className="p-5 sm:p-6">
        <AdminReservationFiltersBar
          filters={filters}
          onChange={updateFilters}
          serviceOptions={services}
        />

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-text-main/10 pt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {loading ? 'Cargando reservas...' : `${total} reserva(s)`}
          </span>
        </div>

        {loading || servicesLoading ? (
          <div className="mt-6 flex items-center gap-3 text-text-muted">
            <RefreshCw className="h-5 w-5 animate-spin text-club-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Cargando...</span>
          </div>
        ) : reservations.length === 0 ? (
          <EmptyState
            className="mt-5"
            title="Sin resultados"
            description="Ajusta los filtros o la búsqueda para encontrar una reserva."
          />
        ) : (
          <div className="mt-4">
            <Table
              data={reservations}
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
                    <div className="flex flex-col">
                      <span className="font-bold text-club-accent">{row.clientName}</span>
                      <span className="text-[11px] text-text-muted">{row.clientEmail}</span>
                    </div>
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
                        onClick={() => setCanceling(row)}
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
                        onClick={() => setCanceling(row)}
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

        {!loading && !servicesLoading && !error && !servicesError && (
          <AdminReservationPagination
            page={page}
            totalPages={totalPages}
            onPageChange={changePage}
          />
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

      <CancelReservationModal
        reservation={canceling}
        onClose={() => setCanceling(null)}
        onConfirm={handleCancel}
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
