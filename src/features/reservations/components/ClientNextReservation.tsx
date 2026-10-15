'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, paymentKey } from '@/components/ui/StatusBadge';
import { formatCOP, formatDate, toBogotaISODate } from '@/lib/format';
import { useMyReservations } from '../hooks/use-my-reservations';

const NEXT_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];

/**
 * Tarjeta "Tu próxima reserva": la reserva vigente más cercana del cliente con sesión.
 * Los datos salen de GET /api/reservations (el backend limita el resultado al usuario).
 */
export function ClientNextReservation() {
  // Se piden varias porque algunas del día pueden haber terminado o no estar confirmadas.
  const { data, loading, error, reload } = useMyReservations({
    dateFrom: toBogotaISODate(),
    order: 'asc',
    limit: 20,
  });

  const next = data?.items.find((reservation) =>
    NEXT_RESERVATION_STATUSES.includes(reservation.status),
  );

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
          Tu próxima <span className="text-club-primary">reserva</span>
        </h2>
        <p className="text-xs text-text-muted">Detalle de la reserva más cercana.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-text-muted" role="status">
          <RefreshCw className="h-5 w-5 animate-spin text-club-primary" />
          <span className="text-xs font-bold uppercase tracking-wider">Cargando...</span>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="font-bold">{error}</span>
            <button
              type="button"
              onClick={reload}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-400/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-red-500/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        </div>
      ) : !next ? (
        <EmptyState
          icon={<CalendarClock className="h-5 w-5" />}
          title="Sin reservas próximas"
          description="Reserva una instalación y aparecerá aquí con todos sus datos."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={next.status} />
            <StatusBadge status={paymentKey(next.paymentStatus)} />
            <StatusBadge status={next.type} />
          </div>

          <div>
            <p className="text-xl font-black uppercase leading-tight tracking-tight text-club-accent">
              {next.serviceName}
            </p>
            <p className="text-xs text-text-muted">{next.resource}</p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-text-main/10 pt-4 text-xs">
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Fecha</dt>
              <dd className="mt-1 font-bold text-text-main">{formatDate(next.date)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Horario</dt>
              <dd className="mt-1 font-mono font-bold text-text-main">
                {next.startTime} – {next.endTime}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Personas</dt>
              <dd className="mt-1 font-bold text-text-main">{next.guests}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Total</dt>
              <dd className="mt-1 font-bold text-club-accent">{formatCOP(next.total)}</dd>
            </div>
          </dl>

          <Link
            href="/cliente/reservas"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-club-accent transition-colors hover:text-club-primary-hover"
          >
            Ver todas mis reservas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </Card>
  );
}
