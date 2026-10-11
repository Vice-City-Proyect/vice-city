import Link from 'next/link';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, paymentKey } from '@/components/ui/StatusBadge';
import { formatCOP, formatDate, toISODate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import { MOCK_RESERVATIONS } from '../data/mock-reservations';

export function ClientNextReservation({ clientId }: { clientId: string }) {
  const today = toISODate(new Date());

  const next = MOCK_RESERVATIONS.filter(
    (reservation: Reservation) =>
      reservation.clientId === clientId &&
      reservation.date >= today &&
      reservation.status !== 'CANCELLED' &&
      reservation.status !== 'FINISHED',
  ).sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
          Tu próxima <span className="text-club-primary">reserva</span>
        </h2>
        <p className="text-xs text-text-muted">Detalle de la reserva más cercana.</p>
      </div>

      {!next ? (
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

          <dl className="grid grid-cols-2 gap-4 border-t border-text-main/10 pt-4 text-xs">
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
