'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StatusBadge, paymentKey } from '@/components/ui/StatusBadge';
import { formatCOP, formatDate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import { ReservationDetailModal } from '@/features/reservations/components/ReservationDetailModal';
import { clientSection } from '@/features/reservations/data/reservation-filters';
import { useMyReservations } from '@/features/reservations/hooks/use-my-reservations';

type SectionKey = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

const SECTION_LABELS: Record<SectionKey, string> = {
  UPCOMING: 'Próximas',
  COMPLETED: 'Completadas',
  CANCELLED: 'Canceladas',
};

/** Máximo permitido por el backend en una sola consulta. */
const PAGE_LIMIT = 100;

export default function ClientReservationsPage() {
  const { data, loading, error, reload } = useMyReservations({ limit: PAGE_LIMIT, order: 'desc' });
  const [section, setSection] = useState<SectionKey>('UPCOMING');
  const [selected, setSelected] = useState<Reservation | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutParam = urlParams.get('checkout');
    const bookingIdParam = urlParams.get('bookingId');

    if (checkoutParam === 'success' && bookingIdParam) {
      fetch('/api/payments/checkout/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingIdParam }),
      })
        .then((res) => res.json())
        .then(() => {
          window.history.replaceState({}, '', '/cliente/reservas');
          reload();
        })
        .catch(() => {
          reload();
        });
    } else if (checkoutParam === 'cancelled') {
      window.history.replaceState({}, '', '/cliente/reservas');
      reload();
    }
  }, [reload]);

  const reservations = useMemo(() => data?.items ?? [], [data]);
  const total = data?.pagination.total ?? 0;

  const counts = useMemo(
    () => ({
      UPCOMING: reservations.filter((item) => clientSection(item) === 'UPCOMING').length,
      COMPLETED: reservations.filter((item) => clientSection(item) === 'COMPLETED').length,
      CANCELLED: reservations.filter((item) => clientSection(item) === 'CANCELLED').length,
    }),
    [reservations],
  );

  const visible = reservations
    .filter((item) => clientSection(item) === section)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mis"
        highlightedTitle="reservas"
        description="Consulta el estado de tus reservas, su detalle y tu tiquete digital."
        actions={
          <SegmentedTabs
            ariaLabel="Sección de reservas"
            options={(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => ({
              value: key,
              label: loading || error ? SECTION_LABELS[key] : `${SECTION_LABELS[key]} (${counts[key]})`,
            }))}
            value={section}
            onChange={setSection}
          />
        }
      />

      {loading ? (
        <div className="flex items-center gap-3 text-text-muted" role="status">
          <RefreshCw className="h-5 w-5 animate-spin text-club-primary" />
          <span className="text-xs font-bold uppercase tracking-wider">Cargando tus reservas...</span>
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
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            reservations.length === 0
              ? 'Aún no tienes reservas'
              : 'No hay reservas en esta sección'
          }
          description="Cuando realices una reserva aparecerá aquí con su estado y tiquete digital."
          action={
            section !== 'UPCOMING' && reservations.length > 0 ? (
              <Button size="sm" onClick={() => setSection('UPCOMING')}>
                Ver próximas
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((reservation) => (
            <Card key={reservation.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] font-bold text-text-muted">
                    {reservation.code}
                  </span>
                  <h3 className="text-lg font-black uppercase leading-tight tracking-tight text-club-accent">
                    {reservation.serviceName}
                  </h3>
                  <span className="text-xs text-text-muted">{reservation.resource}</span>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <StatusBadge status={reservation.status} />
                  <StatusBadge status={paymentKey(reservation.paymentStatus)} />
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-text-main/10 pt-4 text-xs">
                <div>
                  <dt className="font-bold uppercase tracking-wider text-text-muted">Fecha</dt>
                  <dd className="mt-1 font-bold text-text-main">{formatDate(reservation.date)}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wider text-text-muted">Horario</dt>
                  <dd className="mt-1 font-mono font-bold text-text-main">
                    {reservation.startTime} – {reservation.endTime}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wider text-text-muted">
                    Personas
                  </dt>
                  <dd className="mt-1 font-bold text-text-main">{reservation.guests}</dd>
                </div>
                <div>
                  <dt className="font-bold uppercase tracking-wider text-text-muted">Total</dt>
                  <dd className="mt-1 font-bold text-club-accent">
                    {formatCOP(reservation.total)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2 border-t border-text-main/10 pt-4 sm:flex-row sm:justify-end">
                <Button variant="dark" size="sm" onClick={() => setSelected(reservation)}>
                  Ver detalle y QR
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && total > reservations.length && (
        <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
          Mostrando tus {reservations.length} reservas más recientes de {total}.
        </p>
      )}

      <p className="mt-6 flex items-center gap-2 text-[11px] leading-relaxed text-text-muted">
        <CalendarX className="h-4 w-4 shrink-0" />
        El MVP no contempla cancelaciones ni reembolsos por parte del cliente. Las reservas cuyo
        pago no se completó en 10 minutos se liberan y aparecen como canceladas.
      </p>

      <ReservationDetailModal
        reservation={selected}
        onClose={() => setSelected(null)}
        showQr
        actions={
          <Button variant="dark" size="sm" onClick={() => setSelected(null)}>
            Cerrar
          </Button>
        }
      />
    </>
  );
}
