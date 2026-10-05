import { Clock, MapPin } from 'lucide-react';

const NAV_LINKS = [
  { href: '#piscinas', label: 'Piscinas' },
  { href: '#instalaciones', label: 'Instalaciones' },
  { href: '#ubicacion', label: 'Ubicación y contacto' },
];

export function Footer() {
  return (
    <footer className="border-t-4 border-club-primary bg-club-accent text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 md:grid-cols-3">
          <div>
            <span className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-white lg:text-2xl">
              <span aria-hidden className="text-2xl lg:text-3xl">
                🦎
              </span>
              Vice City <span className="text-club-primary">Iguana</span>
            </span>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              Complejo deportivo en Barranquilla: piscinas semiolímpicas, canchas de fútbol y
              polideportivo, gimnasio y zona húmeda con sauna.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs text-white/60">
              <MapPin className="h-4 w-4 shrink-0 text-club-primary" />
              Cra. 53 # 106 - 280, Barranquilla, Atlántico
            </p>
          </div>

          <nav aria-label="Navegación del pie de página">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-club-primary">
              Navegación
            </h2>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-club-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-club-primary">
              Horario de atención
            </h2>
            <p className="flex items-center gap-2 text-sm text-white/70">
              <Clock className="h-4 w-4 shrink-0 text-club-primary" />
              Lunes a domingo
            </p>
            <p className="mt-1 text-sm font-bold text-white">8:00 AM – 5:00 PM</p>
            <p className="mt-3 text-xs leading-relaxed text-white/60">
              Incluye días festivos. El mantenimiento se programa los lunes, o los martes cuando el
              lunes es festivo.
            </p>
          </div>
        </div>

        <p className="pt-8 text-center text-xs text-white/60">
          © 2026 Vice City Iguana Club. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}