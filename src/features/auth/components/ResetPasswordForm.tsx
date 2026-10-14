"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

const cardStyle = {
  border: "1.5px solid #b0bf3f",
  boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
} as const;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; submit?: string }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!password) newErrors.password = "La contraseña es requerida";
    else if (password.length < 8) newErrors.password = "Debe tener al menos 8 caracteres";
    if (password !== confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors({ submit: payload?.message || "No se pudo restablecer la contraseña." });
        return;
      }
      setDone(true);
    } catch {
      setErrors({ submit: "No se pudo conectar con el servidor. Intenta nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md p-8 rounded-3xl bg-club-surface text-center space-y-4" style={cardStyle}>
        <h1 className="text-2xl font-bold text-club-accent">Enlace inválido</h1>
        <p className="text-text-muted text-sm">
          Falta el token de recuperación. Solicita un nuevo enlace.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block mt-2 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md p-8 rounded-3xl bg-club-surface text-center space-y-4" style={cardStyle}>
        <h1 className="text-2xl font-bold text-club-accent">Contraseña actualizada</h1>
        <p className="text-text-muted text-sm">
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Link
          href="/login"
          className="inline-block mt-2 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
        >
          Iniciar Sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-club-surface" style={cardStyle}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-club-accent tracking-tight">
          Nueva contraseña
        </h1>
        <p className="text-sm italic text-text-muted mt-2 font-serif">
          Define una contraseña segura para tu cuenta
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.submit && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center"
          >
            {errors.submit}
          </div>
        )}

        <FormField htmlFor="password" label="Nueva Contraseña" error={errors.password}>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            autoComplete="new-password"
            placeholder="••••••••"
            error={!!errors.password}
            disabled={loading}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
        </FormField>

        <FormField htmlFor="confirmPassword" label="Confirmar Contraseña" error={errors.confirmPassword}>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            autoComplete="new-password"
            placeholder="••••••••"
            error={!!errors.confirmPassword}
            disabled={loading}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
          />
        </FormField>

        <div className="flex items-center gap-2">
          <input
            id="show-password-reset"
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="w-4 h-4 rounded border-[#b0bf3f] accent-[#b0bf3f] cursor-pointer"
          />
          <label htmlFor="show-password-reset" className="text-sm text-text-muted cursor-pointer select-none">
            Mostrar contraseñas
          </label>
        </div>

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? "GUARDANDO..." : "Restablecer contraseña"}
        </Button>
      </form>
    </div>
  );
}