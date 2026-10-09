import type { ReactNode } from 'react';
import { QrCode, Waves } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  StatusBadge,
  accessKey,
  holdKey,
  paymentKey,
} from '@/components/ui/StatusBadge';
import type { Reservation } from '@/types/reservation';
import { formatCOP, formatDate, formatLongDate } from '@/lib/format';
import { HoldCountdown } from './HoldCountdown';

const WRISTBAND_LABELS: Record<Reservation['wristbandColor'], string> = {
  BLUE: 'Azul',
  PURPLE: 'Morado',
  GREEN: 'Verde',
  RED: 'Rojo',
};

interface DetailRow {
  label: string;
  value: ReactNode;
}

function InfoGrid({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-1">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {row.label}
          </dt>
          <dd className="text-sm font-bold text-text-main">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ReservationDetailModalProps {
  reservation: Reservation | null;
  onClose: () => void;
  showQr?: boolean;
  showAccess?: boolean;
  actions?: ReactNode;
}

export function ReservationDetailModal({
  reservation,
  onClose,
  showQr = false,
  showAccess = false,
  actions,
}: ReservationDetailModalProps) {
  if (!reservation) return null;

  const holdStatus = holdKey(reservation.holdState);

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={`Reserva ${reservation.code}`}
      title={reservation.serviceName}
      footer={actions}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={reservation.status} />
          <StatusBadge status={paymentKey(reservation.paymentStatus)} />
          {holdStatus && <StatusBadge status={holdStatus} />}
          <StatusBadge status={reservation.type} />
          <StatusBadge status={reservation.createdBy} />
        </div>

        {reservation.holdState === 'ACTIVE' && reservation.holdExpiresAt && (
          <HoldCountdown expiresAt={reservation.holdExpiresAt} />
        )}

        {reservation.holdState === 'EXPIRED' && (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-600">
            El tiempo de pago (HOLD) expiró y la capacidad fue liberada. Esta reserva quedó
            pendiente de confirmación.
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-club-accent">
            Información de la reserva
          </h3>
          <InfoGrid
            rows={[
              { label: 'Cliente', value: reservation.clientName },
              { label: 'Recurso físico', value: reservation.resource },
              { label: 'Fecha', value: formatLongDate(reservation.date) },
              {
                label: 'Horario',
                value: (
                  <span className="font-mono text-sm">
                    {reservation.startTime} – {reservation.endTime}
                  </span>
                ),
              },
              { label: 'Duración', value: `${reservation.hours} hora(s)` },
              { label: 'Personas', value: String(reservation.guests) },
            ]}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-club-accent">
            Pago
          </h3>
          <div className="rounded-2xl border border-text-main/10 bg-club-bg/60 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-text-muted">Valor base</span>
              <span className="font-bold">{formatCOP(reservation.basePrice)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-text-muted">
                Descuento {reservation.discountPercent > 0 ? `(${reservation.discountPercent}%)` : ''}
              </span>
              <span className="font-bold text-club-accent">
                {reservation.discountPercent > 0
                  ? `-${formatCOP(reservation.basePrice - reservation.total)}`
                  : 'Sin descuento'}
              </span>
            </div>
            {reservation.discountType === 'WEDNESDAY' && (
              <p className="mt-2 text-[11px] text-text-muted">
                Descuento de miércoles. No se acumula con otros descuentos.
              </p>
            )}
            {reservation.discountType === 'FULL_POOL' && (
              <p className="mt-2 text-[11px] text-text-muted">
                Descuento por reserva de piscina completa. No se acumula con otros descuentos.
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-text-main/10 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-main">
                Total
              </span>
              <span className="text-lg font-black text-club-accent">
                {formatCOP(reservation.total)}
              </span>
            </div>
          </div>
        </section>

        {showAccess && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-club-accent">
              Control de acceso
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={accessKey(reservation.accessStatus)} />
              <span className="inline-flex items-center gap-2 rounded-full bg-club-bg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <Waves className="h-3.5 w-3.5" />
                Pulsera {WRISTBAND_LABELS[reservation.wristbandColor]}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-text-muted">
              El acceso termina cuando finaliza la franja reservada. El QR es transferible: no se
              valida la identidad de quien lo presenta.
            </p>
          </section>
        )}

        {showQr && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-club-accent">
              Tiquete digital
            </h3>
            <div className="flex items-center gap-4 rounded-2xl border border-text-main/10 bg-club-bg/60 p-4">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-club-surface text-club-accent">
                <QrCode className="h-12 w-12" />
              </span>
              <div className="flex flex-col gap-2">
                <StatusBadge status={reservation.qrStatus} />
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Válido únicamente durante la franja reservada ({reservation.startTime} –{' '}
                  {reservation.endTime}) del {formatDate(reservation.date)}.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
