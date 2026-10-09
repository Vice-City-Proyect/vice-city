'use client';

import { useState, type FormEvent } from 'react';
import { Banknote, CheckCircle2, CreditCard, RotateCcw, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { formatCOP, toISODate } from '@/lib/format';
import type { Service } from '@/types/service';
import { MOCK_SERVICES } from '@/features/services/data/mock-services';
import { TicketPreview } from '@/features/pos/components/TicketPreview';
import { isWednesday, MAX_DURATION_HOURS, OPERATING_CLOSE, addHours, isWithinOperatingHours, WEDNESDAY_DISCOUNT } from '@/lib/schedule';

type PaymentMethod = 'CASH' | 'CARD';

const SLOT_OPTIONS = [
  { value: '08:00', label: '08:00 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '16:00', label: '04:00 PM' },
];

function maxHoursFor(startTime: string): number {
  const start = Number(startTime.slice(0, 2));
  return Math.min(MAX_DURATION_HOURS, Number(OPERATING_CLOSE.slice(0, 2)) - start);
}

export default function EmployeePosPage() {
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [serviceId, setServiceId] = useState(MOCK_SERVICES[0].id);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [startTime, setStartTime] = useState('08:00');
  const [hours, setHours] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState<PaymentMethod>('CASH');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const service: Service = MOCK_SERVICES.find((item) => item.id === serviceId) ?? MOCK_SERVICES[0];
  const allowedHours = maxHoursFor(startTime);
  const effectiveHours = Math.min(hours, allowedHours);

  const basePrice =
    service.modality === 'PER_PERSON_HOUR'
      ? service.price * quantity * effectiveHours
      : service.price * effectiveHours;
  const discountPercent = isWednesday(date) ? WEDNESDAY_DISCOUNT : 0;
  const total = Math.round(basePrice * (1 - discountPercent / 100));

  function resetForm() {
    setName('');
    setIdNumber('');
    setServiceId(MOCK_SERVICES[0].id);
    setDate(toISODate(new Date()));
    setStartTime('08:00');
    setHours(1);
    setQuantity(1);
    setPayment('CASH');
    setConfirmed(false);
    setError('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !idNumber.trim()) {
      setError('Ingresa el nombre y la cédula del cliente.');
      return;
    }
    if (
      !isWithinOperatingHours({ start: startTime, end: addHours(startTime, effectiveHours) })
    ) {
      setError('La franja debe estar dentro del horario de operación (8:00 AM – 5:00 PM).');
      return;
    }
    setError('');
    setConfirmed(true);
  }

  if (confirmed) {
    return (
      <>
        <PageHeader
          eyebrow="Punto de venta"
          title="Venta"
          highlightedTitle="registrada"
          description="La venta se registró de forma visual. No valida disponibilidad ni persiste en base de datos."
        />

        <Card className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-club-primary/30 text-club-accent">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black uppercase tracking-tight text-club-accent">
                Tiquete generado
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-text-muted">
                {quantity} × {service.name} para {name} (Cédula {idNumber}) · {payment === 'CASH' ? 'Efectivo' : 'Tarjeta'}.
              </p>
            </div>
            <span className="text-3xl font-black text-club-accent">{formatCOP(total)}</span>
            <Button size="sm" onClick={resetForm}>
              <RotateCcw className="h-4 w-4" />
              Nueva venta
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Punto de venta"
        title="Venta en"
        highlightedTitle="sitio"
        description="Registra reservas presenciales con los mismos precios y reglas que la venta en línea."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="flex flex-col gap-6 xl:col-span-3">
          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                Datos del <span className="text-club-primary">cliente</span>
              </h2>
              <p className="text-xs text-text-muted">Información obligatoria de la venta.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField htmlFor="pos-name" label="Nombre completo">
                <Input
                  id="pos-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre del cliente"
                  required
                />
              </FormField>

              <FormField htmlFor="pos-id" label="Cédula de identidad">
                <Input
                  id="pos-id"
                  value={idNumber}
                  onChange={(event) => setIdNumber(event.target.value)}
                  placeholder="Documento"
                  inputMode="numeric"
                  required
                />
              </FormField>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                Selección de <span className="text-club-primary">servicio</span>
              </h2>
              <p className="text-xs text-text-muted">Elige la instalación física a reservar.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MOCK_SERVICES.map((item) => {
                const isSelected = item.id === serviceId;
                const priceLabel =
                  item.modality === 'PER_PERSON_HOUR'
                    ? `${formatCOP(item.price)} / persona / hora`
                    : `${formatCOP(item.price)} / hora`;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setServiceId(item.id)}
                    aria-pressed={isSelected}
                    className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-club-primary bg-club-primary/15'
                        : 'border-text-main/10 bg-club-bg/60 hover:border-club-primary/60'
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight text-club-accent">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-text-muted">{priceLabel}</span>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">
                      Capacidad {item.capacity}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                Franja y <span className="text-club-primary">cantidad</span>
              </h2>
              <p className="text-xs text-text-muted">
                Operación de 8:00 AM a 5:00 PM. Los lunes el complejo entra en mantenimiento.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField htmlFor="pos-date" label="Fecha">
                <Input
                  id="pos-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </FormField>

              <FormField htmlFor="pos-slot" label="Franja horaria">
                <Select
                  id="pos-slot"
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value);
                    setHours(1);
                  }}
                >
                  {SLOT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField htmlFor="pos-hours" label="Duración (horas)">
                <Select
                  id="pos-hours"
                  value={String(effectiveHours)}
                  onChange={(event) => setHours(Number(event.target.value))}
                >
                  {Array.from({ length: allowedHours }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {value} hora(s)
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                htmlFor="pos-quantity"
                label={service.modality === 'PER_PERSON_HOUR' ? 'Personas' : 'Cantidad'}
              >
                <Input
                  id="pos-quantity"
                  type="number"
                  min={1}
                  max={service.capacity}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </FormField>
            </div>

            <div className="mt-5 border-t border-text-main/10 pt-5">
              <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-text-muted">
                Medio de pago
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PaymentOption
                  active={payment === 'CASH'}
                  label="Efectivo"
                  icon={<Banknote className="h-4 w-4" />}
                  onClick={() => setPayment('CASH')}
                />
                <PaymentOption
                  active={payment === 'CARD'}
                  label="Tarjeta"
                  icon={<CreditCard className="h-4 w-4" />}
                  onClick={() => setPayment('CARD')}
                />
              </div>
            </div>

            {discountPercent > 0 && (
              <p className="mt-4 rounded-2xl border border-club-primary/50 bg-club-primary/15 px-4 py-3 text-xs leading-relaxed text-text-main">
                Miércoles: descuento del 20% aplicado. Solo puede aplicar un descuento del 20% por
                reserva (no se acumula con reserva de piscina completa).
              </p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-2">
          <TicketPreview
            service={service}
            name={name}
            idNumber={idNumber}
            date={date}
            startTime={startTime}
            hours={effectiveHours}
            quantity={quantity}
            payment={payment}
            basePrice={basePrice}
            discountPercent={discountPercent}
            total={total}
          />

          {error && (
            <p role="alert" className="text-xs font-medium text-red-500">
              {error}
            </p>
          )}

          <Button size="lg" type="submit" className="w-full">
            <Ticket className="h-4 w-4" />
            Confirmar venta
          </Button>

          <p className="text-[11px] leading-relaxed text-text-muted">
            La confirmación, la disponibilidad y la persistencia están fuera del alcance de esta
            vista visual. La venta en sitio aplica las mismas reglas de negocio que la reserva en
            línea.
          </p>
        </div>
      </form>
    </>
  );
}

function PaymentOption({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
        active
          ? 'border-club-primary bg-club-primary text-btn-text shadow-sm'
          : 'border-text-main/10 bg-club-surface text-text-muted hover:border-club-primary/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
