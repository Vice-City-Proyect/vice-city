import { Section, SectionHeader } from '@/components/ui/Section';
import { FACILITIES } from '../data/facilities';
import { FacilityCard } from './FacilityCard';

export function Facilities() {
  return (
    <Section id="instalaciones">
      <SectionHeader
        eyebrow="Infraestructura deportiva"
        title="Otras"
        highlightedTitle="instalaciones"
        description="Canchas de fútbol y microfútbol, cancha polideportiva, gimnasio de fuerza y zona húmeda con sauna para completar tu entrenamiento."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FACILITIES.map((facility) => (
          <FacilityCard key={facility.id} facility={facility} />
        ))}
      </div>
    </Section>
  );
}