import type { Metadata } from 'next';
import { CalendarDays, Sparkles, User, Waves } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuickLinks } from '@/components/common/QuickLinks';
import { ClientServiceCard } from '@/features/services/components/ClientServiceCard';
import { CLIENT_CATALOG } from '@/features/services/data/client-catalog';
import { ClientNextReservation } from '@/features/reservations/components/ClientNextReservation';
import { MOCK_CLIENT_SESSION } from '@/features/auth/data/mock-session';
import { TIME_ZONE } from '@/lib/schedule';

export const metadata: Metadata = {
  title: 'Inicio | Cliente Vice City',
  description: 'Panel del cliente Vice City Iguana Club.',
};

const QUICK_ACTIONS = [
  { href: '/cliente#servicios', label: 'Reservar servicio', icon: Waves },
  { href: '/cliente/reservas', label: 'Mis reservas', icon: CalendarDays },
  { href: '/cliente/perfil', label: 'Mi perfil', icon: User },
];

export default function ClientHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <Card tone="dark" className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white/80">
              <span className="h-2 w-2 rounded-full bg-club-primary" />
              Bienvenida de nuevo
            </span>

            <h1 className="text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
              Hola, <span className="text-club-primary">{MOCK_CLIENT_SESSION.name}</span>
            </h1>

            <p className="text-sm leading-relaxed text-white/70 sm:text-base">
              Reserva piscinas, canchas, gimnasio y zona húmeda del complejo. Recuerda que los
              miércoles aplica el 20% de descuento y los lunes el complejo entra en mantenimiento.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/cliente#servicios" size="lg" className="w-full sm:w-auto">
                Reservar un servicio
              </ButtonLink>
              <ButtonLink
                href="/cliente/perfil"
                variant="light"
                size="lg"
                className="w-full sm:w-auto"
              >
                Ver mi perfil
              </ButtonLink>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <InfoChip label="Horario" value="8:00 AM – 5:00 PM" />
            <InfoChip label="Zona horaria" value={TIME_ZONE} />
            <InfoChip label="Descuento miércoles" value="20%" />
          </div>
        </div>
      </Card>

      <section id="servicios" className="flex flex-col gap-5 scroll-mt-24">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-text-main/10 bg-club-surface px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-club-primary-hover" />
            Instalaciones
          </span>
          <h2 className="text-2xl font-black uppercase leading-tight tracking-tight text-club-accent sm:text-3xl">
            Servicios <span className="text-club-primary">disponibles</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {CLIENT_CATALOG.map((item) => (
            <ClientServiceCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ClientNextReservation clientId={MOCK_CLIENT_SESSION.id} />
        </div>
        <QuickLinks
          title={
            <>
              Acciones <span className="text-club-primary">rápidas</span>
            </>
          }
          description="Gestiona tus reservas y tu cuenta."
          items={QUICK_ACTIONS}
        />
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-0.5 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
    </span>
  );
}
