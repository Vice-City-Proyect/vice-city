import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { formatCOP, formatDate, toISODate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';

function isUpcoming(reservation: Reservation): boolean {
  const today = toISODate(new Date());
  return reservation.date >= today && reservation.status !== 'CANCELLED';
}

function sortReservations(a: Reservation, b: Reservation): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.startTime.localeCompare(b.startTime);
}

export function UpcomingReservations() {
  const upcoming = MOCK_RESERVATIONS.filter(isUpcoming).sort(sortReservations).slice(0, 6);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
            Próximas <span className="text-club-primary">reservas</span>
          </h2>
          <p className="text-xs text-text-muted">Agenda ordenada por fecha y franja horaria.</p>
        </div>

        <Link
          href="/admin/reservas"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-club-accent transition-colors hover:text-club-primary-hover"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState
          title="Sin reservas próximas"
          description="No hay reservas programadas para los próximos días."
        />
      ) : (
        <Table
          data={upcoming}
          rowKey={(row) => row.id}
          minWidth="46rem"
          columns={[
            {
              key: 'client',
              header: 'Cliente',
              render: (row) => (
                <span className="font-bold text-club-accent">{row.clientName}</span>
              ),
            },
            { key: 'service', header: 'Servicio', render: (row) => row.serviceName },
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
              key: 'status',
              header: 'Estado',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'price',
              header: 'Precio',
              className: 'text-right',
              render: (row) => (
                <span className="font-bold">{formatCOP(row.total)}</span>
              ),
            },
          ]}
          renderCard={(row) => (
            <div className="flex flex-col gap-2 rounded-2xl border border-text-main/10 bg-club-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-black uppercase text-club-accent">
                  {row.clientName}
                </span>
                <StatusBadge status={row.status} />
              </div>
              <p className="text-xs text-text-muted">
                {row.serviceName} · {formatDate(row.date)} · {row.startTime} – {row.endTime}
              </p>
              <span className="text-sm font-bold">{formatCOP(row.total)}</span>
            </div>
          )}
        />
      )}
    </Card>
  );
}
