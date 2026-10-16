"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, getProviders } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { ResendConfirmationModal } from "./ResendConfirmationModal";

export default function RegisterForm() {
  // --- Estados del Formulario ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // --- Estado de validación y UI ---
  const [errors, setErrors] = useState<{ 
    name?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
    submit?: string;
  }>({});
  const [status, setStatus] = useState<"initial" | "loading" | "success" | "error">("initial");
  const [googleLoading, setGoogleLoading] = useState(false);
  // null = consultando; true/false = proveedor Google disponible según el servidor.
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getProviders()
      .then((providers) => {
        if (active) setGoogleAvailable(Boolean(providers && "google" in providers));
      })
      .catch(() => {
        if (active) setGoogleAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleGoogleSignUp = async () => {
    setErrors({});
    if (googleAvailable === false) {
      setErrors({ submit: "El registro con Google no está configurado en el servidor." });
      return;
    }
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/cliente", redirect: true });
    } catch {
      setGoogleLoading(false);
      setErrors({ submit: "No se pudo continuar con Google. Intenta nuevamente." });
    }
  };

  /**
   * Valida el formato del correo mediante Expresión Regular
   */
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Ejecuta validaciones del cliente antes de enviar al backend.
   */
  const handleValidation = () => {
    const newErrors: typeof errors = {};
    let isValid = true;

    // Validación de Nombre Completo
    if (!name.trim()) {
      newErrors.name = "El nombre completo es requerido";
      isValid = false;
    }

    // Validación de Correo
    if (!email) {
      newErrors.email = "El correo electrónico es requerido";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Ingresa un correo electrónico válido";
      isValid = false;
    }

    // Validación de Contraseña (mínimo 8 caracteres, igual que el backend)
    if (!password) {
      newErrors.password = "La contraseña es requerida";
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
      isValid = false;
    }

    // Validación de Confirmación (deben coincidir)
    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contraseña";
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Manejador del evento Submit. Registra al usuario en el backend real.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("initial");
    
    if (!handleValidation()) return;

    setStatus("loading");
    setErrors({});

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus("error");
        setErrors({
          submit:
            payload?.message ||
            (response.status === 409
              ? "El correo ya se encuentra registrado. Inicia sesión en su lugar."
              : "No se pudo completar el registro. Verifica tus datos."),
        });
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrors({
        submit: "No se pudo conectar con el servidor. Intenta nuevamente más tarde.",
      });
    }
  };

  // --- Vista Exitoso (Success State) ---
  if (status === "success") {
    return (
      <div
        className="w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-club-surface text-center flex flex-col items-center justify-center space-y-4"
        style={{
          border: "1.5px solid #b0bf3f",
          boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
        }}
      >
        <div className="w-16 h-16 bg-[#b0bf3f]/20 rounded-full flex items-center justify-center text-club-accent mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-club-accent">¡Cuenta creada!</h2>
        <p className="text-text-muted text-sm">
          Te enviamos un correo de confirmación a <strong>{email}</strong>. Confírmalo para poder iniciar sesión.
        </p>
        <button
          type="button"
          onClick={() => setIsResendModalOpen(true)}
          className="mt-2 text-xs font-bold text-club-accent underline hover:text-club-primary transition-colors cursor-pointer"
        >
          ¿No recibiste el correo? Haz clic aquí para reenviarlo
        </button>
        <Link 
          href="/login"
          className="mt-4 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
        >
          Ir a Iniciar Sesión
        </Link>
        <ResendConfirmationModal
          open={isResendModalOpen}
          onClose={() => setIsResendModalOpen(false)}
          defaultEmail={email}
        />
      </div>
    );
  }

  // --- Vista Principal (Formulario de Registro) ---
  return (
    <div
      className="w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-club-surface"
      style={{
        border: "1.5px solid #b0bf3f",
        boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
      }}
    >
      {/* Cabecera */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-club-accent tracking-tight">
          Crear Cuenta
        </h1>
        <p className="text-sm italic text-text-muted mt-2 font-serif">
          Únete a Vice City Sports hoy
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Mensaje de error general de la API */}
        {errors.submit && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            {errors.submit}
          </div>
        )}

        {/* Campo: Nombre Completo */}
        <FormField htmlFor="name" label="Nombre Completo" error={errors.name}>
          <Input
            id="name"
            type="text"
            placeholder="Lucia Caminos"
            value={name}
            error={!!errors.name}
            disabled={status === "loading"}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
        </FormField>

        {/* Campo: Correo Electrónico */}
        <FormField htmlFor="email" label="Correo Electrónico" error={errors.email}>
          <Input
            id="email"
            type="email"
            placeholder="usuario@vicecity.club"
            value={email}
            error={!!errors.email}
            disabled={status === "loading"}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
        </FormField>

        {/* Campo: Contraseña */}
        <FormField htmlFor="password" label="Contraseña" error={errors.password}>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            error={!!errors.password}
            disabled={status === "loading"}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
        </FormField>

        {/* Campo: Confirmar Contraseña */}
        <FormField htmlFor="confirmPassword" label="Confirmar Contraseña" error={errors.confirmPassword}>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            error={!!errors.confirmPassword}
            disabled={status === "loading"}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
          />
        </FormField>

        {/* Toggle: Mostrar contraseña */}
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
            Mostrar contraseñas
          </label>
        </div>

        {/* Botón de Enviar */}
        <Button
          type="submit"
          className="w-full mt-2"
          disabled={status === "loading" || googleLoading || (!name && !email && !password && !confirmPassword)}
        >
          {status === "loading" ? "REGISTRANDO..." : "Registrarse"}
        </Button>

        {/* Divisor + Registro con Google */}
        <div className="mt-4 flex items-center justify-center relative">
          <div className="border-t border-club-primary/30 w-full" />
          <span className="absolute px-3 bg-club-surface text-[10px] text-text-muted uppercase tracking-widest font-bold">
            O continuar con
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={status === "loading" || googleLoading || googleAvailable === false}
          className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-club-primary/30 bg-club-surface hover:bg-club-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-club-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="text-xs font-bold text-club-accent tracking-wide">
            {googleLoading ? "Conectando..." : "Registrarse con Google"}
          </span>
        </button>
        {googleAvailable === false && (
          <p role="status" className="text-[11px] text-text-muted text-center">
            El registro con Google no está disponible (no configurado en el servidor).
          </p>
        )}

        {/* Enlace de Login */}
        <p className="mt-6 text-center text-xs text-text-muted">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-bold text-club-accent hover:text-club-primary transition-colors underline underline-offset-2"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </form>
    </div>
  );
}

