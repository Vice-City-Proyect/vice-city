import Image from 'next/image';
import { CalendarClock, Clock, Layers, Users } from 'lucide-react';
import { Badge } from '@/components/ui/StatusBadge';
import { ButtonLink } from '@/components/ui/Button';
import { formatCOP } from '@/lib/format';
import { MAX_ADVANCE_DAYS_NORMAL } from '@/lib/schedule';
import type { CatalogItem } from '../data/client-catalog';

interface ClientServiceCardProps {
  item: CatalogItem;
}

export function ClientServiceCard({ item }: ClientServiceCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-text-main/10 bg-club-surface shadow-xs">
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-club-accent/70 via-club-accent/10 to-transparent" />
        <div className="absolute left-4 top-4">
          <Badge tone={item.availability.tone}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {item.availability.label}
          </Badge>
        </div>
        <h3 className="absolute bottom-4 left-4 right-4 text-lg font-black uppercase leading-tight tracking-tight text-white">
          {item.title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-text-muted">{item.description}</p>

        <div className="flex items-center justify-between gap-3 border-t border-text-main/10 pt-4">
          <span className="text-xl font-black text-club-accent">{formatCOP(item.price)}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {item.modality}
          </span>
        </div>

        <dl className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 text-text-muted">
            <Users className="h-3.5 w-3.5 text-brand-blue" />
            <dt className="sr-only">Capacidad</dt>
            <dd>{item.capacityLabel}</dd>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Clock className="h-3.5 w-3.5 text-brand-yellow" />
            <dt className="sr-only">Horario</dt>
            <dd>Jornada 8:00 AM – 5:00 PM · Cerrado los lunes</dd>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Layers className="h-3.5 w-3.5 text-club-primary-hover" />
            <dt className="sr-only">Recursos</dt>
            <dd>{item.resources.join(' · ')}</dd>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <CalendarClock className="h-3.5 w-3.5 text-brand-blue" />
            <dt className="sr-only">Anticipación</dt>
            <dd>Hasta {MAX_ADVANCE_DAYS_NORMAL} días de anticipación</dd>
          </div>
        </dl>

        <div className="mt-auto">
          <ButtonLink href="/cliente/reservas" variant="dark" size="sm" className="w-full">
            Reservar
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
