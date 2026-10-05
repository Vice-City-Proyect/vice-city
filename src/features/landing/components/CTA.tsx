import { CalendarCheck, Percent, PhoneCall } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { COMPLEX_HOURS } from '../data/facilities';

const RESERVATION_HIGHLIGHTS = [
  {
    icon: Percent,
    title: '20% los miércoles',
    text: 'Todas las reservas hechas el día miércoles reciben un 20% de descuento en el escenario que elijas.',
  },
  {
    icon: CalendarCheck,
    title: 'Piscina completa',
    text: `Reserva la jornada completa de ${COMPLEX_HOURS} con 20% de descuento, hasta 20 días antes y sin combinarse con el descuento del miércoles.`,
  },
];

export function CTA() {
  return (
    <Section id="reservas" className="bg-club-accent">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-club-primary">
          Reservas
        </span>

        <h2 className="text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          Inicia tu proceso de <span className="text-club-primary">reserva</span>
        </h2>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
          Confirma la disponibilidad de tu escenario con nuestro concierge, completa el proceso de
          reserva y recibe la confirmación de tu espacio. Atendemos todos los días de{' '}
          {COMPLEX_HOURS}.
        </p>

        <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="tel:+573009123456" size="lg" className="w-full sm:w-auto">
            <PhoneCall className="h-4 w-4" />
            Hablar con concierge
          </ButtonLink>
          <ButtonLink href="#piscinas" size="lg" variant="light" className="w-full sm:w-auto">
            Ver las piscinas
          </ButtonLink>
        </div>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 border-t border-white/10 pt-8 text-left sm:grid-cols-2">
          {RESERVATION_HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-club-primary" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/70">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}