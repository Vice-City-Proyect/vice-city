'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import {
  validateLoginForm,
  isLoginFormValid,
  type LoginValidationErrors,
} from '../utils/login-validation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginValidationErrors>({});


  const clearFieldError = (field: keyof LoginValidationErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ── Validación de cliente ──────────────────────────────────────────────
    const errors = validateLoginForm(email, password);
    if (!isLoginFormValid(errors)) {
      setFieldErrors(errors);
      return;
    }

  };


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
      <div className="bg-club-surface flex items-center justify-center p-10 md:p-14 border-b md:border-b-0 md:border-r border-club-primary/30">
        <div className="flex flex-col items-center gap-3 select-none">
          {/*
           * Logo Vice City — representación tipográfica.
           * Sin imágenes para mantener la carga ligera y evitar dependencias
           * de archivos de /public en este entorno de desarrollo.
           */}
          <div
            className="border-2 border-club-accent px-8 py-6 flex flex-col items-center leading-none"
            style={{ minWidth: 180 }}
          >
            <span
              className="text-5xl font-black text-club-accent uppercase"
              style={{ fontFamily: 'serif', letterSpacing: '0.08em' }}
            >
              VICE
            </span>
            <span
              className="text-5xl font-black text-club-accent uppercase"
              style={{ fontFamily: 'serif', letterSpacing: '0.08em' }}
            >
              CITY
            </span>
            <span
              className="text-xs font-bold mt-1 uppercase tracking-[0.3em]"
              style={{ color: '#b0bf3f' }}
            >
              Sports
            </span>
          </div>
        </div>
      </div>

      {/* ── COLUMNA DERECHA: Formulario ────────────────────────────────────── */}
      <div className="bg-club-surface p-8 md:p-12 flex flex-col relative">
        {/* Badge de marca — esquina superior derecha */}
        <div className="absolute top-5 right-5 border border-club-accent/25 rounded px-1.5 py-1 flex flex-col items-center leading-none">
          <span className="text-[9px] font-black text-club-accent tracking-widest">VC</span>
          <span className="text-[9px] font-black text-club-accent tracking-widest">—</span>
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
            {/* ── Campo: Correo ─────────────────────────────────────────── */}
            <FormField htmlFor="email" label="Usuario / Correo" error={fieldErrors.email}>
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

            {/* ── Botón de submit ───────────────────────────────────────── */}
            <Button type="submit" size="sm" className="mt-2">
              Iniciar Sesión
            </Button>
          </form>

          {/* ── Divisor ─────────────────────────────────────────────────── */}
          <div className="mt-6 flex items-center justify-center relative">
            <div className="border-t border-club-primary/30 w-full" />
            <span className="absolute px-3 bg-club-surface text-[10px] text-text-muted uppercase tracking-widest font-bold">
              O continuar con
            </span>
          </div>

          {/* ── Social Login ────────────────────────────────────────────── */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-club-primary/30 bg-club-surface hover:bg-club-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-club-primary focus:ring-offset-2"
              onClick={() => console.log('Continue with Google')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-xs font-bold text-club-accent tracking-wide">Continue with Google</span>
            </button>
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
    </div>
  );
}
