import { CalendarCheck, Clock, Users, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Section, SectionHeader } from '@/components/ui/Section';
import { COMPLEX_HOURS, POOLS } from '../data/facilities';
import { FacilityCard } from './FacilityCard';

const POOL_FACTS = [
  { icon: Clock, label: 'Horario', value: COMPLEX_HOURS },
  { icon: Users, label: 'Capacidad', value: '50 personas por piscina y hora' },
  {
    icon: CalendarCheck,
    label: 'Piscina completa',
    value: `Jornada completa de ${COMPLEX_HOURS} con 20% de descuento`,
  },
  {
    icon: Wrench,
    label: 'Mantenimiento',
    value: 'Los lunes, o los martes cuando el lunes es festivo',
  },
];

export function Pools() {
  return (
    <Section id="piscinas" className="border-t border-text-main/10 bg-club-surface/50">
      <SectionHeader
        eyebrow="Zona acuática"
        title="Nuestras"
        highlightedTitle="piscinas"
        description="Tres piscinas para adultos de estándar semiolímpico y una piscina infantil, todas con temperatura controlada y supervisión de salvavidas."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {POOLS.map((pool) => (
          <FacilityCard key={pool.id} facility={pool} />
        ))}

        <Card tone="dark" className="gap-6 p-7">
          <div>
            <h3 className="text-xl font-black uppercase leading-tight tracking-tight text-white">
              Datos de la zona acuática
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Información general de las piscinas para tu visita.
            </p>
          </div>

          <dl className="mt-auto space-y-4 text-sm">
            {POOL_FACTS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-club-primary" />
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-white/60">
                    {label}
                  </dt>
                  <dd className="leading-snug">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </Section>
  );
}