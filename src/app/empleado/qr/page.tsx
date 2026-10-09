'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  QrCode,
  ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge, accessKey, paymentKey } from '@/components/ui/StatusBadge';
import { formatDate, toISODate } from '@/lib/format';
import type { QrStatus, Reservation, WristbandColor } from '@/types/reservation';
import { MOCK_RESERVATIONS } from '@/features/reservations/data/mock-reservations';

type ScanPhase = 'idle' | 'scanning' | 'result';

interface Scenario {
  state: QrStatus;
  reservationId?: string;
  hint: string;
}

const SCENARIOS: Scenario[] = [
  { state: 'VALID', reservationId: 'vc-2401', hint: 'QR válido (entrada tardía permitida)' },
  { state: 'USED', reservationId: 'vc-2380', hint: 'QR ya usado' },
  { state: 'EXPIRED', reservationId: 'vc-2408', hint: 'QR expirado por HOLD' },
  { state: 'OUTSIDE_TIME', reservationId: 'vc-2409', hint: 'Fuera de la franja válida' },
  { state: 'CANCELLED', reservationId: 'vc-2361', hint: 'Reserva cancelada' },
  { state: 'NOT_FOUND', hint: 'Reserva no encontrada' },
];

const QR_LABELS: Record<QrStatus, string> = {
  VALID: 'Válido',
  USED: 'Usado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
  OUTSIDE_TIME: 'Fuera de horario',
  NOT_FOUND: 'No encontrado',
};

const WRISTBAND_LABELS: Record<WristbandColor, string> = {
  BLUE: 'Azul',
  PURPLE: 'Morado',
  GREEN: 'Verde',
  RED: 'Rojo',
};

function isLateEntry(reservation: Reservation): boolean {
  const today = toISODate(new Date());
  const now = new Date().toTimeString().slice(0, 5);
  return reservation.date === today && reservation.startTime < now;
}

