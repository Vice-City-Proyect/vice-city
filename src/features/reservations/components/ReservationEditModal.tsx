'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { getErrorMessage } from '@/lib/api-client';
import { formatCOP } from '@/lib/format';
import type { Reservation, ReservationStatus } from '@/types/reservation';
import { RESERVATION_STATUS_OPTIONS, TIME_SLOT_OPTIONS } from '../data/reservation-filters';

export interface StatusNotification {
  id: number;
  message: string;
  status: ReservationStatus;
}

export function createStatusNotification(nextStatus: ReservationStatus): StatusNotification {
  const statusLabel =
    RESERVATION_STATUS_OPTIONS.find((option) => option.value === nextStatus)?.label ?? nextStatus;
  return {
    id: Date.now(),
    message: `Estado de la reserva actualizado a: ${statusLabel}`,
    status: nextStatus,
  };
}

const STATUS_NOTIFICATION_STYLES: Record<
  ReservationStatus,
  { border: string; bg: string; text: string }
> = {
  CONFIRMED: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-800',
  },
  PENDING: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-800',
  },
  CANCELLED: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    text: 'text-red-800',
  },
  IN_PROGRESS: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-800',
  },
  FINISHED: {
    border: 'border-text-main/20',
    bg: 'bg-club-bg/80',
    text: 'text-text-main',
  },
};

function NotificationIcon({ status }: { status: ReservationStatus }) {
  switch (status) {
    case 'CONFIRMED':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
    case 'CANCELLED':
      return <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />;
    case 'PENDING':
      return <Clock className="h-4 w-4 shrink-0 text-amber-600" />;
    default:
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-club-primary" />;
  }
}

const EDITABLE_STATUS_OPTIONS = RESERVATION_STATUS_OPTIONS.filter(
  (option) => option.value === 'PENDING' || option.value === 'CONFIRMED',
);

interface ReservationEditModalProps {
  reservation: Reservation | null;
  onClose: () => void;
  onSave: (reservation: Reservation) => Promise<void>;
}

export function ReservationEditModal({
  reservation,
  onClose,
  onSave,
}: ReservationEditModalProps) {
  const [date, setDate] = useState(reservation?.date ?? '');
  const [startTime, setStartTime] = useState(reservation?.startTime ?? '');
  const [guests, setGuests] = useState(reservation?.guests ?? 1);
  const [status, setStatus] = useState<ReservationStatus>(reservation?.status ?? 'PENDING');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<StatusNotification | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleStatusChange(nextStatus: ReservationStatus) {
    if (nextStatus === status) return;
    setStatus(nextStatus);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const nextNotification = createStatusNotification(nextStatus);
    setNotification(nextNotification);

    timerRef.current = setTimeout(() => {
      setNotification(null);
      timerRef.current = null;
    }, 4000);
  }

  function dismissNotification() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotification(null);
  }

  if (!reservation) return null;

  const target = reservation;
  const statusIsEditable = EDITABLE_STATUS_OPTIONS.some(
    (option) => option.value === reservation.status,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...target, date, startTime, guests, status });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={`Reserva ${reservation.code}`}
      title="Editar reserva"
      footer={
        <>
          <Button variant="dark" size="sm" onClick={onClose} disabled={saving}>
            Descartar
          </Button>
          <Button size="sm" type="submit" form="reservation-edit-form" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <form id="reservation-edit-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-2xl border border-text-main/10 bg-club-bg/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-main break-words">
            {reservation.clientName}
          </p>
          <p className="mt-1 text-xs text-text-muted break-words">
            {reservation.serviceName} · {reservation.resource}
          </p>
        </div>

        <FormField htmlFor="edit-date" label="Fecha">
          <Input
            id="edit-date"
            type="date"
            value={date}
            disabled={saving}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="edit-time" label="Hora de inicio">
            <Select
              id="edit-time"
              value={startTime}
              disabled={saving}
              onChange={(event) => setStartTime(event.target.value)}
            >
              {TIME_SLOT_OPTIONS.filter((option) => option.value !== '').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField htmlFor="edit-guests" label="Personas">
            <Input
              id="edit-guests"
              type="number"
              min={1}
              max={reservation.category === 'POOL' ? 50 : 11}
              value={guests}
              disabled={saving}
              onChange={(event) => setGuests(Number(event.target.value))}
            />
          </FormField>
        </div>

        <FormField htmlFor="edit-status" label="Estado">
          <Select
            id="edit-status"
            value={status}
            disabled={saving || !statusIsEditable}
            onChange={(event) => {
              const nextStatus = event.target.value as ReservationStatus;
              if (nextStatus === 'PENDING' || nextStatus === 'CONFIRMED') {
                handleStatusChange(nextStatus);
              }
            }}
          >
            {!statusIsEditable && (
              <option value={reservation.status}>
                {RESERVATION_STATUS_OPTIONS.find(
                  (option) => option.value === reservation.status,
                )?.label ?? reservation.status}
              </option>
            )}
            {EDITABLE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        {notification && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs shadow-xs transition-all duration-200 ${
              STATUS_NOTIFICATION_STYLES[notification.status]?.border ?? 'border-club-primary/40'
            } ${STATUS_NOTIFICATION_STYLES[notification.status]?.bg ?? 'bg-club-primary/15'} ${
              STATUS_NOTIFICATION_STYLES[notification.status]?.text ?? 'text-club-accent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <NotificationIcon status={notification.status} />
              <span className="font-semibold">{notification.message}</span>
            </div>

            <button
              type="button"
              aria-label="Cerrar notificación"
              title="Cerrar notificación"
              onClick={dismissNotification}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-black/5 hover:text-club-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-text-main/10 bg-club-bg/60 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Total registrado
          </span>
          <span className="text-sm font-black text-club-accent">
            {formatCOP(reservation.total)}
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-text-muted">
          El precio aplicado se conserva en la reserva aunque la tarifa del servicio cambie. La
          confirmación final del pago depende del proceso de Stripe.
        </p>
      </form>
    </Modal>
  );
}
