"use client";

/**
 * Componente UI: Botón de Checkout con Stripe (redirige a Stripe Hosted Checkout)
 * Vice City - Tailwind v4
 *
 * Este componente NO maneja datos de tarjeta. Llama al backend para crear una
 * Checkout Session de Stripe y redirige al usuario a la página de pago hospedada
 * por Stripe, donde se ingresa la información de la tarjeta de forma segura.
 *
 * La confirmación del pago se realiza a través del webhook de Stripe.
 */

import React, { useState } from "react";

interface StripeCheckoutFormProps {
  bookingId: string;
  amount: number;
  currency?: string;
  isHoldExpired?: boolean;
  onError?: (errorMessage: string) => void;
}

export function StripeCheckoutForm({
  bookingId,
  amount,
  currency = "COP",
  isHoldExpired = false,
  onError,
}: StripeCheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);

  const handleCheckout = async () => {
    if (isHoldExpired) {
      const msg = "El tiempo de retención (HOLD) ha expirado. No es posible procesar el pago.";
      setStatusMessage(msg);
      onError?.(msg);
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Error al crear la sesión de pago.");
      }

      const checkoutUrl = data.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("No se recibió la URL de pago desde el servidor.");
      }

      // Redirigir al usuario a la página de checkout hospedada por Stripe
      setStatusMessage("Redirigiendo a la pasarela de pago segura...");
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setIsProcessing(false);
      const errorMsg = err.message || "Error desconocido al iniciar el pago.";
      setStatusMessage(errorMsg);
      onError?.(errorMsg);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-lg w-full text-white">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>💳 Pago con Tarjeta</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
              Stripe
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Crédito o débito nacional e internacional</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block">Total a pagar</span>
          <span className="text-lg font-black text-emerald-400">{formattedAmount}</span>
        </div>
      </div>

      {/* Información del proceso */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-5 text-xs text-slate-300 flex items-start gap-2">
        <span className="text-base">🔒</span>
        <div>
          <strong className="block font-medium text-slate-200">Pago seguro</strong>
          Al hacer clic en el botón, serás redirigido a la página de pago de Stripe donde podrás
          ingresar tu información de tarjeta de forma segura. Vice City no almacena datos de tarjeta.
        </div>
      </div>

      {/* Mensaje de Estado / Error */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 mb-4 ${
            isHoldExpired
              ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
              : statusMessage.includes("Redirigiendo")
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
          }`}
        >
          <span>ℹ️</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Botón de Pago */}
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isHoldExpired || isProcessing}
        className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Preparando pago seguro...</span>
          </>
        ) : isHoldExpired ? (
          <span>HOLD Vencido — No se puede pagar</span>
        ) : (
          <span>Pagar {formattedAmount}</span>
        )}
      </button>

      <p className="text-[11px] text-center text-slate-500 mt-3">
        🔒 Serás redirigido a Stripe para completar el pago. La confirmación de tu reserva
        depende de la validación oficial del pago por parte de Stripe.
      </p>
    </div>
  );
}
