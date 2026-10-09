'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { QrCode, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import {
  StatusBadge,
  accessKey,
  paymentKey,
} from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format';
import type { Reservation } from '@/types/reservation';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';

export function AccessControl() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Reservation | null>(null);
  const [searched, setSearched] = useState(false);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim().toLowerCase();
    const found = term
      ? MOCK_RESERVATIONS.find(
          (reservation) =>
            reservation.code.toLowerCase() === term ||
            reservation.clientName.toLowerCase().includes(term),
        )
      : undefined;
    setResult(found ?? null);
    setSearched(true);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
          Control de <span className="text-club-primary">acceso</span>
        </h2>
        <p className="text-xs text-text-muted">
          Busca una reserva por código o cliente para consultar su estado de tiquete y acceso.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField
          htmlFor="access-search"
          label="Buscar reserva o cliente"
          className="flex-1"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              id="access-search"
              type="search"
              placeholder="VC-2401 o Laura Mendoza"
              className="pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </FormField>

        <Button size="sm" type="submit" className="sm:mb-0.5">
          Buscar
        </Button>
      </form>

      <div className="mt-5 border-t border-text-main/10 pt-5">
        {!searched ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="Ingresa un criterio de búsqueda"
            description="Escribe el código de la reserva o el nombre del cliente para ver la información de acceso."
          />
        ) : !result ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Reserva no encontrada"
            description={`No encontramos resultados para “${query}”. Verifica el código o el nombre del cliente.`}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={result.status} />
              <StatusBadge status={paymentKey(result.paymentStatus)} />
              <StatusBadge status={accessKey(result.accessStatus)} />
              <StatusBadge status={result.qrStatus} />
            </div>

            <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-text-main/10 bg-club-bg/60 p-4 text-xs sm:grid-cols-2">
              <Info label="Cliente" value={result.clientName} />
              <Info label="Servicio" value={result.serviceName} />
              <Info label="Recurso" value={result.resource} />
              <Info label="Fecha" value={formatDate(result.date)} />
              <Info label="Horario" value={`${result.startTime} – ${result.endTime}`} mono />
              <Info label="Código" value={result.code} mono />
            </dl>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                href="/empleado/qr"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-club-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-btn-text shadow-sm transition-colors hover:bg-club-primary-hover"
              >
                <QrCode className="h-4 w-4" />
                Ir a validación QR
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className={`font-bold text-text-main ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
