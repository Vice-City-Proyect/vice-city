"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const cardStyle = {
  border: "1.5px solid #b0bf3f",
  boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
} as const;

export type VerifyState =
  | "verifying"
  | "success"
  | "already"
  | "expired"
  | "invalid"
  | "missing"
  | "network_error";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [state, setState] = useState<VerifyState>(token ? "verifying" : "missing");
  const [message, setMessage] = useState<string>("");

  // Rastrear el token que ya ha sido solicitado o está en vuelo (H-AUTH-03)
  // Previene peticiones duplicadas causadas por el doble montaje de React.StrictMode
  // en desarrollo, re-renders o disparos repetidos.
  const requestedTokenRef = React.useRef<string | null>(null);

  const verifyToken = React.useCallback(async (tokenToVerify: string) => {
    setState("verifying");
    setMessage("");

    try {
      const response = await fetch("/api/auth/confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToVerify }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setState("success");
        setMessage(payload?.message || "Tu correo electrónico ha sido confirmado exitosamente.");
        return;
      }

      // Si el correo ya fue confirmado previamente o el token ya fue consumido (409 Conflict o TOKEN_ALREADY_USED)
      if (
        response.status === 409 ||
        payload?.error === "USER_ALREADY_VERIFIED" ||
        payload?.error === "TOKEN_ALREADY_USED" ||
        payload?.error === "EMAIL_ALREADY_CONFIRMED"
      ) {
        setState("already");
        setMessage(payload?.message || "Tu correo electrónico ya se encuentra confirmado.");
        return;
      }

      // Token expirado (410 Gone)
      if (response.status === 410 || payload?.error === "TOKEN_EXPIRED") {
        setState("expired");
        setMessage(payload?.message || "El enlace de confirmación ha expirado. Por favor, solicita uno nuevo.");
        return;
      }

      // Token inválido u otro error de validación (400 Bad Request)
      setState("invalid");
      setMessage(payload?.message || "El enlace de confirmación no es válido o está incompleto.");
    } catch {
      setState("network_error");
      setMessage("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setState("missing");
      return;
    }

    // Prevención de duplicados (H-AUTH-03):
    // Si ya enviamos o estamos procesando la verificación para este token, omitir.
    if (requestedTokenRef.current === token) {
      return;
    }

    requestedTokenRef.current = token;
    verifyToken(token);
  }, [token, verifyToken]);

  const handleRetry = () => {
    if (!token) return;
    requestedTokenRef.current = null; // Reiniciar guardia para reintento manual explícito
    verifyToken(token);
  };

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
      case "network_error":
        return (
          <>
            <h1 className="text-2xl font-bold text-club-accent">Error de conexión</h1>
            <p className="text-text-muted text-sm">{message}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-block mt-2 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors cursor-pointer"
            >
              Reintentar verificación
            </button>
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