'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { NavItem } from './app-nav';

interface AppShellProps {
  nav: NavItem[];
  user: { name: string; roleLabel: string };
  children: ReactNode;
}

export function AppShell({ nav, user, children }: AppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-club-bg text-text-main">
      {isMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-30 bg-club-accent/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-club-accent text-white transition-transform duration-200 lg:w-64 lg:translate-x-0 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5 lg:h-20">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-black uppercase tracking-tight"
            onClick={() => setIsMenuOpen(false)}
          >
            <span aria-hidden="true">🦎</span>
            <span>
              Vice City <span className="text-club-primary">Iguana</span>
            </span>
          </Link>

          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="flex flex-col gap-1.5">
            {nav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                      isActive
                        ? 'bg-club-primary text-btn-text'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-text-main/10 bg-club-bg/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menú"
                onClick={() => setIsMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-text-main/10 bg-club-surface text-text-main lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>

              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {user.roleLabel}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-xs font-bold uppercase tracking-wider text-text-main">
                  {user.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-text-muted">
                  {user.roleLabel}
                </span>
              </div>
              <Avatar name={user.name} size="sm" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
