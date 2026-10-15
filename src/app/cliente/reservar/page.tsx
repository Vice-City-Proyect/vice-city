"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CatalogGrid } from "@/features/services/components/CatalogGrid";
import { AvailabilitySlots } from "@/features/services/components/AvailabilitySlots";
import { HoldTimer } from "@/features/reservations/components/HoldTimer";
import { ReservationSummaryCard } from "@/features/reservations/components/ReservationSummaryCard";
import type { CategoryWithServices, ServiceItem } from "@/features/services/types/catalog.types";
import type { ServiceAvailabilityResult, TimeSlot } from "@/features/services/types/availability.types";
import type { BookingDetails, HoldReservationResult } from "@/features/reservations/types/reservation.types";

const MOCK_CLIENT_USER_ID = "00000000-0000-0000-0000-000000000001";

function ClientReservarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<CategoryWithServices[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const todayInit = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayInit);
  const [availability, setAvailability] = useState<ServiceAvailabilityResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [reserving, setReserving] = useState<boolean>(false);
  const [, setHoldResult] = useState<HoldReservationResult | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [showTimer, setShowTimer] = useState<boolean>(false);
  const [reserved, setReserved] = useState<boolean>(false);


  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch("/api/catalog");
        const json = await res.json();
        if (json.success && json.data) {
          setCategories(json.data.categories);
          const preselected = searchParams.get("serviceId");
          if (preselected) {
            const found = json.data.categories
              .flatMap((c: CategoryWithServices) => c.services)
              .find((srv: ServiceItem) => srv.id === preselected);
            if (found) {
              setSelectedService(found);
              return;
            }
          }
          if (json.data.categories.length > 0 && json.data.categories[0].services.length > 0) {
            setSelectedService(json.data.categories[0].services[0]);
          }
        }
      } catch (err: unknown) {
        console.error("Error cargando catálogo:", err);
        setError("No se pudo cargar el catálogo de servicios.");
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    async function fetchAvailability() {
      try {
        setAvailabilityLoading(true);
        setError(null);
        setSelectedSlot(null);
        const res = await fetch(
          `/api/availability?serviceId=${selectedService!.id}&date=${selectedDate}`
        );
        const json = await res.json();
        if (json.success) {
          setAvailability(json.data);
        } else {
          setError(json.message || "Error al consultar disponibilidad.");
          setAvailability(null);
        }
      } catch (err: unknown) {
        console.error("Error consultando disponibilidad:", err);
        setError("Error al conectar con el motor de disponibilidad.");
        setAvailability(null);
      } finally {
        setAvailabilityLoading(false);
      }
    }

    fetchAvailability();
  }, [selectedService, selectedDate]);

  const handleReserve = async () => {
    if (!selectedService || !selectedSlot || !selectedDate) {
      setError("Debe seleccionar un servicio y una franja horaria.");
      return;
    }

    try {
      setReserving(true);
      setError(null);

      const startDateTime = new Date(`${selectedDate}T${selectedSlot.startTime}:00.000-05:00`).toISOString();
      const endDateTime = new Date(`${selectedDate}T${selectedSlot.endTime}:00.000-05:00`).toISOString();

      const res = await fetch("/api/reservations/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: MOCK_CLIENT_USER_ID,
          serviceId: selectedService.id,
          startAt: startDateTime,
          endAt: endDateTime,
          quantity: 1,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setHoldResult(json.data);
        setReserved(true);
        setShowTimer(true);
        const bookingDetails: BookingDetails = {
          id: json.data.bookingId,
          userId: json.data.userId,
          serviceId: json.data.serviceId,
          serviceName: json.data.serviceName,
          startAt: json.data.startAt,
          endAt: json.data.endAt,
          quantity: json.data.quantity,
          totalAmount: json.data.totalAmount,
          currency: json.data.currency,
          status: json.data.status,
          expiresAt: json.data.expiresAt,
          isHoldExpired: false,
          remainingSeconds: json.data.remainingSeconds,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setBooking(bookingDetails);
      } else {
        setError(json.message || "Error al crear la reserva.");
      }
    } catch (err: unknown) {
      console.error("Error al reservar:", err);
      setError("Error al conectar con el servidor.");
    } finally {
      setReserving(false);
    }
  };

  const handleExpire = () => {
    setShowTimer(false);
    setReserved(false);
    setSelectedSlot(null);
    setHoldResult(null);
    setBooking(null);
    setError("Tu reserva venció");
    router.push("/cliente/reservar");
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-10 text-center sm:text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
            Vice City Sports Complex
          </span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Catálogo y Reserva
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Selecciona un servicio, elige una franja horaria y confirma tu reserva.
          </p>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm font-medium text-zinc-500">Cargando catálogo...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <CatalogGrid
                categories={categories}
                selectedServiceId={selectedService?.id}
                onSelectService={(service) => setSelectedService(service)}
              />
            </div>

            <div className="lg:col-span-5">
              <div className="sticky top-6 space-y-6">
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-zinc-900">Seleccionar Fecha</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Anticipación: hasta 15 días (o 20 días en piscina completa).
                  </p>
                  <div className="mt-4">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
                    {error}
                  </div>
                )}

                {availabilityLoading ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
                    Calculando aforo por franja...
                  </div>
                ) : availability ? (
                  <AvailabilitySlots
                    availability={availability}
                    selectedSlot={selectedSlot}
                    onSelectSlot={(slot) => setSelectedSlot(slot)}
                  />
                ) : null}

                {selectedSlot && availability && !reserved && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <button
                      type="button"
                      onClick={handleReserve}
                      disabled={reserving}
                      className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      {reserving ? "Creando reserva..." : "Reservar"}
                    </button>
                  </div>
                )}

                {showTimer && booking && (
                  <HoldTimer initialSeconds={booking.remainingSeconds} onExpire={handleExpire} />
                )}

                {booking && (
                  <ReservationSummaryCard booking={booking} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientReservarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-sm font-medium text-zinc-500">Cargando reserva...</div>
        </div>
      }
    >
      <ClientReservarPageContent />
    </Suspense>
  );
}
