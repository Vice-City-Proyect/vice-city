"use client";

import React from "react";
import type {
  ServiceAvailabilityResult,
  TimeSlot,
} from "../types/availability.types";

interface AvailabilitySlotsProps {
  availability: ServiceAvailabilityResult;
  selectedSlot?: TimeSlot | null;
  onSelectSlot?: (slot: TimeSlot) => void;
}

export function AvailabilitySlots({
  availability,
  selectedSlot,
  onSelectSlot,
}: AvailabilitySlotsProps) {
  const { service, isMaintenanceDay, maintenanceReason, slots } = availability;

  const getStatusBadge = (slot: TimeSlot) => {
    switch (slot.status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            {slot.remainingCapacity} cupos disponibles
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
            ⏳ En curso ({slot.remainingCapacity} cupos)
          </span>
        );
      case "FULL":
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
            Agotado
          </span>
        );
      case "PAST":
        return (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
            Finalizada
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
            Mantenimiento
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Disponibilidad: {service.name}
            </h3>
            <p className="text-xs text-zinc-500">
              Fecha: {availability.date} • Horario de atención: 8:00 AM — 5:00 PM (America/Bogota)
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-500">Aforo total del servicio</span>
            <p className="text-lg font-bold text-zinc-800">{service.capacity} personas</p>
          </div>
        </div>

        {/* Alerta de mantenimiento semanal (RN-001 y RN-003) */}
        {isMaintenanceDay && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛠️</span>
              <p className="font-semibold text-sm">Cerrado por Mantenimiento Semanal</p>
            </div>
            <p className="mt-1 text-xs text-amber-800">
              {maintenanceReason ||
                "El complejo deportivo realiza mantenimiento general los lunes (o martes posterior a festivo). No hay servicio disponible en esta fecha."}
            </p>
          </div>
        )}

        {/* Grilla de Franjas Horarias */}
        {!isMaintenanceDay && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {slots.map((slot) => {
              const isSelected =
                selectedSlot?.startTime === slot.startTime &&
                selectedSlot?.endTime === slot.endTime;

              return (
                <button
                  key={`${slot.startTime}-${slot.endTime}`}
                  type="button"
                  disabled={!slot.canBePurchased}
                  onClick={() => onSelectSlot?.(slot)}
                  className={`flex flex-col justify-between rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? "border-sky-600 bg-sky-50/50 ring-2 ring-sky-500"
                      : slot.canBePurchased
                      ? "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                      : "cursor-not-allowed border-zinc-100 bg-zinc-50/70 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-zinc-900">
                      {slot.startTime} — {slot.endTime}
                    </span>
                    {slot.isCurrentSlot && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                        AHORA
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {getStatusBadge(slot)}
                    <span className="text-xs font-semibold text-zinc-700">
                      ${slot.price.toLocaleString("es-CO")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

