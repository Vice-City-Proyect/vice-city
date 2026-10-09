"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { HoldTimer } from "@/features/reservations/components/HoldTimer";
import { ReservationSummaryCard } from "@/features/reservations/components/ReservationSummaryCard";
import type { BookingDetails } from "@/features/reservations/types/reservation.types";

export default function CheckoutHoldPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    async function loadBooking() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reservations/${bookingId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setBooking(json.data);
        } else {
          setError(json.message || "No se pudo cargar la información de la reserva.");
        }
      } catch (err: any) {
        console.error("Error al cargar la reserva:", err);
        setError("Error de conexión al consultar la reserva.");
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  const handleExpire = () => {
    if (booking) {
      setBooking({
        ...booking,
        isHoldExpired: true,
        remainingSeconds: 0,
        status: "expired",
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 text-center sm:text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
            Vice City Sports Complex
          </span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900">
            Proceso de Pago y Retención (HOLD)
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Tienes exactamente 10 minutos para concretar tu pago antes de que el cupo sea liberado (RN-011).
          </p>
        </header>

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500 shadow-sm">
            Cargando detalles de tu reserva...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            {error}
          </div>
        ) : booking ? (
          <div className="space-y-6">
            {/* Temporizador de HOLD (10 Minutos) */}
            <HoldTimer
              initialSeconds={booking.remainingSeconds}
              onExpire={handleExpire}
            />

            {/* Tarjeta de Resumen con Tarifa Congelada */}
            <ReservationSummaryCard booking={booking} />

            {/* Acciones */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push("/catalog")}
                className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Volver al Catálogo
              </button>

              <button
                type="button"
                disabled={booking.isHoldExpired}
                className={`rounded-lg px-6 py-2.5 text-xs font-bold text-white transition-all ${
                  booking.isHoldExpired
                    ? "cursor-not-allowed bg-zinc-400"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow"
                }`}
              >
                {booking.isHoldExpired ? "Cupo Expirado" : "Proceder al Pago"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

