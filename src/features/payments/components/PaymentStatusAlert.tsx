"use client";

/**
 * Componente UI: Alerta de Estado del Proceso de Pago
 * Vice City - Tailwind v4
 */

import React from "react";

interface PaymentStatusAlertProps {
  status: "idle" | "processing" | "succeeded" | "failed" | "hold_expired";
  errorMessage?: string;
  onRetry?: () => void;
}

export function PaymentStatusAlert({
  status,
  errorMessage,
  onRetry,
}: PaymentStatusAlertProps) {
  if (status === "idle") return null;

  if (status === "hold_expired") {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-200 flex items-start gap-3 my-4">
        <span className="text-xl">⚠️</span>
        <div>
          <h4 className="font-semibold text-rose-300">Tiempo de HOLD agotado</h4>
          <p className="text-xs text-rose-200/80 mt-1">
            Los 10 minutos de retención exclusiva para esta reserva han finalizado y los cupos fueron liberados.
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200 flex items-start gap-3 my-4">
        <span className="text-xl">❌</span>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-300">Pago no completado</h4>
          <p className="text-xs text-amber-200/80 mt-1">
            {errorMessage || "No fue posible procesar la tarjeta con Stripe. Por favor verifique los datos o intente nuevamente."}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 underline"
            >
              Reintentar pago
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === "succeeded") {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-200 flex items-start gap-3 my-4">
        <span className="text-xl">✅</span>
        <div>
          <h4 className="font-semibold text-emerald-300">Pago iniciado con éxito</h4>
          <p className="text-xs text-emerald-200/80 mt-1">
            La transacción fue recibida por Stripe. El sistema confirmará su reserva tan pronto reciba la notificación oficial del webhook.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

