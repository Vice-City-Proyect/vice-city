"use client";

/**
 * Componente UI: Formulario de Venta Presencial y Previsualización POS (HU25 & HU26 / RN-017, RN-019)
 * Vice City - Tailwind v4
 */

import React, { useState } from "react";
import type { PosSaleResult, PosPaymentMethod, PosPreviewResult } from "../types/pos.types";
import { PosReceiptCard } from "./PosReceiptCard";
import { PosTicketPreviewModal } from "./PosTicketPreviewModal";

interface PosSaleFormProps {
  sellerId?: string;
  sellerName?: string;
}

export function PosSaleForm({
  sellerId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  sellerName = "Taquillero de Turno",
}: PosSaleFormProps) {
  // Datos del Cliente
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Servicio y Franja
  const [serviceId, setServiceId] = useState("service-pool-uuid");
  const [serviceName, setServiceName] = useState("Piscina Adultos");
  const [unitPrice, setUnitPrice] = useState(2000);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  // Estado de procesamiento y Previsualización (HU26)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PosPreviewResult | null>(null);
  const [completedSale, setCompletedSale] = useState<PosSaleResult | null>(null);

  const calculateTotal = () => unitPrice * quantity;

  // Paso 1 (HU26): Previsualizar la venta antes de emitir
  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const startAt = `${date}T${startTime}:00-05:00`;
    const [h, m] = startTime.split(":").map(Number);
    const endH = String(h + 1).padStart(2, "0");
    const endAt = `${date}T${endH}:${String(m).padStart(2, "0")}:00-05:00`;

    try {
      const response = await fetch("/api/pos/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId,
          clientName,
          clientId,
          serviceId,
          startAt,
          endAt,
          quantity,
          paymentMethod,
          clientPhone: clientPhone || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Error al previsualizar la venta en taquilla.");
      }

      setPreviewData(data.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Error inesperado al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paso 2 (HU26): Confirmar y Emitir Ticket Digital con Idempotencia
  const handleConfirmSale = async () => {
    if (!previewData) return;

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: previewData.sellerId,
          clientName: previewData.clientName,
          clientId: previewData.clientId,
          serviceId: previewData.serviceId,
          startAt: previewData.startAt,
          endAt: previewData.endAt,
          quantity: previewData.quantity,
          paymentMethod: previewData.paymentMethod,
          clientPhone: clientPhone || undefined,
          notes: notes || undefined,
          previewAvailableCapacity: previewData.availableCapacity,
          idempotencyKey: previewData.previewId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Error al confirmar la venta en taquilla.");
      }

      setCompletedSale(data.data);
      setPreviewData(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Error inesperado al confirmar la emisión del ticket.");
      setPreviewData(null);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReset = () => {
    setClientName("");
    setClientId("");
    setClientPhone("");
    setQuantity(1);
    setNotes("");
    setPreviewData(null);
    setCompletedSale(null);
    setErrorMessage(null);
  };

  if (completedSale) {
    return <PosReceiptCard sale={completedSale} onNewSale={handleReset} />;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl max-w-xl w-full text-white mx-auto">
      {/* Encabezado del POS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">
            Módulo POS Empleado
          </span>
          <h2 className="text-xl font-black text-white mt-0.5">Taquilla & Ventas Presenciales</h2>
          <p className="text-xs text-slate-400">Vendedor: {sellerName}</p>
        </div>
        <span className="self-start sm:self-auto bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-full font-mono font-semibold">
          TICKET_SELLER
        </span>
      </div>

      {/* Alerta de Error */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
          <span className="text-base">❌</span>
          <div>
            <strong className="block font-semibold">Error en taquilla:</strong>
            {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handlePreview} className="space-y-4">
        {/* Sección Datos del Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nombre del Cliente *
            </label>
            <input
              type="text"
              required
              placeholder="Juan Pérez"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Cédula / Documento *
            </label>
            <input
              type="text"
              required
              placeholder="1020304050"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Teléfono de Contacto (Opcional)
          </label>
          <input
            type="tel"
            placeholder="300 123 4567"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Sección Servicio y Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Servicio Deportivo *
            </label>
            <select
              value={serviceId}
              onChange={(e) => {
                const selected = e.target.value;
                setServiceId(selected);
                if (selected === "service-pool-uuid") {
                  setServiceName("Piscina Adultos");
                  setUnitPrice(2000);
                } else if (selected === "service-cancha-uuid") {
                  setServiceName("Cancha Fútbol 11");
                  setUnitPrice(140000);
                } else {
                  setServiceName("Zona Húmeda");
                  setUnitPrice(4000);
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="service-pool-uuid">Piscina Adultos ($2.000 /h)</option>
              <option value="service-cancha-uuid">Cancha Fútbol 11 ($140.000 /h)</option>
              <option value="service-humeda-uuid">Zona Húmeda ($4.000 /h)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Fecha de Reserva *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Franja Horaria y Cantidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Franja Horaria *
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            >
              <option value="08:00">08:00 AM – 09:00 AM</option>
              <option value="09:00">09:00 AM – 10:00 AM</option>
              <option value="10:00">10:00 AM – 11:00 AM</option>
              <option value="11:00">11:00 AM – 12:00 PM</option>
              <option value="12:00">12:00 PM – 01:00 PM</option>
              <option value="13:00">01:00 PM – 02:00 PM</option>
              <option value="14:00">02:00 PM – 03:00 PM</option>
              <option value="15:00">03:00 PM – 04:00 PM</option>
              <option value="16:00">04:00 PM – 05:00 PM</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Cupos / Entradas *
            </label>
            <input
              type="number"
              min={1}
              max={50}
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center font-mono"
            />
          </div>
        </div>

        {/* Método de Pago Presencial */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Método de Pago en Taquilla *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === "cash"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
              }`}
            >
              <span>💵</span>
              <span>Efectivo</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                paymentMethod === "card"
                  ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/10"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
              }`}
            >
              <span>💳</span>
              <span>Tarjeta (Datáfono)</span>
            </button>
          </div>
        </div>

        {/* Total a Cobrar */}
        <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-slate-400 block">Total estimado a cobrar:</span>
            <span className="text-xs text-slate-300">{quantity} cupo(s) × ${unitPrice.toLocaleString("es-CO")} COP</span>
          </div>
          <span className="text-xl font-black text-emerald-400">
            ${calculateTotal().toLocaleString("es-CO")} COP
          </span>
        </div>

        {/* Botón de Previsualización (HU26) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 focus:outline-none transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <span>Calculando y validando previsualización...</span>
          ) : (
            <span>👁️ Previsualizar Ticket Digital (${calculateTotal().toLocaleString("es-CO")})</span>
          )}
        </button>
      </form>

      {/* Modal de Previsualización Oficial (HU26) */}
      {previewData && (
        <PosTicketPreviewModal
          preview={previewData}
          isConfirming={isConfirming}
          onConfirm={handleConfirmSale}
          onCancel={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}