export default function EmployeeQrPage() {
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reservation = scenario?.reservationId
    ? MOCK_RESERVATIONS.find((item) => item.id === scenario.reservationId) ?? null
    : null;

  function handleScan() {
    const next = SCENARIOS[scenarioIndex % SCENARIOS.length];
    setScenario(next);
    setAuthorized(false);
    setPhase('scanning');
    setScenarioIndex((current) => current + 1);

    timeoutRef.current = setTimeout(() => setPhase('result'), 700);
  }

  function handleReset() {
    setPhase('idle');
    setScenario(null);
    setAuthorized(false);
  }

  const state: QrStatus | null = phase === 'result' ? scenario?.state ?? null : null;
  const canAuthorize = state === 'VALID' && !authorized;

  return (
    <>
      <PageHeader
        eyebrow="Validación"
        title="Lector de"
        highlightedTitle="QR"
        description="Simula el escaneo de tiquetes y consulta los estados visuales de validación."
        actions={
          <span className="rounded-xl border border-text-main/10 bg-club-surface px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Demostración sin cámara real
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
              Área de <span className="text-club-primary">escaneo</span>
            </h2>
            <p className="text-xs text-text-muted">
              Cada simulación recorre un estado distinto del tiquete.
            </p>
          </div>

          <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed border-text-main/20 bg-club-bg/60 px-6 py-10 text-center">
            <span
              className={`flex h-24 w-24 items-center justify-center rounded-3xl border-2 transition-colors ${
                phase === 'scanning'
                  ? 'animate-pulse border-club-primary bg-club-primary/20 text-club-accent'
                  : 'border-text-main/20 bg-club-surface text-text-muted'
              }`}
            >
              {phase === 'scanning' ? (
                <ScanLine className="h-10 w-10" />
              ) : (
                <QrCode className="h-10 w-10" />
              )}
            </span>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-black uppercase tracking-wider text-club-accent">
                {phase === 'idle' && 'Esperando escaneo'}
                {phase === 'scanning' && 'Escaneando...'}
                {phase === 'result' && 'Escaneo completado'}
              </span>
              <span className="text-xs text-text-muted">
                {phase === 'idle'
                  ? 'Coloca el tiquete dentro del área marcada.'
                  : scenario?.hint ?? ''}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button size="sm" onClick={handleScan} disabled={phase === 'scanning'}>
                <Camera className="h-4 w-4" />
                Simular escaneo
              </Button>
              {phase !== 'idle' && (
                <Button variant="dark" size="sm" onClick={handleReset}>
                  Reiniciar
                </Button>
              )}
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
            Esta vista no accede a la cámara ni valida contra la base de datos. El QR es
            transferible: no se rechaza por la identidad de quien lo presenta.
          </p>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
              Resultado de la <span className="text-club-primary">validación</span>
            </h2>
            <p className="text-xs text-text-muted">Información del tiquete y acceso.</p>
          </div>

          {phase === 'idle' || !scenario ? (
            <EmptyState
              icon={<ScanLine className="h-5 w-5" />}
              title="Aún no hay escaneos"
              description="Simula un escaneo para ver el detalle del tiquete y los estados posibles."
            />
          ) : phase === 'scanning' ? (
            <EmptyState
              icon={<ScanLine className="h-5 w-5" />}
              title="Procesando tiquete"
              description="Consultando la información de la reserva..."
            />
          ) : state === 'NOT_FOUND' ? (
            <EmptyState
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Reserva no encontrada"
              description="No existe ninguna reserva con este código. Verifica el tiquete o consulta la lista de reservas."
            />
          ) : !reservation ? (
            <EmptyState
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Reserva no encontrada"
              description="No fue posible obtener la información de la reserva."
            />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={state ?? 'VALID'} />
                <StatusBadge status={reservation.status} />
                <StatusBadge status={paymentKey(reservation.paymentStatus)} />
                <StatusBadge status={accessKey(reservation.accessStatus)} />
              </div>

              {state === 'EXPIRED' && (
                <Message tone="danger">
                  El tiquete expiró porque el tiempo de pago (HOLD) finalizó sin confirmación. La
                  capacidad fue liberada.
                </Message>
              )}
              {state === 'USED' && (
                <Message tone="neutral">
                  Este tiquete ya registró un ingreso previo. Después de la primera entrada el
                  tiquete pasa a estado usado.
                </Message>
              )}
              {state === 'OUTSIDE_TIME' && (
                <Message tone="pending">
                  La reserva existe pero está fuera de su franja válida. El acceso solo está
                  permitido dentro del horario reservado (8:00 AM – 5:00 PM).
                </Message>
              )}
              {state === 'CANCELLED' && (
                <Message tone="danger">
                  La reserva asociada a este tiquete está cancelada. No se puede autorizar el
                  ingreso.
                </Message>
              )}
              {state === 'VALID' && isLateEntry(reservation) && (
                <Message tone="info">
                  El cliente llegó después de la hora de inicio. Si la franja reservada sigue
                  activa, el ingreso es válido y conserva su hora de fin original.
                </Message>
              )}

              <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-text-main/10 bg-club-bg/60 p-4 text-xs sm:grid-cols-2">
                <Info label="Cliente" value={reservation.clientName} />
                <Info label="Servicio" value={reservation.serviceName} />
                <Info label="Recurso" value={reservation.resource} />
                <Info label="Fecha" value={formatDate(reservation.date)} />
                <Info
                  label="Horario"
                  value={`${reservation.startTime} – ${reservation.endTime}`}
                  mono
                />
                <Info label="Código" value={reservation.code} mono />
                <Info
                  label="Pulsera"
                  value={WRISTBAND_LABELS[reservation.wristbandColor]}
                />
                <Info label="Estado del tiquete" value={QR_LABELS[reservation.qrStatus]} />
              </dl>

              {authorized ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-club-primary/60 bg-club-primary/20 px-6 py-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-club-accent" />
                  <span className="text-lg font-black uppercase tracking-tight text-club-accent">
                    Ingreso autorizado
                  </span>
                  <span className="text-xs text-text-muted">
                    Acceso registrado para {reservation.clientName}. La pulsera corresponde a{' '}
                    {WRISTBAND_LABELS[reservation.wristbandColor]}.
                  </span>
                </div>
              ) : canAuthorize ? (
                <Button size="lg" className="w-full" onClick={() => setAuthorized(true)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Permitir ingreso / Autorizar acceso
                </Button>
              ) : (
                <p className="rounded-2xl border border-text-main/10 bg-club-bg/60 px-4 py-3 text-[11px] leading-relaxed text-text-muted">
                  El ingreso no puede autorizarse con este estado de tiquete.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className={`font-bold text-text-main ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

const TONES = {
  danger: 'border-red-500/30 bg-red-500/10 text-red-600',
  pending: 'border-brand-yellow/50 bg-brand-yellow/15 text-text-main',
  info: 'border-brand-blue/40 bg-brand-blue/10 text-text-main',
  neutral: 'border-text-main/10 bg-club-bg text-text-muted',
} as const;

function Message({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <p className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${TONES[tone]}`}>
      {children}
    </p>
  );
}
