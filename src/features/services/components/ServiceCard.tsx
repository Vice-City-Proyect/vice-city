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
          <CardAction label="Editar servicio" onClick={() => onEdit(service)}>
            <Pencil className="h-4 w-4" />
          </CardAction>
          <CardAction
            label={service.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            onClick={() => onToggle(service)}
          >
            <Power className="h-4 w-4" />
          </CardAction>
          <CardAction label="Eliminar" onClick={() => onDelete(service)}>
            <Trash2 className="h-4 w-4" />
          </CardAction>
        </div>
      </div>
    </article>
  );
}

function CardAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-text-main/10 bg-club-bg/70 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
