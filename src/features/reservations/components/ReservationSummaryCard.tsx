"use client";

import React from "react";
import type { BookingDetails } from "../types/reservation.types";

interface ReservationSummaryCardProps {
  booking: BookingDetails;
}

export function ReservationSummaryCard({ booking }: ReservationSummaryCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Bogota",
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Bogota",
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="border-b border-zinc-100 pb-4">
        <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
          Reserva #{booking.id.slice(0, 8)}
        </span>
        <h2 className="mt-2 text-xl font-bold text-zinc-900">{booking.serviceName}</h2>
        <p className="text-xs text-zinc-500 capitalize">{formatDate(booking.startAt)}</p>
      </div>

      <div className="mt-4 space-y-3 text-sm text-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Horario de uso:</span>
          <span className="font-semibold text-zinc-900">
            {formatTime(booking.startAt)} — {formatTime(booking.endAt)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Cupos reservados:</span>
          <span className="font-semibold text-zinc-900">{booking.quantity} persona(s)</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Estado de reserva:</span>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
              booking.isHoldExpired
                ? "bg-rose-100 text-rose-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {booking.isHoldExpired ? "EXPIRADA (Cupo Liberado)" : "PENDIENTE DE PAGO (HOLD)"}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
        <div>
          <p className="text-xs text-zinc-500">Total a pagar (Precio Histórico Congelado)</p>
          <p className="text-2xl font-extrabold text-zinc-900">
            {formatCurrency(booking.totalAmount, booking.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

