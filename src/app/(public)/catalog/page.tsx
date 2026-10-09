"use client";

import React, { useState, useEffect } from "react";
import { CatalogGrid } from "@/features/services/components/CatalogGrid";
import { AvailabilitySlots } from "@/features/services/components/AvailabilitySlots";
import type { CategoryWithServices, ServiceItem } from "@/features/services/types/catalog.types";
import type { ServiceAvailabilityResult, TimeSlot } from "@/features/services/types/availability.types";

export default function CatalogPage() {
  const [categories, setCategories] = useState<CategoryWithServices[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availability, setAvailability] = useState<ServiceAvailabilityResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar fecha por defecto (hoy en formato YYYY-MM-DD)
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  // Cargar catálogo de servicios desde la API
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch("/api/catalog");
        const json = await res.json();
        if (json.success && json.data) {
          setCategories(json.data.categories);
          // Preseleccionar el primer servicio si existe
          if (json.data.categories.length > 0 && json.data.categories[0].services.length > 0) {
            setSelectedService(json.data.categories[0].services[0]);
          }
        }
      } catch (err: any) {
        console.error("Error cargando catálogo:", err);
        setError("No se pudo cargar el catálogo de servicios.");
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Consultar disponibilidad cuando cambia el servicio o la fecha
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
      } catch (err: any) {
        console.error("Error consultando disponibilidad:", err);
        setError("Error al conectar con el motor de disponibilidad.");
        setAvailability(null);
      } finally {
        setAvailabilityLoading(false);
      }
    }

    fetchAvailability();
  }, [selectedService, selectedDate]);

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <header className="mb-10 text-center sm:text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
            Vice City Sports Complex
          </span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Catálogo y Disponibilidad de Servicios
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Consulta en tiempo real el aforo, tarifas y franjas horarias operativas (8:00 AM — 5:00 PM).
          </p>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm font-medium text-zinc-500">Cargando catálogo...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Columna Izquierda: Catálogo de Servicios */}
            <div className="lg:col-span-7">
              <CatalogGrid
                categories={categories}
                selectedServiceId={selectedService?.id}
                onSelectService={(service) => setSelectedService(service)}
              />
            </div>

            {/* Columna Derecha: Selector de Fecha y Disponibilidad en Tiempo Real */}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

