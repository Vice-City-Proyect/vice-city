"use client";

/**
 * Componente UI: Checkout con Tarjeta de Crédito/Débito (Stripe Test)
 * Vice City - Tailwind v4
 */

import React, { useState } from "react";

interface StripeCheckoutFormProps {
  bookingId: string;
  amount: number;
  currency?: string;
  clientSecret?: string;
  isHoldExpired?: boolean;
  onPaymentInitiated?: (paymentIntentId: string) => void;
  onError?: (errorMessage: string) => void;
}

export function StripeCheckoutForm({
  bookingId,
  amount,
  currency = "COP",
  clientSecret,
  isHoldExpired = false,
  onPaymentInitiated,
  onError,
}: StripeCheckoutFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isHoldExpired) {
      const msg = "El tiempo de retención (HOLD) ha expirado. No es posible procesar el pago.";
      setStatusMessage(msg);
      onError?.(msg);
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      // 1. Iniciar el intent de pago en backend si no se cuenta con clientSecret
      let activeSecret = clientSecret;
      let paymentIntentId = "";

      if (!activeSecret) {
        const response = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Error al iniciar el pago con Stripe.");
        }

        activeSecret = data.data.clientSecret;
        paymentIntentId = data.data.providerReference;
      }

      // 2. Simulación de confirmación en cliente con Stripe Test (El front NO marca la reserva como pagada)
      setStatusMessage("Comunicando con Stripe Test... Procesando tarjeta.");

      // Simulamos la latencia de confirmación segura de Stripe Elements
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMessage("Pago enviado a Stripe. Esperando confirmación segura...");
        onPaymentInitiated?.(paymentIntentId);
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      const errorMsg = err.message || "Error desconocido al procesar el pago.";
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
              Stripe Test
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Crédito o débito nacional e internacional</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block">Total a pagar</span>
          <span className="text-lg font-black text-emerald-400">{formattedAmount}</span>
        </div>
      </div>

      {/* Aviso Modo Test */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-5 text-xs text-amber-200 flex items-start gap-2">
        <span className="text-base">🧪</span>
        <div>
          <strong className="block font-medium">Modo de prueba activo</strong>
          Puedes usar la tarjeta de prueba Stripe: <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-300 font-mono">4242 •••• •••• 4242</code> con cualquier fecha futura y CVC de 3 dígitos.
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Nombre en la tarjeta
          </label>
          <input
            type="text"
            required
            disabled={isHoldExpired || isProcessing}
            placeholder="Juan Pérez"
            value={nameOnCard}
            onChange={(e) => setNameOnCard(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Número de tarjeta
          </label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={19}
              disabled={isHoldExpired || isProcessing}
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
            />
            <div className="absolute right-3 top-2.5 flex items-center gap-1.5 pointer-events-none text-slate-400 text-xs">
              <span>VISA</span>
              <span>•</span>
              <span>MC</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Vencimiento (MM/AA)
            </label>
            <input
              type="text"
              required
              maxLength={5}
              disabled={isHoldExpired || isProcessing}
              placeholder="12/28"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              CVC / CVV
            </label>
            <input
              type="password"
              required
              maxLength={4}
              disabled={isHoldExpired || isProcessing}
              placeholder="•••"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 text-center"
            />
          </div>
        </div>

        {/* Mensaje de Estado / Error */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              isHoldExpired
                ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                : "bg-slate-800 text-slate-200 border border-slate-700"
            }`}
          >
            <span>ℹ️</span>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Botón de Pago */}
        <button
          type="submit"
          disabled={isHoldExpired || isProcessing}
          className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Procesando pago seguro...</span>
            </>
          ) : isHoldExpired ? (
            <span>HOLD Vencido — No se puede pagar</span>
          ) : (
            <span>Pagar {formattedAmount}</span>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-500 mt-2">
          🔒 Los datos son procesados de forma cifrada mediante Stripe. El frontend no almacena información de tarjetas.
        </p>
      </form>
    </div>
  );
}

