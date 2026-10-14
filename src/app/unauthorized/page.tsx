import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Acceso denegado | Vice City',
  description: 'No tienes permiso para ver esta página.',
};

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-club-bg px-4">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-club-surface text-club-accent shadow-sm">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black uppercase tracking-tight text-club-accent">
            Acceso <span className="text-club-primary">denegado</span>
          </h1>
          <p className="text-sm text-text-muted">
            Tu cuenta no tiene permiso para ver esta página. Si crees que es un error, contacta al
            administrador del complejo.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/">Volver al inicio</ButtonLink>
          <ButtonLink href="/login" variant="light">
            Iniciar sesión con otra cuenta
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
