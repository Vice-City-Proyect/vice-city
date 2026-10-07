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

            {/* ── Botón de submit ───────────────────────────────────────── */}
            <Button type="submit" size="sm" className="mt-2">
              Iniciar Sesión
            </Button>
          </form>

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
