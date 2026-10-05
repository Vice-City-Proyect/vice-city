import Image from 'next/image';
import { Banknote, Info, Ticket, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { Facility } from '../types';

export function FacilityCard({ facility }: { facility: Facility }) {
  return (
    <Card className="group">
      <div className="relative h-56 overflow-hidden">
        <Image
          src={facility.image}
          alt={facility.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />

        <span className="absolute left-4 top-4 rounded-full bg-club-surface/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-club-accent">
          {facility.badge}
        </span>
        <span className="absolute bottom-3 left-4 text-xs font-bold uppercase tracking-wider text-white">
          {facility.sport}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h3 className="text-xl font-black uppercase leading-tight tracking-tight text-club-accent">
            {facility.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{facility.description}</p>
        </div>

        <dl className="space-y-2 border-t border-text-main/10 pt-4 text-xs">
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 font-medium text-text-muted">
              <Banknote className="h-3.5 w-3.5 shrink-0 text-club-primary" />
              Tarifa
            </dt>
            <dd className="text-right font-bold text-text-main">
              {facility.rate}{' '}
              <span className="font-normal text-text-muted">({facility.rateType})</span>
            </dd>
          </div>

          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 font-medium text-text-muted">
              <Users className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
              Capacidad
            </dt>
            <dd className="text-right font-bold text-text-main">{facility.capacity}</dd>
          </div>

          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 font-medium text-text-muted">
              <Ticket className="h-3.5 w-3.5 shrink-0 text-brand-yellow" />
              Ingreso
            </dt>
            <dd className="text-right font-bold text-text-main">{facility.wristband}</dd>
          </div>
        </dl>

        <p className="mt-auto flex items-start gap-2 rounded-xl border border-text-main/10 bg-club-bg/70 p-3 text-xs leading-snug text-text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-yellow" />
          {facility.rules}
        </p>
      </div>
    </Card>
  );
}