'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { AlertCircle, Check, KeyRound, Loader2, LogOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS } from '@/components/layout/app-nav';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  document_id: string | null;
  role: string;
  created_at: string | null;
  is_active: boolean;
}

export default function ClientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [personal, setPersonal] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/users/me');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesión no autorizada. Por favor, inicia sesión de nuevo.');
        }
        throw new Error('Error al cargar la información del perfil.');
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error(json.message || 'No se pudieron recuperar los datos del usuario.');
      }

      const data: UserProfile = json.data;
      setProfile(data);
      setPersonal({
        name: data.full_name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'No se pudo cargar la información del perfil.';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handlePersonalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: personal.name.trim(),
          phone: personal.phone.trim() ? personal.phone.trim() : null,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'No se pudieron guardar los cambios en el perfil.');
      }

      const updated = json.data as UserProfile;
      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      setPersonal((prev) => ({
        ...prev,
        name: updated.full_name,
        phone: updated.phone ?? '',
      }));
      setSaved(true);

      // Notificar a listeners globales (p. ej. AppShell / Layout)
      window.dispatchEvent(
        new CustomEvent('user-profile-updated', { detail: { full_name: updated.full_name } })
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocurrió un error al guardar los cambios.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <>
        <PageHeader
          eyebrow="Mi cuenta"
          title="Mi"
          highlightedTitle="perfil"
          description="Actualiza tu información personal y la seguridad de tu cuenta."
        />
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-club-accent" />
          <p className="text-sm font-semibold text-text-muted">
            Cargando información del perfil...
          </p>
        </div>
      </>
    );
  }

  if (fetchError) {
    return (
      <>
        <PageHeader
          eyebrow="Mi cuenta"
          title="Mi"
          highlightedTitle="perfil"
          description="Actualiza tu información personal y la seguridad de tu cuenta."
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center sm:p-12">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
            Error al cargar el perfil
          </h2>
          <p className="max-w-md text-sm text-text-muted">{fetchError}</p>
          <Button size="sm" onClick={fetchProfile} className="mt-2">
            Reintentar
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mi"
        highlightedTitle="perfil"
        description="Actualiza tu información personal y la seguridad de tu cuenta."
        actions={
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="inline-flex items-center gap-2 rounded-xl border border-text-main/10 bg-club-surface px-5 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-club-primary hover:text-club-accent"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
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
                    setSaveError(null);
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
                    disabled
                    readOnly
                    title="El correo electrónico está vinculado a tu cuenta y no puede modificarse"
                  />
                </FormField>

                <FormField htmlFor="profile-phone" label="Teléfono">
                  <Input
                    id="profile-phone"
                    value={personal.phone}
                    placeholder="Ej. +57 300 123 4567"
                    onChange={(event) => {
                      setPersonal({ ...personal, phone: event.target.value });
                      setSaved(false);
                      setSaveError(null);
                    }}
                  />
                </FormField>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" type="submit" disabled={saving}>
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    'Guardar cambios'
                  )}
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
            <Avatar name={profile?.full_name || personal.name} size="lg" />
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black uppercase leading-tight tracking-tight text-club-accent">
                {profile?.full_name || personal.name}
              </h2>
              <div className="flex justify-center">
                <StatusBadge status={profile?.is_active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
            </div>
          </div>

          <dl className="mt-6 flex flex-col gap-3 border-t border-text-main/10 pt-4 text-xs">
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Correo</dt>
              <dd className="mt-1 break-all font-bold text-text-main">
                {profile?.email || personal.email}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Teléfono</dt>
              <dd className="mt-1 font-bold text-text-main">{profile?.phone || '—'}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">Rol</dt>
              <dd className="mt-1 font-bold text-text-main">
                {ROLE_LABELS[profile?.role as keyof typeof ROLE_LABELS] ?? profile?.role ?? 'Cliente'}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">
                Documento de identidad
              </dt>
              <dd className="mt-1 font-bold text-text-main">
                {profile?.document_id || '—'}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-text-muted">
                Fecha de registro
              </dt>
              <dd className="mt-1 font-bold text-text-main">
                {profile?.created_at ? formatDate(profile.created_at) : '—'}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </>
  );
}
