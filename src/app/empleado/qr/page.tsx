'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format';
import type {
  QRValidationResponse,
  ConfirmEntryResult,
} from '@/features/qr/types';

interface QueryError {
  status: number;
  error: string;
  message: string;
}

function getWristbandInfo(serviceName: string, categoryName?: string) {
  const text = `${serviceName} ${categoryName || ''}`.toLowerCase();
  if (text.includes('piscina') || text.includes('pool') || text.includes('acuátic')) {
    return {
      color: 'BLUE',
      label: 'Azul (Piscinas)',
      badgeClass: 'border-blue-500/40 bg-blue-500/20 text-blue-400',
    };
  }
  if (text.includes('humed') || text.includes('sauna') || text.includes('turco') || text.includes('wet')) {
    return {
      color: 'PURPLE',
      label: 'Morado (Zona Húmeda)',
      badgeClass: 'border-purple-500/40 bg-purple-500/20 text-purple-400',
    };
  }
  if (text.includes('gym') || text.includes('gimnasio') || text.includes('pesas')) {
    return {
      color: 'RED',
      label: 'Rojo (Gimnasio)',
      badgeClass: 'border-red-500/40 bg-red-500/20 text-red-400',
    };
  }
  return {
    color: 'GREEN',
    label: 'Verde (Canchas deportivas)',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400',
  };
}

type BarcodeResult = { rawValue: string };
interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
}
interface WindowWithBarcodeDetector extends Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}

function EmployeeQrScannerContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [ticketData, setTicketData] = useState<QRValidationResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmEntryResult | null>(null);
  const [queryError, setQueryError] = useState<QueryError | null>(null);

  // Cámara
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const hasMedia =
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';
      const hasBarcode =
        typeof window !== 'undefined' && 'BarcodeDetector' in window;
      setCameraSupported(hasMedia);
      setBarcodeDetectorSupported(hasBarcode);
    }, 0);

    if (initialCode) {
      handleConsult(initialCode);
    }

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [initialCode]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      const win = window as WindowWithBarcodeDetector;
      if (win.BarcodeDetector) {
        const detector = new win.BarcodeDetector({
          formats: ['qr_code'],
        });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = barcodes[0].rawValue.trim();
              stopCamera();
              handleConsult(detected);
            }
          } catch {
            // Ignorar errores de detección por frame
          }
        }, 300);
      }
    } catch (err: unknown) {
      setCameraActive(false);
      const isNotAllowed =
        err instanceof Error && err.name === 'NotAllowedError';
      if (isNotAllowed) {
        setCameraError(
          'Permiso de acceso a la cámara denegado. Permite el uso de cámara o ingresa el código manualmente.'
        );
      } else {
        setCameraError(
          'No se pudo inicializar la cámara. Verifica que el dispositivo cuente con cámara y esté en HTTPS.'
        );
      }
    }
  }

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function handleConsult(rawCode: string) {
    const code = rawCode.trim();
    if (!code) return;

    setActiveCode(code);
    setInputCode(code);
    setIsLoading(true);
    setQueryError(null);
    setConfirmResult(null);
    setTicketData(null);

    try {
      const response = await fetch(`/api/qr/${encodeURIComponent(code)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        setQueryError({
          status: response.status,
          error: json?.error || 'ERROR',
          message:
            json?.message ||
            (response.status === 404
              ? 'Código QR no encontrado en el sistema.'
              : response.status === 403
              ? 'Acceso denegado: Se requiere rol QR_VALIDATOR para validar tiquetes.'
              : response.status === 401
              ? 'Se requiere una sesión activa como validador QR.'
              : 'Error al consultar el código QR.'),
        });
      } else if (json?.data) {
        setTicketData(json.data);
      }
    } catch {
      setQueryError({
        status: 500,
        error: 'NETWORK_ERROR',
        message: 'No fue posible conectar con el servidor. Revisa tu conexión a internet.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    handleConsult(inputCode);
  }

  async function handleConfirmEntry() {
    if (!activeCode || isConfirming) return;

    setIsConfirming(true);

    try {
      const response = await fetch(`/api/qr/${encodeURIComponent(activeCode)}/entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ accessPoint: 'Torniquete Principal' }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409) {
          // Ya fue usado o conflicto concurrente
          setTicketData((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'USED',
                  accessValidation: {
                    canEnter: false,
                    isLateEntry: false,
                    reasonCode: 'ALREADY_USED',
                    message:
                      json?.message ||
                      'El ticket ya fue utilizado previamente o registrado simultáneamente en otro punto de acceso.',
                  },
                }
              : null
          );
        } else {
          setQueryError({
            status: response.status,
            error: json?.error || 'ENTRY_FAILED',
            message: json?.message || 'Error al confirmar el ingreso.',
          });
        }
      } else if (json?.data) {
        setConfirmResult(json.data);
        setTicketData((prev) =>
          prev
            ? {
                ...prev,
                status: 'USED',
                accessValidation: {
                  ...prev.accessValidation,
                  canEnter: false,
                  message: 'Ingreso confirmado y registrado en torniquete.',
                },
              }
            : null
        );
      }
    } catch {
      setQueryError({
        status: 500,
        error: 'NETWORK_ERROR',
        message: 'Error de comunicación al confirmar el ingreso.',
      });
    } finally {
      setIsConfirming(false);
    }
  }

  function handleReset() {
    stopCamera();
    setInputCode('');
    setActiveCode('');
    setTicketData(null);
    setConfirmResult(null);
    setQueryError(null);
  }

  const wristband = ticketData
    ? getWristbandInfo(ticketData.service.name, ticketData.service.category)
    : null;

  const canAuthorize =
    !!ticketData && ticketData.accessValidation.canEnter && !confirmResult;

  return (
    <>
      <PageHeader
        eyebrow="Control de Acceso"
        title="Escáner"
        highlightedTitle="QR"
        description="Escanea o ingresa el código del tiquete para validar vigencia y confirmar el ingreso seguro a las instalaciones."
        actions={
          <span className="flex items-center gap-1.5 rounded-xl border border-club-primary/40 bg-club-primary/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-club-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Rol QR_VALIDATOR
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Panel izquierdo: Área de escaneo y búsqueda manual */}
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
              Área de <span className="text-club-primary">escaneo</span>
            </h2>
            <p className="text-xs text-text-muted">
              Usa la cámara del dispositivo móvil o introduce el código alfanumérico manualmente.
            </p>
          </div>

          {/* Visor de cámara / Zona visual */}
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-text-main/20 bg-club-bg/60 p-6 text-center min-h-[260px]">
            {cameraActive ? (
              <div className="relative flex flex-col items-center justify-center w-full">
                <video
                  ref={videoRef}
                  className="h-60 w-full max-w-sm rounded-2xl object-cover shadow-inner"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-2xl border-2 border-club-primary animate-pulse" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="dark" size="sm" onClick={stopCamera}>
                    <CameraOff className="h-4 w-4" />
                    Detener cámara
                  </Button>
                </div>
                {!barcodeDetectorSupported && (
                  <p className="mt-2 text-[10px] text-brand-yellow">
                    Detección automática no disponible en este navegador. Escribe el código abajo.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <span className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-text-main/20 bg-club-surface text-text-muted">
                  <QrCode className="h-10 w-10 text-club-primary" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black uppercase tracking-wider text-club-accent">
                    Lector QR en espera
                  </span>
                  <span className="text-xs text-text-muted max-w-xs">
                    Apunta la cámara al código QR del cliente o ingresa el código manual.
                  </span>
                </div>
                {cameraSupported && (
                  <Button size="sm" onClick={startCamera}>
                    <Camera className="h-4 w-4" />
                    Activar cámara
                  </Button>
                )}
                {cameraError && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                    {cameraError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Formulario de entrada manual */}
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
            <FormField
              htmlFor="qr-manual-code"
              label="Ingreso manual de código"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="qr-manual-code"
                  type="text"
                  placeholder="Ej. A1B2C3D4E5F60718 o 247AE2451458..."
                  className="pl-10 font-mono uppercase"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  disabled={isLoading || isConfirming}
                />
              </div>
            </FormField>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !inputCode.trim() || isConfirming}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4" />
                    Consultar tiquete
                  </>
                )}
              </Button>

              {(ticketData || queryError || activeCode) && (
                <Button
                  type="button"
                  variant="dark"
                  size="sm"
                  onClick={handleReset}
                  disabled={isLoading || isConfirming}
                >
                  <RefreshCw className="h-4 w-4" />
                  Nuevo escaneo
                </Button>
              )}
            </div>
          </form>

          <p className="text-[11px] leading-relaxed text-text-muted border-t border-text-main/10 pt-3">
            El tiquete es al portador: se evalúa la vigencia de la reserva y no la identidad
            física de quien lo presenta. El acceso es válido únicamente durante la franja
            programada (inicio inclusivo, fin exclusivo) en hora de Colombia (America/Bogota).
          </p>
        </Card>

        {/* Panel derecho: Resultado de la validación y autorización */}
        <Card className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                Resultado de la <span className="text-club-primary">validación</span>
              </h2>
              <p className="text-xs text-text-muted">
                Evaluación en tiempo real según reglas de negocio y franja horaria.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-club-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Consultando tiquete en base de datos...
              </p>
            </div>
          ) : queryError ? (
            <div className="flex flex-col gap-4">
              <EmptyState
                icon={
                  queryError.status === 404 ? (
                    <AlertTriangle className="h-6 w-6 text-brand-yellow" />
                  ) : queryError.status === 403 || queryError.status === 401 ? (
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )
                }
                title={
                  queryError.status === 404
                    ? 'Tiquete no encontrado'
                    : queryError.status === 403
                    ? 'Permiso denegado (403)'
                    : queryError.status === 401
                    ? 'No autenticado (401)'
                    : 'Error de validación'
                }
                description={queryError.message}
              />
              <Button variant="dark" size="sm" onClick={handleReset} className="self-center">
                Intentar con otro código
              </Button>
            </div>
          ) : !ticketData ? (
            <EmptyState
              icon={<ScanLine className="h-6 w-6 text-text-muted" />}
              title="Aún no hay escaneo activo"
              description="Apunta la cámara a un código QR o introduce el código para ver los datos de la reserva y validar el ingreso."
            />
          ) : (
            <div className="flex flex-col gap-5">
              {/* Badges de estado */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticketData.status} />
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    ticketData.accessValidation.canEnter
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                      : 'border-red-500/40 bg-red-500/20 text-red-400'
                  }`}
                >
                  {ticketData.accessValidation.canEnter ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {ticketData.accessValidation.canEnter
                    ? 'Ingreso permitido'
                    : 'Ingreso denegado'}
                </span>

                {ticketData.accessValidation.isLateEntry && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
                    <Clock className="h-3.5 w-3.5" />
                    Ingreso tardío
                  </span>
                )}
              </div>

              {/* Mensaje descriptivo de la decisión */}
              {ticketData.accessValidation.canEnter ? (
                <div
                  className={`rounded-2xl border p-4 text-xs leading-relaxed ${
                    ticketData.accessValidation.isLateEntry
                      ? 'border-blue-500/40 bg-blue-500/10 text-text-main'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-text-main'
                  }`}
                >
                  <p className="font-bold">
                    {ticketData.accessValidation.isLateEntry
                      ? 'Ingreso tardío autorizado:'
                      : 'Acceso autorizado:'}
                  </p>
                  <p className="mt-1 text-text-muted">
                    {ticketData.accessValidation.message}
                  </p>
                  {ticketData.accessValidation.isLateEntry && (
                    <p className="mt-1.5 text-[11px] text-blue-400">
                      * El cliente conserva su hora de salida original ({ticketData.schedule.endTime}). No se extiende la franja.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs leading-relaxed text-text-main">
                  <p className="font-bold text-red-500">Acceso denegado:</p>
                  <p className="mt-1 text-text-muted">
                    {ticketData.accessValidation.message}
                  </p>
                </div>
              )}

              {/* Detalle del tiquete */}
              <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-text-main/10 bg-club-bg/60 p-4 text-xs sm:grid-cols-2">
                <Info label="Cliente / Titular" value={ticketData.customer.fullName} />
                <Info
                  label="Documento"
                  value={ticketData.customer.documentId || 'No registrado'}
                />
                <Info label="Servicio" value={ticketData.service.name} />
                <Info label="Fecha" value={formatDate(ticketData.schedule.date)} />
                <Info
                  label="Horario Franja"
                  value={`${ticketData.schedule.startTime} – ${ticketData.schedule.endTime}`}
                  mono
                />
                <Info label="Código" value={ticketData.code} mono />
                {wristband && (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Pulsera correspondiente
                    </dt>
                    <dd>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${wristband.badgeClass}`}
                      >
                        {wristband.label}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>

              {/* Confirmación exitosa */}
              {confirmResult ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-500/50 bg-emerald-500/20 px-6 py-6 text-center animate-in fade-in duration-300">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <span className="text-lg font-black uppercase tracking-tight text-club-accent">
                    Ingreso autorizado y franqueado
                  </span>
                  <span className="text-xs text-text-muted">
                    Acceso registrado exitosamente a las{' '}
                    <strong className="text-text-main">
                      {new Date(confirmResult.usedAt).toLocaleTimeString('es-CO', {
                        timeZone: 'America/Bogota',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </strong>{' '}
                    para {ticketData.customer.fullName}. Entrega la pulsera{' '}
                    <strong className="text-text-main">{wristband?.label}</strong>.
                  </span>
                  <Button variant="dark" size="sm" onClick={handleReset} className="mt-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Validar siguiente tiquete
                  </Button>
                </div>
              ) : canAuthorize ? (
                /* Botón "Permitir ingreso" */
                <Button
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                  onClick={handleConfirmEntry}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Confirmando ingreso...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Permitir ingreso / Autorizar acceso
                    </>
                  )}
                </Button>
              ) : (
                <p className="rounded-2xl border border-text-main/10 bg-club-bg/60 px-4 py-3 text-[11px] leading-relaxed text-text-muted text-center">
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

export default function EmployeeQrPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-club-primary" />
        </div>
      }
    >
      <EmployeeQrScannerContent />
    </Suspense>
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
      <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className={`font-bold text-text-main ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
