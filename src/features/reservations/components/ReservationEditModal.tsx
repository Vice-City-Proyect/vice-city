'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { formatCOP } from '@/lib/format';
import type { Reservation, ReservationStatus } from '@/types/reservation';
import { RESERVATION_STATUS_OPTIONS, TIME_SLOT_OPTIONS } from '../data/reservation-filters';

interface ReservationEditModalProps {
  reservation: Reservation | null;
  onClose: () => void;
  onSave: (reservation: Reservation) => void;
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

  if (!reservation) return null;

  const target = reservation;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ ...target, date, startTime, guests, status });
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={`Reserva ${reservation.code}`}
      title="Editar reserva"
      footer={
        <>
          <Button variant="dark" size="sm" onClick={onClose}>
            Descartar
          </Button>
          <Button size="sm" type="submit" form="reservation-edit-form">
            Guardar cambios
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
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField htmlFor="edit-time" label="Hora de inicio">
            <Select
              id="edit-time"
              value={startTime}
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
              onChange={(event) => setGuests(Number(event.target.value))}
            />
          </FormField>
        </div>

        <FormField htmlFor="edit-status" label="Estado">
          <Select
            id="edit-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ReservationStatus)}
          >
            {RESERVATION_STATUS_OPTIONS.filter((option) => option.value !== '').map((option) => (
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

        <p className="text-[11px] leading-relaxed text-text-muted">
          El precio aplicado se conserva en la reserva aunque la tarifa del servicio cambie. La
          confirmación final del pago depende del proceso de Stripe.
        </p>
      </form>
    </Modal>
  );
}
