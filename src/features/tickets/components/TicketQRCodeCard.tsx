"use client";

/**
 * Componente UI: Ticket Digital con Código QR de Acceso (HU24 / RN-019)
 * Vice City - Tailwind v4
 */

import React from "react";

interface TicketQRCodeCardProps {
  ticketCode: string;
  bookingId: string;
  holderName?: string;
  serviceName?: string;
  validFrom?: string;
  validUntil?: string;
  status?: string;
}

export function TicketQRCodeCard({
  ticketCode,
  bookingId,
  holderName = "Titular Vice City",
  serviceName = "Servicio Deportivo",
  validFrom,
  validUntil,
  status = "valid",
}: TicketQRCodeCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full text-white mx-auto relative overflow-hidden">
      {/* Detalle visual de entrada deportiva */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

      {/* Encabezado */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
            Vice City Sports Complex
          </span>
          <h3 className="text-lg font-black text-white mt-0.5">Ticket Digital de Acceso</h3>
        </div>
        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
          {status}
        </span>
      </div>

      {/* Tarjeta de Código QR Simulado */}
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center shadow-inner mb-6 text-slate-900">
        {/* Renderizado de Matriz QR Estilizada */}
        <div className="w-48 h-48 bg-slate-900 rounded-xl p-3 flex flex-col justify-between items-center shadow-md">
          <div className="flex justify-between w-full">
            <div className="w-10 h-10 border-4 border-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded" />
            </div>
            <div className="w-10 h-10 border-4 border-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded" />
            </div>
          </div>

          <div className="text-center font-mono text-[9px] text-emerald-400 font-bold tracking-widest bg-slate-800 px-2 py-1 rounded border border-emerald-500/30">
            {ticketCode.slice(0, 12)}...
          </div>

          <div className="flex justify-between w-full items-end">
            <div className="w-10 h-10 border-4 border-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded" />
            </div>
            <div className="w-8 h-8 bg-emerald-500/20 border-2 border-emerald-400 rounded-lg flex items-center justify-center text-[10px]">
              🎟️
            </div>
          </div>
        </div>

        <span className="text-xs font-mono font-bold tracking-widest mt-3 text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
          CÓDIGO: {ticketCode}
        </span>
      </div>

      {/* Información del Ticket */}
      <div className="space-y-3 text-xs">
        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Titular</span>
          <span className="font-semibold text-slate-200">{holderName}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Servicio</span>
          <span className="font-semibold text-slate-200">{serviceName}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Reserva ID</span>
          <span className="font-mono text-slate-300">{bookingId.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Válido Desde</span>
          <span className="font-medium text-emerald-300">{formatDate(validFrom)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-400">Válido Hasta</span>
          <span className="font-medium text-rose-300">{formatDate(validUntil)}</span>
        </div>
      </div>

      {/* Nota de Acceso */}
      <div className="mt-5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 text-center">
        Presenta este código QR al validador en la entrada del complejo deportivo durante tu franja horaria asignada.
      </div>
    </div>
  );
}
