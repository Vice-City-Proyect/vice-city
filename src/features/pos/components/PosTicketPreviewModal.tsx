"use client";

/**
 * Componente UI: Modal de Previsualización del Ticket Digital antes de Confirmar (HU26)
 * Vice City - Tailwind v4
 */

import React from "react";
import type { PosPreviewResult } from "../types/pos.types";

interface PosTicketPreviewModalProps {
  preview: PosPreviewResult;
  isConfirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PosTicketPreviewModal({
  preview,
  isConfirming,
  onConfirm,
  onCancel,
}: PosTicketPreviewModalProps) {
  const formattedTotal = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: preview.currency || "COP",
    maximumFractionDigits: 0,
  }).format(preview.totalAmount);

  const formattedUnitPrice = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: preview.currency || "COP",
    maximumFractionDigits: 0,
  }).format(preview.unitPrice);

  const formatDateTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl max-w-md w-full text-white space-y-5 animate-in fade-in zoom-in duration-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block">
              Previsualización Oficial (HU26)
            </span>
            <h3 className="text-lg font-black text-white mt-0.5">Ticket Digital a Emitir</h3>
          </div>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-semibold">
            Borrador POS
          </span>
        </div>

        {/* Simulador de Ticket Preview */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-700">
            <span className="text-slate-400">Titular</span>
            <span className="font-bold text-white text-sm">{preview.clientName}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-700">
            <span className="text-slate-400">Documento (Cédula)</span>
            <span className="font-mono text-slate-200 font-semibold">{preview.clientId}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-700">
            <span className="text-slate-400">Servicio</span>
            <span className="font-semibold text-emerald-400">{preview.serviceName}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-700">
            <span className="text-slate-400">Cantidad de Cupos</span>
            <span className="font-bold text-white font-mono">{preview.quantity} entrada(s)</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-700">
            <span className="text-slate-400">Tarifa Unitaria</span>
            <span className="text-slate-300">{formattedUnitPrice} /hora</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-700">
            <span className="text-slate-400">Franja de Acceso</span>
            <div className="text-right">
              <span className="block text-slate-200 font-medium">{formatDateTime(preview.startAt)}</span>
              <span className="block text-slate-400 text-[10px]">hasta {formatDateTime(preview.endAt)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 text-sm">
            <span className="text-slate-300 font-medium">Total a Cobrar</span>
            <span className="text-lg font-black text-emerald-400">{formattedTotal}</span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-700 text-[11px]">
            <span className="text-slate-400">Método Presencial</span>
            <span className="text-slate-200 font-semibold uppercase">
              {preview.paymentMethod === "cash" ? "💵 Efectivo" : "💳 Tarjeta (Datáfono)"}
            </span>
          </div>
        </div>

        {/* Advertencia si la franja ya inició (RN-010) */}
        {preview.isStartedSlotPurchased && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            ⚠️ <strong>Franja en curso:</strong> Se cobra la hora completa y el QR vencerá al finalizar la franja horaria.
          </div>
        )}

        {/* Nota del QR al Portador (RN-020) */}
        <p className="text-[11px] text-slate-400 text-center">
          🔒 El código QR generado será al portador y se validará directamente contra la base de datos (RN-020).
        </p>

        {/* Botones de Acción */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-700 transition-all text-xs disabled:opacity-50"
          >
            ← Modificar
          </button>

          <button
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className="flex-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Emitiendo Ticket...</span>
              </>
            ) : (
              <span>Confirmar y Emitir Ticket</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

