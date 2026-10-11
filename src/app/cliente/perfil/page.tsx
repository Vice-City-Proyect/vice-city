'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, KeyRound, LogOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format';
import { MOCK_CLIENT_SESSION } from '@/features/auth/data/mock-session';
import { MOCK_USERS } from '@/features/users/data/mock-users';

const PROFILE = MOCK_USERS.find((user) => user.id === MOCK_CLIENT_SESSION.id);

export default function ClientProfilePage() {
  const [personal, setPersonal] = useState({
    name: MOCK_CLIENT_SESSION.name,
    email: MOCK_CLIENT_SESSION.email,
    phone: PROFILE?.phone ?? '',
  });
  const [saved, setSaved] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  function handlePersonalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaved(false);

    if (passwords.next.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setPasswordError('');
    setPasswordSaved(true);
    setPasswords({ current: '', next: '', confirm: '' });
  }

  return (
    <>
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mi"
        highlightedTitle="perfil"
        description="Actualiza tu información personal y la seguridad de tu cuenta."
        actions={
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-text-main/10 bg-club-surface px-5 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-club-bg text-club-accent">
                <Save className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                  Información personal
                </h2>
                <p className="text-xs text-text-muted">Nombre, correo y teléfono de contacto.</p>
              </div>
            </div>

            <form onSubmit={handlePersonalSubmit} className="flex flex-col gap-4">
              <FormField htmlFor="profile-name" label="Nombre completo">
                <Input
                  id="profile-name"
                  value={personal.name}
                  onChange={(event) => {
                    setPersonal({ ...personal, name: event.target.value });
                    setSaved(false);
                  }}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField htmlFor="profile-email" label="Correo electrónico">
                  <Input
                    id="profile-email"
                    type="email"
                    value={personal.email}
                    onChange={(event) => {
                      setPersonal({ ...personal, email: event.target.value });
                      setSaved(false);
                    }}
                    required
                  />
                </FormField>

                <FormField htmlFor="profile-phone" label="Teléfono">
                  <Input
                    id="profile-phone"
                    value={personal.phone}
                    onChange={(event) => {
                      setPersonal({ ...personal, phone: event.target.value });
                      setSaved(false);
                    }}
                  />
                </FormField>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" type="submit">
                  Guardar cambios
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-club-accent">
                    <Check className="h-4 w-4" />
                    Cambios guardados
                  </span>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-club-bg text-club-accent">
                <KeyRound className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-club-accent">
                  Cambiar contraseña
                </h2>
                <p className="text-xs text-text-muted">Actualiza el acceso a tu cuenta.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <FormField htmlFor="profile-password" label="Contraseña actual">
                <Input
                  id="profile-password"
                  type="password"
                  value={passwords.current}
                  onChange={(event) =>
                    setPasswords({ ...passwords, current: event.target.value })
                  }
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  htmlFor="profile-password-new"
                  label="Nueva contraseña"
                  error={passwordError || undefined}
                >
                  <Input
                    id="profile-password-new"
                    type="password"
                    value={passwords.next}
                    onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
                    required
                  />
                </FormField>

                <FormField htmlFor="profile-password-confirm" label="Confirmar contraseña">
                  <Input
                    id="profile-password-confirm"
                    type="password"
                    value={passwords.confirm}
                    onChange={(event) =>
                      setPasswords({ ...passwords, confirm: event.target.value })
                    }
                    required
                  />
                </FormField>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" type="submit">
                  Actualizar contraseña
                </Button>
                {passwordSaved && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-club-accent">
                    <Check className="h-4 w-4" />
                    Contraseña actualizada
                  </span>
                )}
              </div>
            </form>
          </Card>
        </div>

        <Card className="h-fit p-5 sm:p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar name={personal.name} size="lg" />
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black uppercase leading-tight tracking-tight text-club-accent">
                {personal.name}
              </h2>
              <div className="flex justify-center">
                <StatusBadge status={PROFILE?.status ?? 'ACTIVE'} />
              </div>
            </div>
          </div>

          <dl className="mt-6 flex flex-col gap-3 border-t border-text-main/10 pt-4 text-xs">
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Correo</dt>
              <dd className="mt-1 break-all font-bold text-text-main">{personal.email}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Teléfono</dt>
              <dd className="mt-1 font-bold text-text-main">{personal.phone || '—'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Rol</dt>
              <dd className="mt-1 font-bold text-text-main">Cliente</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">
                Fecha de registro
              </dt>
              <dd className="mt-1 font-bold text-text-main">
                {PROFILE ? formatDate(PROFILE.registeredAt) : '—'}
              </dd>
            </div>
          </dl>

          <p className="mt-5 rounded-2xl border border-text-main/10 bg-club-bg/60 p-3 text-[11px] leading-relaxed text-text-muted">
            Los cambios se guardan de forma visual en esta demostración. La persistencia real se
            conectará al backend en una fase posterior.
          </p>
        </Card>
      </div>
    </>
  );
}
