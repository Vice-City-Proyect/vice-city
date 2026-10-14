'use client';

import { useMemo, useState } from 'react';
import { CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StatusBadge, paymentKey } from '@/components/ui/StatusBadge';
import { formatCOP, formatDate, toISODate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import { MOCK_CLIENT_SESSION } from '@/features/auth/data/mock-session';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';
import { ReservationDetailModal } from '@/features/reservations/components/ReservationDetailModal';
import { clientSection } from '@/features/reservations/data/reservation-filters';

type SectionKey = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

const SECTION_LABELS: Record<SectionKey, string> = {
  UPCOMING: 'Próximas',
  COMPLETED: 'Completadas',
  CANCELLED: 'Canceladas',
};

export default function ClientReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS.filter(
    (reservation) => reservation.clientId === MOCK_CLIENT_SESSION.id,
  ));
  const [section, setSection] = useState<SectionKey>('UPCOMING');
  const [selected, setSelected] = useState<Reservation | null>(null);

  const today = toISODate(new Date());

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

  function canCancel(reservation: Reservation): boolean {
    return (
      reservation.date >= today &&
      (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED')
    );
  }

  function handleCancel(reservation: Reservation) {
    setReservations((current) =>
      current.map((item) =>
        item.id === reservation.id
          ? { ...item, status: 'CANCELLED', qrStatus: 'CANCELLED' }
          : item,
      ),
    );
    setSelected((current) =>
      current && current.id === reservation.id
        ? { ...current, status: 'CANCELLED', qrStatus: 'CANCELLED' }
        : current,
    );
  }

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
              label: `${SECTION_LABELS[key]} (${counts[key]})`,
            }))}
            value={section}
            onChange={setSection}
          />
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          title="No hay reservas en esta sección"
          description="Cuando realices una reserva aparecerá aquí con su estado y tiquete digital."
          action={
            <Button size="sm" onClick={() => setSection('UPCOMING')}>
              Ver próximas
            </Button>
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
                {canCancel(reservation) && (
                  <Button
                    size="sm"
                    className="border border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    onClick={() => handleCancel(reservation)}
                  >
                    Cancelar reserva
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-[11px] leading-relaxed text-text-muted">
        <CalendarX className="h-4 w-4 shrink-0" />
        El MVP no aplica reembolsos por cancelación. La reserva cancelada queda registrada con su
        estado y no genera devolución de dinero.
      </p>

      <ReservationDetailModal
        reservation={selected}
        onClose={() => setSelected(null)}
        showQr
        actions={
          selected && canCancel(selected) ? (
            <Button
              size="sm"
              className="border border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20"
              onClick={() => handleCancel(selected)}
            >
              Cancelar reserva
            </Button>
          ) : (
            <Button variant="dark" size="sm" onClick={() => setSelected(null)}>
              Cerrar
            </Button>
          )
        }
      />
    </>
  );
}
