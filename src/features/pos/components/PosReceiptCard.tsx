"use client";

/**
 * Componente UI: Comprobante y Ticket Emitido en Taquilla POS (HU25)
 * Vice City - Tailwind v4
 */

import React from "react";
import type { PosSaleResult } from "../types/pos.types";
import { TicketQRCodeCard } from "@/features/tickets/components/TicketQRCodeCard";

interface PosReceiptCardProps {
  sale: PosSaleResult;
  onNewSale: () => void;
}

export function PosReceiptCard({ sale, onNewSale }: PosReceiptCardProps) {
  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: sale.currency || "COP",
    maximumFractionDigits: 0,
  }).format(sale.amount);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Banner de Éxito en POS */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center text-white">
        <span className="text-3xl block mb-2">🎉</span>
        <h3 className="text-xl font-black text-emerald-400">¡Venta Registrada Exitosamente!</h3>
        <p className="text-xs text-emerald-200/80 mt-1">
          La reserva ha sido pagada en taquilla y el ticket QR ha sido emitido al cliente.
        </p>
      </div>

      {/* Resumen de Venta Presencial */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-xs text-white space-y-3">
        <div className="flex justify-between pb-2 border-b border-slate-800">
          <span className="text-slate-400">Cliente</span>
          <span className="font-semibold text-slate-200">{sale.clientName} (CC: {sale.clientId})</span>
        </div>
        <div className="flex justify-between pb-2 border-b border-slate-800">
          <span className="text-slate-400">Servicio</span>
          <span className="font-semibold text-slate-200">{sale.serviceName} ({sale.quantity} cupo{sale.quantity > 1 ? "s" : ""})</span>
        </div>
        <div className="flex justify-between pb-2 border-b border-slate-800">
          <span className="text-slate-400">Método de Pago</span>
          <span className="font-semibold text-emerald-400 uppercase tracking-wider">
            {sale.paymentMethod === "cash" ? "💵 Efectivo" : "💳 Tarjeta (Datáfono)"}
          </span>
        </div>
        <div className="flex justify-between pb-2 border-b border-slate-800">
          <span className="text-slate-400">Total Pagado</span>
          <span className="text-sm font-black text-emerald-400">{formattedAmount}</span>
        </div>
        {sale.isStartedSlotPurchased && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
            ⚠️ <strong>Franja en curso (RN-010):</strong> Se cobró la hora completa. El ticket vence al finalizar la franja.
          </div>
        )}
      </div>

      {/* Tarjeta Visual de Ticket y Código QR */}
      <TicketQRCodeCard
        ticketCode={sale.ticketCode}
        bookingId={sale.bookingId}
        holderName={sale.clientName}
        serviceName={sale.serviceName}
        validFrom={sale.startAt}
        validUntil={sale.endAt}
        status="valid"
      />

      {/* Botón de Nueva Venta */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onNewSale}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-xs"
        >
          ➕ Realizar Otra Venta en POS
        </button>
      </div>
    </div>
  );
}

