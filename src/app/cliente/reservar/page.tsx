"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CatalogGrid } from "@/features/services/components/CatalogGrid";
import { AvailabilitySlots } from "@/features/services/components/AvailabilitySlots";
import type { CategoryWithServices, ServiceItem } from "@/features/services/types/catalog.types";
import type { ServiceAvailabilityResult, TimeSlot } from "@/features/services/types/availability.types";

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

      // El usuario lo define la sesión del servidor: no se envía ningún userId desde el navegador.
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          startAt: startDateTime,
          endAt: endDateTime,
          quantity: 1,
        }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success && json.data?.id) {
        setReserved(true);
        // La reserva queda retenida 10 minutos: se lleva al cliente al pago.
        router.push(`/checkout/${json.data.id}`);
      } else if (res.status === 401) {
        setError("Inicia sesión para reservar.");
      } else {
        setError(json?.message || "Error al crear la reserva.");
      }
    } catch (err: unknown) {
      console.error("Error al reservar:", err);
      setError("Error al conectar con el servidor.");
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8">
      <header className="text-left">
        <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
          Vice City Sports Complex
        </span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          Catálogo y Reserva
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-600">
          Selecciona un servicio, elige una franja horaria y confirma tu reserva.
        </p>
      </header>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm font-medium text-zinc-500">Cargando catálogo...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-8">
          {/* Selector de fecha sticky para móviles/tablets (permanece visible mientras se desplaza el catálogo) */}
          <div className="block lg:hidden sticky top-16 sm:top-20 z-10">
            <div className="rounded-xl border border-zinc-200 bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900">Seleccionar Fecha</h2>
                <p className="text-[11px] sm:text-xs text-zinc-500">
                  Anticipación: hasta 15 días (o 20 días en piscina).
                </p>
              </div>
              <div className="mt-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Columna Izquierda: Catálogo de Servicios */}
          <div className="lg:col-span-7 min-w-0">
            <CatalogGrid
              categories={categories}
              selectedServiceId={selectedService?.id}
              onSelectService={(service) => {
                setSelectedService(service);
                if (typeof window !== "undefined" && window.innerWidth < 1024) {
                  const el = document.getElementById("disponibilidad-section");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }
              }}
            />
          </div>

          {/* Columna Derecha: Selector de fecha (escritorio), disponibilidad y confirmación fijos durante el scroll */}
          <div id="disponibilidad-section" className="lg:col-span-5 min-w-0 scroll-mt-24 self-stretch">
            <div className="lg:sticky lg:top-24 space-y-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 z-10">
              {/* Selector de fecha para pantallas de escritorio (>= lg) */}
              <div className="hidden lg:block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
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
                <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
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
                <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between text-xs text-zinc-600">
                    <span>Franja seleccionada:</span>
                    <span className="font-bold text-zinc-900">{selectedSlot.startTime} — {selectedSlot.endTime}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReserve}
                    disabled={reserving}
                    className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {reserving ? "Creando reserva..." : `Reservar por $${selectedSlot.price.toLocaleString("es-CO")}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
