'use client';

import { useState, type FormEvent } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/api-client';
import type { Reservation } from '@/types/reservation';

interface CancelReservationModalProps {
  reservation: Pick<Reservation, 'code' | 'clientName'> | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelReservationModal({
  reservation,
  onClose,
  onConfirm,
}: CancelReservationModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 5 && trimmedReason.length <= 255;

  if (!reservation) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReasonValid) {
      setError('El motivo debe tener entre 5 y 255 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(trimmedReason);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={`Reserva ${reservation.code}`}
      title="Cancelar reserva"
      footer={
        <>
          <Button type="button" variant="dark" size="sm" onClick={onClose} disabled={loading}>
            Volver
          </Button>
          <Button
            type="submit"
            form="reservation-cancel-form"
            size="sm"
            disabled={loading || !isReasonValid}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              'Cancelar reserva'
            )}
          </Button>
        </>
      }
    >
      <form
        id="reservation-cancel-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-text-main">
          ¿Confirmas la cancelación de la reserva de{' '}
          <span className="font-bold break-words">{reservation.clientName}</span>?
        </p>

        <FormField htmlFor="reservation-cancellation-reason" label="Motivo">
          <textarea
            id="reservation-cancellation-reason"
            value={reason}
            maxLength={255}
            required
            rows={3}
            disabled={loading}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-xl border border-text-main/15 bg-club-bg px-4 py-3 text-sm text-text-main outline-none transition-colors placeholder:text-text-muted focus:border-club-primary focus:ring-2 focus:ring-club-primary/20 disabled:opacity-60"
          />
          <span className="mt-1 block text-right text-[11px] text-text-muted">
            {trimmedReason.length}/255
          </span>
          {!isReasonValid && (
            <span className="mt-1 block text-sm text-red-600" role="status">
              El motivo es obligatorio y debe tener entre 5 y 255 caracteres.
            </span>
          )}
        </FormField>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
