"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

const cardStyle = {
  border: "1.5px solid #b0bf3f",
  boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
} as const;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Ingresa un correo electrónico válido");
      return;
    }
    setFieldError(undefined);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(payload?.message || "No se pudo procesar la solicitud.");
        return;
      }
      setSent(true);
    } catch {
      setSubmitError("No se pudo conectar con el servidor. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-club-surface" style={cardStyle}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-club-accent tracking-tight">
          Recuperar contraseña
        </h1>
        <p className="text-sm italic text-text-muted mt-2 font-serif">
          Te enviaremos un enlace para restablecerla
        </p>
      </div>

      {sent ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-text-muted">
            Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace de
            recuperación. Revisa tu bandeja de entrada y la carpeta de spam.
          </p>
          <Link
            href="/login"
            className="inline-block mt-2 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
          >
            Volver a Iniciar Sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {submitError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center"
            >
              {submitError}
            </div>
          )}

          <FormField htmlFor="email" label="Correo Electrónico" error={fieldError}>
            <Input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              placeholder="usuario@vicecity.club"
              error={!!fieldError}
              disabled={loading}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError(undefined);
              }}
            />
          </FormField>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "ENVIANDO..." : "Enviar enlace"}
          </Button>

          <p className="text-center text-xs text-text-muted">
            <Link
              href="/login"
              className="font-bold text-club-accent hover:text-club-primary transition-colors underline underline-offset-2"
            >
              Volver a Iniciar Sesión
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}