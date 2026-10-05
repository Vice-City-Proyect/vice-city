import Image from 'next/image';
import { ChevronRight, Clock, MapPin, Percent } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { COMPLEX_HOURS } from '../data/facilities';

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden pb-16 pt-28 lg:pb-24 lg:pt-36">
      <div className="absolute inset-0">
        <Image
          src="/hero-athlete.webp"
          alt="Complejo deportivo Vice City Iguana Club en Barranquilla"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/95 via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-black/30" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-club-primary" />
            Complejo deportivo · Barranquilla
          </span>

          <h1 className="mb-6 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Entrena. Compite.{' '}
            <span className="text-club-primary">Vive el deporte.</span>
          </h1>

          <p className="mb-9 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Piscinas semiolímpicas, canchas de fútbol 11 y microfútbol, cancha polideportiva,
            gimnasio y zona húmeda con sauna. Todo tu entrenamiento en un solo complejo.
          </p>

          <div className="mb-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#piscinas" size="lg">
              Explorar piscinas
              <ChevronRight className="h-5 w-5" />
            </ButtonLink>
            <ButtonLink href="#instalaciones" size="lg" variant="light">
              Ver instalaciones
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-white/15 pt-6 text-xs font-semibold uppercase tracking-wider text-white/70 sm:grid-cols-3">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-club-primary" />
              {COMPLEX_HOURS}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-club-primary" />
              Barranquilla, Colombia
            </span>
            <span className="flex items-center gap-2">
              <Percent className="h-4 w-4 shrink-0 text-club-primary" />
              20% de descuento los miércoles
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}