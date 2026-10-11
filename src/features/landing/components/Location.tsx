import { Car, Clock, ExternalLink, Mail, MapPin, Phone, Shield } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Section, SectionHeader } from '@/components/ui/Section';
import { COMPLEX_HOURS } from '../data/facilities';

const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Cra.+53+%23106-280,+Barranquilla,+Atl%C3%A1ntico';

const MAPS_EMBED_URL =
  'https://www.google.com/maps?q=Cra.+53+%23106-280,+Barranquilla,+Atl%C3%A1ntico&output=embed';

const CONTACT_ITEMS = [
  {
    icon: MapPin,
    label: 'Dirección',
    value: 'Cra. 53 # 106 - 280, Barranquilla, Atlántico',
  },
  {
    icon: Clock,
    label: 'Horario',
    value: `Lunes a domingo · ${COMPLEX_HOURS} (UTC-5)`,
  },
  {
    icon: Phone,
    label: 'Teléfono',
    value: '+57 (300) 912-3456',
    href: 'tel:+573009123456',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'concierge@vicecityiguana.club',
    href: 'mailto:concierge@vicecityiguana.club',
  },
];

const HIGHLIGHTS = [
  { icon: Car, label: 'Parqueadero privado' },
  { icon: Shield, label: 'Seguridad 24/7' },
];

export function Location() {
  return (
    <Section id="ubicacion" className="border-t border-text-main/10 bg-club-surface/50">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeader
            eyebrow="Club house y sede principal"
            title="Nuestra"
            highlightedTitle="ubicación"
            description="Vice City Iguana Club está en el sector deportivo de Barranquilla. Visítanos o comunícate con nuestro concierge para recibir información sobre el complejo y las reservas."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CONTACT_ITEMS.map(({ icon: Icon, label, value, href }) => (
              <div
                key={label}
                className="rounded-2xl border border-text-main/10 bg-club-surface p-5 shadow-xs"
              >
                <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <Icon className="h-4 w-4 text-club-primary" />
                  {label}
                </span>
                {href ? (
                  <a
                    href={href}
                    className="block  text-sm font-bold text-club-accent transition-colors hover:text-club-primary"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-sm font-bold leading-snug text-club-accent">{value}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-lg border border-text-main/10 bg-club-surface px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                <Icon className="h-3.5 w-3.5 text-club-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-text-main/10 bg-club-surface p-3 shadow-md">
          <div className="relative h-90 overflow-hidden rounded-2xl sm:h-110">
            <iframe
              title="Ubicación de Vice City Iguana Club en Barranquilla"
              src={MAPS_EMBED_URL}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="absolute bottom-4 right-4">
              <ButtonLink href={MAPS_URL} size="sm">
                Cómo llegar
                <ExternalLink className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}