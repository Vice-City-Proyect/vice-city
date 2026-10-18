'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession, getProviders } from 'next-auth/react';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import {
  validateLoginForm,
  isLoginFormValid,
  resolveLoginErrorMessage,
  type LoginValidationErrors,
} from '../utils/login-validation';
import {
  sanitizeInternalCallbackUrl,
  extractRoleFromSession,
} from '../utils/url-sanitizer';
import { DASHBOARD_BY_ROLE } from '../utils/role-home';
import { ResendConfirmationModal } from './ResendConfirmationModal';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  GoogleEmailNotProvided:
    'Tu cuenta de Google no compartió un correo electrónico. Usa otro método de acceso.',
  GoogleEmailNotVerified:
    'Debes confirmar tu correo electrónico antes de iniciar sesión.',
  EmailNotVerified:
    'Debes confirmar tu correo electrónico antes de iniciar sesión.',
  CredentialsSignin:
    'Correo o contraseña incorrectos. Verifica tus datos.',
  UserInactive:
    'Tu cuenta está desactivada. Contacta al administrador del complejo.',
  GoogleAuthFailed:
    'No se pudo completar el inicio de sesión con Google. Intenta nuevamente.',
  OAuthAccountNotLinked:
    'Ese correo ya está registrado con contraseña. Inicia sesión con tu correo y contraseña.',
  OAuthSignin: 'No se pudo iniciar el flujo de Google. Intenta nuevamente.',
  OAuthCallback: 'Google devolvió una respuesta inválida. Intenta nuevamente.',
  AccessDenied: 'Se canceló o denegó el acceso con Google.',
  Configuration: 'El inicio de sesión con Google no está configurado en el servidor.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // null = consultando; true/false = proveedor Google disponible según el servidor.
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);

  const readCallbackUrl = useCallback(
    () => searchParams.get('callbackUrl'),
    [searchParams]
  );
  const readCallbackUrlRef = useRef(readCallbackUrl);
  useEffect(() => {
    readCallbackUrlRef.current = readCallbackUrl;
  }, [readCallbackUrl]);

  useEffect(() => {
    let active = true;

    // 1. Verificación de sesión activa: redirige al dashboard del rol si ya está autenticado
    async function checkExistingSession() {
      try {
        let role: string | undefined;

        try {
          const session = await getSession();
          role = extractRoleFromSession(session);
        } catch {
          // Fallo no bloqueante en getSession
        }

        if (!role && active) {
          try {
            const res = await fetch('/api/auth/session', { cache: 'no-store' });
            if (res.ok) {
              const json: unknown = await res.json();
              role = extractRoleFromSession(json);
            }
          } catch {
            // Fallo no bloqueante en /api/auth/session
          }
        }

        if (!active) return;

        if (role) {
          setCheckingSession(true);
          const rawCallback = readCallbackUrlRef.current ? readCallbackUrlRef.current() : null;
          const safeCallback = sanitizeInternalCallbackUrl(rawCallback);
          const roleDestination = DASHBOARD_BY_ROLE[role] || '/';
          const destination = safeCallback || roleDestination;
          if (typeof window !== 'undefined') {
            window.location.href = destination;
          } else {
            router.replace(destination);
          }
          return;
        }
      } catch {
        // Fallo de verificación de sesión inicial
      }
    }

    void checkExistingSession();

    // 2. Consulta disponibilidad del proveedor Google OAuth
    getProviders()
      .then((providers) => {
        if (active) setGoogleAvailable(Boolean(providers && 'google' in providers));
      })
      .catch(() => {
        if (active) setGoogleAvailable(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  const errorCode = searchParams.get('error');
  const oauthError = errorCode
    ? OAUTH_ERROR_MESSAGES[errorCode] || resolveLoginErrorMessage(errorCode)
    : null;

  const urlNotice =
    searchParams.get('registered') === '1'
      ? 'Cuenta creada. Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.'
      : searchParams.get('verified') === '1'
        ? 'Tu correo fue confirmado. Ya puedes iniciar sesión.'
        : null;

  const displayError = submitError || oauthError;

  const handleGoogleSignIn = async () => {
    setSubmitError(null);
    if (googleAvailable === false) {
      setSubmitError(OAUTH_ERROR_MESSAGES.Configuration);
      return;
    }
    setGoogleLoading(true);
    try {
      const rawCallback = readCallbackUrl();
      const safeCallback = sanitizeInternalCallbackUrl(rawCallback);
      const callbackUrl = safeCallback || '/cliente';
      const result = await signIn('google', { callbackUrl, redirect: false });
      if (result?.error) {
        setSubmitError('No se pudo iniciar sesión con Google. Intenta nuevamente.');
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setSubmitError('No se pudo iniciar sesión con Google. Intenta nuevamente.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const clearFieldError = (field: keyof LoginValidationErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    // ── Validación de cliente ──────────────────────────────────────────────
    const errors = validateLoginForm(email, password);
    if (!isLoginFormValid(errors)) {
      setFieldErrors(errors);
      return;
    }

    // ── Autenticación real contra NextAuth (Proveedor de credenciales) ─────
    setSubmitting(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setSubmitError(resolveLoginErrorMessage(result?.error));
        return;
      }

      // Resiliencia de sesión: sondeo con reintentos para asegurar sincronización de cookies
      let role: string | undefined;
      for (let attempt = 0; attempt < 5; attempt++) {
        const session = await getSession();
        role = extractRoleFromSession(session);
        if (role) break;

        try {
          const res = await fetch('/api/auth/session', { cache: 'no-store' });
          if (res.ok) {
            const json: unknown = await res.json();
            role = extractRoleFromSession(json);
            if (role) break;
          }
        } catch {
          // Ignorar fallo de consulta auxiliar
        }

        try {
          const meRes = await fetch('/api/users/me', { cache: 'no-store' });
          if (meRes.ok) {
            const meJson: unknown = await meRes.json();
            role = extractRoleFromSession(meJson);
            if (role) break;
          }
        } catch {
          // Ignorar fallo de consulta auxiliar
        }

        if (attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      // Si por latencia de cookies el rol no se resolvió pero las credenciales fueron válidas:
      // se infiere el rol a partir de la cuenta autenticada para evitar enviar a un usuario
      // ya validado a la raíz ('/').
      if (!role) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail.startsWith('admin@') || cleanEmail.includes('admin')) {
          role = 'ADMIN';
        } else {
          role = 'CLIENT';
        }
      }

      const safeCallback = sanitizeInternalCallbackUrl(readCallbackUrl());
      const roleDestination = role ? DASHBOARD_BY_ROLE[role] || '/cliente' : '/cliente';
      const destination = safeCallback || roleDestination;

      if (typeof window !== 'undefined') {
        window.location.href = destination;
      } else {
        router.push(destination);
        router.refresh();
      }
    } catch {
      setSubmitError('No se pudo iniciar sesión. Intenta de nuevo más tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div
        className="w-full max-w-220 bg-club-surface rounded-3xl overflow-hidden flex items-center justify-center min-h-120"
        style={{
          border: '1.5px solid #b0bf3f',
          boxShadow:
            '0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)',
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-club-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-club-accent tracking-wider uppercase">
            Verificando sesión...
          </span>
        </div>
      </div>
    );
  }


  return (
    <div
      className="w-full max-w-220 bg-club-surface rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-120"
      style={{
        border: '1.5px solid #b0bf3f',
        boxShadow:
          '0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)',
      }}
    >
      {/* ── COLUMNA IZQUIERDA: Branding ────────────────────────────────────── */}
      <div className="bg-club-surface flex items-center justify-center p-6 sm:p-10 md:p-14 border-b md:border-b-0 md:border-r border-club-primary/30">
        <div className="flex flex-col items-center gap-3 select-none">
          {/* Logo Vice City — asset oficial en /public/logo/logo.jpeg */}
          <Image
            src="/logo/logo.jpeg"
            alt="Vice City Sports"
            width={220}
            height={220}
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* ── COLUMNA DERECHA: Formulario ────────────────────────────────────── */}
      <div className="bg-club-surface p-6 sm:p-8 md:p-12 flex flex-col relative">
        {/* Mini logo — esquina superior derecha */}
        <div className="absolute top-5 right-5 border border-club-accent/25 rounded-lg overflow-hidden flex items-center justify-center">
          <Image
            src="/logo/favicon-updated.jpg"
            alt="Vice City Favicon"
            width={32}
            height={32}
            className="h-8 w-8 object-cover"
          />
        </div>

        <div className="my-auto w-full max-w-sm mx-auto pt-6 md:pt-0">
          {/* Encabezado */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-club-accent tracking-tight">
              Bienvenido
            </h1>
            <p className="text-sm italic text-text-muted mt-2 font-serif">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* ── Aviso informativo (registro/verificación) ─────────────── */}
            {urlNotice && (
              <div
                role="status"
                className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm text-center"
              >
                {urlNotice}
              </div>
            )}

            {/* ── Error de autenticación ────────────────────────────────── */}
            {displayError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center"
              >
                <p>{displayError}</p>
                {displayError.toLowerCase().includes('confirmar tu correo') && (
                  <button
                    type="button"
                    onClick={() => setIsResendModalOpen(true)}
                    className="mt-2 text-xs font-bold text-club-accent underline hover:text-club-primary transition-colors cursor-pointer block mx-auto"
                  >
                    ¿No recibiste el correo? Haz clic aquí para reenviarlo
                  </button>
                )}
              </div>
            )}

            {/* ── Campo: Correo ─────────────────────────────────────────── */}
            <FormField htmlFor="text" label="Usuario / Correo" error={fieldErrors.email}>
              <Input
                id="email"
                type="email"
                value={email}
                autoComplete="email"
                placeholder="Ingresa tu correo"
                error={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
              />
            </FormField>

            {/* ── Campo: Contraseña ─────────────────────────────────────── */}
            <FormField htmlFor="password" label="Contraseña" error={fieldErrors.password}>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                error={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
              />
            </FormField>

            {/* ── Toggle: Mostrar contraseña ────────────────────────────── */}
            <div className="flex items-center gap-2">
              <input
                id="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="w-4 h-4 rounded border-[#b0bf3f] accent-[#b0bf3f] cursor-pointer"
              />
              <label
                htmlFor="show-password"
                className="text-sm text-text-muted cursor-pointer select-none"
              >
                Mostrar contraseña
              </label>
            </div>

            {/* ── Enlaces secundarios: reenvío y recuperación ──────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 -mt-2 text-center sm:text-left">
              <button
                type="button"
                onClick={() => setIsResendModalOpen(true)}
                className="text-xs text-text-muted hover:text-club-accent transition-colors underline underline-offset-2 cursor-pointer"
              >
                Reenviar confirmación
              </button>
              <Link
                href="/forgot-password"
                className="text-xs text-text-muted hover:text-club-accent transition-colors underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* ── Botón de submit ───────────────────────────────────────── */}
            <Button type="submit" size="sm" className="mt-2" disabled={submitting}>
              {submitting ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          {/* ── Divisor + Social Login ── */}
          <div className="mt-6 flex items-center justify-center relative">
            <div className="border-t border-club-primary/30 w-full" />
            <span className="absolute px-3 bg-club-surface text-[10px] text-text-muted uppercase tracking-widest font-bold">
              O continuar con
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={googleLoading || submitting || googleAvailable === false}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-club-primary/30 bg-club-surface hover:bg-club-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-club-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleGoogleSignIn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-xs font-bold text-club-accent tracking-wide">
                {googleLoading ? 'Conectando...' : 'Continue with Google'}
              </span>
            </button>
            {googleAvailable === false && (
              <p role="status" className="text-[11px] text-text-muted text-center">
                El inicio de sesión con Google no está disponible (no configurado en el servidor).
              </p>
            )}
          </div>

          {/* ── Enlace a registro ─────────────────────────────────────────── */}
          <p className="mt-6 text-center text-xs text-text-muted">
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              className="font-bold text-club-accent hover:text-club-primary transition-colors underline underline-offset-2"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>

      <ResendConfirmationModal
        open={isResendModalOpen}
        onClose={() => setIsResendModalOpen(false)}
        defaultEmail={email}
      />
    </div>
  );
}
