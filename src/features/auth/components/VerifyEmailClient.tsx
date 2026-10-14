"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const cardStyle = {
  border: "1.5px solid #b0bf3f",
  boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
} as const;

type VerifyState = "verifying" | "success" | "already" | "expired" | "invalid" | "missing";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [state, setState] = useState<VerifyState>(token ? "verifying" : "missing");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/auth/confirm-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (response.ok) {
          setState("success");
          setMessage(payload?.message || "Tu correo fue confirmado.");
          return;
        }
        if (response.status === 409) {
          setState("already");
          setMessage(payload?.message || "El correo ya estaba confirmado.");
          return;
        }
        if (response.status === 410) {
          setState("expired");
          setMessage(payload?.message || "El enlace expiró.");
          return;
        }
        setState("invalid");
        setMessage(payload?.message || "El enlace no es válido.");
      } catch {
        if (!cancelled) {
          setState("invalid");
          setMessage("No se pudo conectar con el servidor.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const renderContent = () => {
    switch (state) {
      case "verifying":
        return <p className="text-text-muted text-sm">Verificando tu correo...</p>;
      case "success":
      case "already":
        return (
          <>
            <h1 className="text-2xl font-bold text-club-accent">
              {state === "success" ? "¡Correo confirmado!" : "Correo ya confirmado"}
            </h1>
            <p className="text-text-muted text-sm">{message}</p>
            <Link
              href="/login?verified=1"
              className="inline-block mt-2 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
            >
              Iniciar Sesión
            </Link>
          </>
        );
      case "expired":
        return (
          <>
            <h1 className="text-2xl font-bold text-club-accent">Enlace expirado</h1>
            <p className="text-text-muted text-sm">{message}</p>
            <Link
              href="/login"
              className="inline-block mt-2 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
            >
              Volver a Iniciar Sesión
            </Link>
          </>
        );
      default:
        return (
          <>
            <h1 className="text-2xl font-bold text-club-accent">
              {state === "missing" ? "Enlace incompleto" : "No se pudo confirmar"}
            </h1>
            <p className="text-text-muted text-sm">
              {message || "El enlace de confirmación está incompleto o no es válido."}
            </p>
            <Link
              href="/register"
              className="inline-block mt-2 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
            >
              Registrarme de nuevo
            </Link>
          </>
        );
    }
  };

  return (
    <div
      className="w-full max-w-md p-8 rounded-3xl bg-club-surface text-center flex flex-col items-center justify-center space-y-4"
      style={cardStyle}
    >
      {renderContent()}
    </div>
  );
}