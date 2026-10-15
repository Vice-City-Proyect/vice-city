'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogIn, Menu, X } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

const NAV_LINKS = [
  { href: '#piscinas', label: 'Piscinas' },
  { href: '#instalaciones', label: 'Instalaciones' },
  { href: '#ubicacion', label: 'Ubicación' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-text-main/10 bg-club-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-2 font-black uppercase leading-none tracking-tight text-club-accent"
        >
          <Image
            src="/logo-iguana-mejorado.png"
            alt="Logo Vice City Iguana Club"
            width={48}
            height={48}
            className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11 lg:h-12 lg:w-12"
            priority
          />
          <span className="whitespace-nowrap text-base sm:text-lg lg:text-2xl">
            Vice City <span className="text-club-primary">Iguana</span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative text-xs font-bold uppercase tracking-widest text-text-main transition-all duration-300 hover:text-club-primary hover:-translate-y-0.5"
            >
              {link.label}
              <span className="absolute -bottom-1.5 left-0 h-[2px] w-0 rounded-full bg-club-primary transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Botón de inicio de sesión en el nav con su respectivo icono */}
          <ButtonLink href="/login" size="md">
            <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
            Login
          </ButtonLink>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-movil"
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-text-main/15 text-club-accent transition-colors hover:bg-club-surface md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="menu-movil"
          aria-label="Navegación móvil"
          className="border-t border-text-main/10 bg-club-surface px-4 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={closeMenu}
                  className="block rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-text-main transition-colors hover:bg-club-bg"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}