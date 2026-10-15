import Image from 'next/image';
import { Clock, Pencil, Power, Trash2, Users } from 'lucide-react';
import { Badge, StatusBadge } from '@/components/ui/StatusBadge';
import type { Service } from '@/types/service';
import { formatCOP } from '@/lib/format';
import { SERVICE_LABELS } from '../data/mock-services';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onToggle: (service: Service) => void;
  onDelete: (service: Service) => void;
}

function priceLabel(service: Service): string {
  const unit = service.modality === 'PER_PERSON_HOUR' ? 'persona / hora' : 'hora';
  return `${formatCOP(service.price)} / ${unit}`;
}

function modalityLabel(service: Service): string {
  return service.modality === 'PER_PERSON_HOUR' ? 'Por persona y hora' : 'Por hora fija';
}

export function ServiceCard({ service, onEdit, onToggle, onDelete }: ServiceCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-text-main/10 bg-club-surface shadow-xs">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={service.image}
          alt={service.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-club-accent/70 via-club-accent/10 to-transparent" />

        <div className="absolute left-4 top-4">
          <StatusBadge status={service.status} />
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <h3 className="text-lg font-black uppercase leading-tight tracking-tight text-white">
            {service.name}
          </h3>
          <Badge tone="dark" className="shrink-0">
            {SERVICE_LABELS[service.category]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-text-muted">{service.description}</p>

        <dl className="flex flex-col gap-2 border-t border-text-main/10 pt-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-muted">Tarifa</dt>
            <dd className="text-right font-bold text-club-accent">{priceLabel(service)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-muted">Modalidad</dt>
            <dd className="text-right font-bold">{modalityLabel(service)}</dd>
          </div>
          <div className="flex items-center gap-4">
            <dt className="inline-flex items-center gap-1.5 text-text-muted">
              <Users className="h-3.5 w-3.5 text-brand-blue" />
              Capacidad
            </dt>
            <dd className="font-bold">{service.capacity}</dd>
          </div>
          <div className="flex items-center gap-4">
            <dt className="inline-flex items-center gap-1.5 text-text-muted">
              <Clock className="h-3.5 w-3.5 text-brand-yellow" />
              Horario
            </dt>
            <dd className="font-bold font-mono">
              {service.schedule.open} – {service.schedule.close}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-muted">Recurso físico</dt>
            <dd className="text-right font-bold">{service.resource}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center gap-2 border-t border-text-main/10 pt-4">
          <CardAction
            label="Editar servicio"
            tooltip="Editar"
            onClick={() => onEdit(service)}
            variant="default"
          >
            <Pencil className="h-4 w-4" />
          </CardAction>
          <CardAction
            label={service.status === 'ACTIVE' ? 'Desactivar servicio' : 'Activar servicio'}
            tooltip={service.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            onClick={() => onToggle(service)}
            variant={service.status === 'ACTIVE' ? 'warning' : 'success'}
          >
            <Power className="h-4 w-4" />
          </CardAction>
          <CardAction
            label="Eliminar servicio"
            tooltip="Eliminar"
            onClick={() => onDelete(service)}
            variant="danger"
          >
            <Trash2 className="h-4 w-4" />
          </CardAction>
        </div>
      </div>
    </article>
  );
}

type CardActionVariant = 'default' | 'danger' | 'warning' | 'success';

interface CardActionProps {
  label: string;
  tooltip?: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: CardActionVariant;
}

const VARIANT_STYLES: Record<CardActionVariant, string> = {
  default:
    'hover:border-club-primary hover:bg-club-primary hover:text-club-accent hover:shadow-xs focus-visible:ring-club-primary',
  danger:
    'hover:border-red-500 hover:bg-red-500 hover:text-white hover:shadow-xs focus-visible:ring-red-500',
  warning:
    'hover:border-amber-500 hover:bg-amber-500 hover:text-white hover:shadow-xs focus-visible:ring-amber-500',
  success:
    'hover:border-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-xs focus-visible:ring-emerald-600',
};

function CardAction({
  label,
  tooltip,
  onClick,
  children,
  variant = 'default',
}: CardActionProps) {
  const tooltipText = tooltip || label;

  return (
    <div className="relative flex-1">
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={`group/btn relative inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-text-main/10 bg-club-bg/70 text-text-muted transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${VARIANT_STYLES[variant]}`}
      >
        <span className="transition-transform duration-200 group-hover/btn:scale-110">
          {children}
        </span>
        <span className="sr-only">{label}</span>

        {/* Tooltip flotante instantáneo al pasar el mouse */}
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 z-30 opacity-0 scale-95 transition-all duration-150 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-focus-visible/btn:opacity-100 group-focus-visible/btn:scale-100 whitespace-nowrap rounded-lg bg-club-accent px-2.5 py-1 text-[11px] font-bold text-white shadow-lg"
        >
          {tooltipText}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-club-accent" />
        </span>
      </button>
    </div>
  );
}


