import { CalendarPlus, Dumbbell, Users, Wallet } from 'lucide-react';
import { QuickLinks } from '@/components/common/QuickLinks';

const ACTIONS = [
  { href: '/admin/reservas', label: 'Nueva reserva', icon: CalendarPlus },
  { href: '/admin/servicios', label: 'Servicios', icon: Dumbbell },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/ganancias', label: 'Ganancias', icon: Wallet },
];

export function QuickActions() {
  return (
    <QuickLinks
      title={
        <>
          Acciones <span className="text-club-primary">rápidas</span>
        </>
      }
      description="Accesos directos a los módulos del panel."
      items={ACTIONS}
    />
  );
}
