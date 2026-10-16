'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CalendarClock, Clock, Layers, Users } from 'lucide-react';
import { Badge } from '@/components/ui/StatusBadge';
import { ButtonLink } from '@/components/ui/Button';
import { formatCOP } from '@/lib/format';
import { MAX_ADVANCE_DAYS_NORMAL } from '@/lib/schedule';
import type { CatalogItem } from '../data/client-catalog';
import type { ServiceItem } from '../types/catalog.types';

export interface ClientCatalogItem {
  id: string;
  title: string;
  description: string;
  price: number;
  modality: string;
  capacityLabel: string;
  resources: string[];
  image: string;
  availability: { label: string; tone: 'success' | 'pending' | 'danger' };
  categoryId?: string;
  categoryName?: string;
}

export function getFallbackImageForService(slug?: string, categorySlug?: string): string {
  const text = `${slug || ''} ${categorySlug || ''}`.toLowerCase();
  if (text.includes('ninos') || text.includes('niño')) return '/piscina-ninos.jpeg';
  if (text.includes('micro')) return '/cancha-micro.jpeg';
  if (text.includes('multi') || text.includes('poli')) return '/polideportiva.jpeg';
  if (text.includes('grande') || text.includes('11') || text.includes('futbol') || text.includes('fútbol')) return '/cancha-11.jpeg';
  if (text.includes('adulto') || text.includes('piscina')) return '/piscina-adultos.jpeg';
  if (text.includes('gimnasio') || text.includes('gym')) return '/gym.jpeg';
  if (text.includes('humeda') || text.includes('húmeda') || text.includes('sauna')) return '/sauna.jpeg';
  return '/piscina-adultos.jpeg';
}

export function mapServiceItemToClientItem(service: ServiceItem): ClientCatalogItem {
  const catSlug = service.category?.slug?.toLowerCase() || '';
  const isCourt = catSlug === 'canchas' || service.slug.toLowerCase().includes('cancha');
  const modality = isCourt ? 'Por hora fija' : 'Por persona y hora';
  const capacityLabel = isCourt
    ? `${service.capacity} jugadores`
    : `${service.capacity} personas / hora`;

  const image = service.image_url?.trim() || getFallbackImageForService(service.slug, catSlug);

  return {
    id: service.id,
    title: service.name,
    description: service.description?.trim() || `Servicio de ${service.name} en el complejo deportivo Vice City.`,
    price: service.price,
    modality,
    capacityLabel,
    resources: [service.name],
    image,
    availability: service.is_active
      ? { label: 'Disponible hoy', tone: 'success' }
      : { label: 'No disponible', tone: 'danger' },
    categoryId: service.category_id,
    categoryName: service.category?.name,
  };
}

export interface ClientServiceCardProps {
  item: ClientCatalogItem | CatalogItem;
}

export function ClientServiceCard({ item }: ClientServiceCardProps) {
  const [imageSrc, setImageSrc] = useState<string>(item.image || '/piscina-adultos.jpeg');

  return (
    <article className="group flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-text-main/10 bg-club-surface shadow-xs transition-shadow duration-300 hover:shadow-md">
      <div>
        <div className="relative h-44 w-full overflow-hidden bg-club-surface-subtle">
          <Image
            src={imageSrc}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageSrc('/piscina-adultos.jpeg')}
          />
          <div className="absolute inset-0 bg-linear-to-t from-club-accent/80 via-club-accent/20 to-transparent" />
          <div className="absolute left-4 top-4">
            <Badge tone={item.availability.tone}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {item.availability.label}
            </Badge>
          </div>
          <h3 className="absolute bottom-4 left-4 right-4 line-clamp-2 text-lg font-black uppercase leading-tight tracking-tight text-white break-words">
            {item.title}
          </h3>
        </div>

        <div className="p-5">
          <p className="line-clamp-3 text-sm leading-relaxed text-text-muted break-words">
            {item.description}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-text-main/10 pt-4">
            <span className="text-xl font-black text-club-accent">{formatCOP(item.price)}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {item.modality}
            </span>
          </div>

          <dl className="mt-4 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-text-muted">
              <Users className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
              <dt className="sr-only">Capacidad</dt>
              <dd className="truncate">{item.capacityLabel}</dd>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0 text-brand-yellow" />
              <dt className="sr-only">Horario</dt>
              <dd className="truncate">Jornada 8:00 AM – 5:00 PM · Cerrado los lunes</dd>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <Layers className="h-3.5 w-3.5 shrink-0 text-club-primary-hover" />
              <dt className="sr-only">Recursos</dt>
              <dd className="truncate">{item.resources.join(' · ')}</dd>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
              <dt className="sr-only">Anticipación</dt>
              <dd className="truncate">Hasta {MAX_ADVANCE_DAYS_NORMAL} días de anticipación</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="p-5 pt-0">
        <ButtonLink
          href={`/cliente/reservar?serviceId=${item.id}`}
          variant="dark"
          size="sm"
          className="flex min-h-[42px] w-full items-center justify-center"
        >
          Reservar
        </ButtonLink>
      </div>
    </article>
  );
}
