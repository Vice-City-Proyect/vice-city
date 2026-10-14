"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

interface ResendConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ResendConfirmationModal({
  open,
  onClose,
  defaultEmail = "",
}: ResendConfirmationModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setEmail(defaultEmail);
      setFieldError(undefined);
      setSubmitError(null);
      setSuccessMessage(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setFieldError("El correo electrónico es requerido");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFieldError("Ingresa un correo electrónico válido");
      return;
    }

    setFieldError(undefined);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setSuccessMessage(
          payload?.message ||
            "¡Correo de confirmación enviado! Revisa tu bandeja de entrada o carpeta de spam."
        );
        return;
      }

      if (
        response.status === 409 ||
        payload?.error === "USER_ALREADY_VERIFIED" ||
        payload?.error === "EMAIL_ALREADY_CONFIRMED"
      ) {
        setSubmitError(
          "Tu correo electrónico ya se encuentra confirmado. Ya puedes iniciar sesión con tu cuenta."
        );
        return;
      }

      if (response.status === 404 || payload?.error === "USER_NOT_FOUND") {
        setSubmitError(
          "No se encontró ninguna cuenta registrada con este correo electrónico."
        );
        return;
      }

      setSubmitError(
        payload?.message || "No se pudo reenviar el correo. Intenta de nuevo más tarde."
      );
    } catch {
      setSubmitError(
        "No se pudo conectar con el servidor. Verifica tu conexión a internet."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reenviar Confirmación"
      eyebrow="Activación de Cuenta"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-text-muted">
          Ingresa el correo electrónico asociado a tu cuenta para recibir un nuevo enlace de confirmación válido por 24 horas.
        </p>

        {successMessage ? (
          <div className="space-y-4 text-center py-2">
            <div
              role="status"
              className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium"
            >
              {successMessage}
            </div>
            <p className="text-xs text-text-muted">
              Si no ves el mensaje en unos minutos, asegúrate de revisar tu carpeta de correo no deseado (spam).
            </p>
            <Button
              type="button"
              variant="dark"
              size="sm"
              onClick={onClose}
              className="w-full mt-2"
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm"
              >
                {submitError}
              </div>
            )}

            <FormField htmlFor="resend-email" label="Correo Electrónico" error={fieldError}>
              <Input
                id="resend-email"
                type="email"
                value={email}
                autoComplete="email"
                placeholder="tu-correo@ejemplo.com"
                error={!!fieldError}
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(undefined);
                }}
              />
            </FormField>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs rounded-xl font-bold uppercase tracking-wider border border-club-primary/30 text-text-main hover:bg-club-bg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Enlace"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
