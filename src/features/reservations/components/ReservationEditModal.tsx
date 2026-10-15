'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { getErrorMessage } from '@/lib/api-client';
import { formatCOP } from '@/lib/format';
import type { Reservation, ReservationStatus } from '@/types/reservation';
import { RESERVATION_STATUS_OPTIONS, TIME_SLOT_OPTIONS } from '../data/reservation-filters';

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
          <p className="text-xs font-bold uppercase tracking-wider text-text-main">
            {reservation.clientName}
          </p>
          <p className="mt-1 text-xs text-text-muted">
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
              const nextStatus = event.target.value;
              if (nextStatus === 'PENDING' || nextStatus === 'CONFIRMED') {
                setStatus(nextStatus);
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

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-text-main/10 bg-club-bg/60 px-4 py-3">
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
