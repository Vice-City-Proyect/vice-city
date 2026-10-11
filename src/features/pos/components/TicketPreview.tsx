import { Receipt } from 'lucide-react';
import type { Service } from '@/types/service';
import { formatCOP, formatDate } from '@/lib/format';

interface TicketPreviewProps {
  service: Service;
  name: string;
  idNumber: string;
  date: string;
  startTime: string;
  hours: number;
  quantity: number;
  payment: 'CASH' | 'CARD';
  basePrice: number;
  discountPercent: number;
  total: number;
}

const PAYMENT_LABELS = { CASH: 'Efectivo', CARD: 'Tarjeta' } as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-right font-bold text-text-main">{value}</span>
    </div>
  );
}

export function TicketPreview({
  service,
  name,
  idNumber,
  date,
  startTime,
  hours,
  quantity,
  payment,
  basePrice,
  discountPercent,
  total,
}: TicketPreviewProps) {
  const endTime = `${String(Number(startTime.slice(0, 2)) + hours).padStart(2, '0')}:${startTime.slice(3, 5)}`;

  return (
    <div className="flex flex-col gap-4 rounded-3xl border-2 border-dashed border-text-main/20 bg-club-surface p-5">
      <div className="flex items-center gap-3 border-b border-dashed border-text-main/20 pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-club-accent text-white">
          <Receipt className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Vista previa
          </span>
          <span className="text-sm font-black uppercase tracking-tight text-club-accent">
            Tiquete digital
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Row label="Cliente" value={name || '—'} />
        <Row label="Cédula" value={idNumber || '—'} />
        <Row label="Servicio" value={service.name} />
        <Row label="Recurso" value={service.resource} />
        <Row label="Fecha" value={date ? formatDate(date) : '—'} />
        <Row label="Franja" value={`${startTime} – ${endTime}`} />
        <Row label="Cantidad" value={`${quantity}`} />
        <Row label="Medio de pago" value={PAYMENT_LABELS[payment]} />
      </div>

      <div className="flex flex-col gap-2.5 border-t border-dashed border-text-main/20 pt-4">
        <Row label="Valor base" value={formatCOP(basePrice)} />
        <Row
          label={discountPercent > 0 ? `Descuento (${discountPercent}%)` : 'Descuento'}
          value={discountPercent > 0 ? `-${formatCOP(basePrice - total)}` : 'Sin descuento'}
        />
        <div className="flex items-center justify-between gap-4 border-t border-dashed border-text-main/20 pt-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-main">Total</span>
          <span className="text-xl font-black text-club-accent">{formatCOP(total)}</span>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-text-muted">
        Máximo un descuento del 20% por reserva (miércoles o piscina completa). Los descuentos no
        se acumulan. Horario de operación 8:00 AM – 5:00 PM.
      </p>
    </div>
  );
}
