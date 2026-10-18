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
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 truncate">
            {slot.remainingCapacity} {slot.remainingCapacity === 1 ? "cupo" : "cupos"}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 truncate">
            ⏳ En curso ({slot.remainingCapacity})
          </span>
        );
      case "FULL":
        return (
          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
            Agotado
          </span>
        );
      case "PAST":
        return (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
            Finalizada
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
            Mantenimiento
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col lg:items-start xl:flex-row xl:items-center">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 break-words">
              Disponibilidad: {service.name}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Fecha: <span className="font-medium text-zinc-700">{availability.date}</span> • Horario: 8:00 AM — 5:00 PM
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-zinc-50 p-2 sm:p-2.5 sm:text-right border border-zinc-100 lg:w-full xl:w-auto">
            <span className="block text-[11px] text-zinc-500">Aforo total del servicio</span>
            <p className="text-base sm:text-lg font-bold text-zinc-800">{service.capacity} personas</p>
          </div>
        </div>

        {/* Alerta de mantenimiento semanal (RN-001 y RN-003) */}
        {isMaintenanceDay && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-center gap-2">
              <span className="text-lg shrink-0" aria-hidden="true">🛠️</span>
              <p className="font-semibold text-sm">Cerrado por Mantenimiento Semanal</p>
            </div>
            <p className="mt-1 text-xs text-amber-800 break-words">
              {maintenanceReason ||
                "El complejo deportivo realiza mantenimiento general los lunes (o martes posterior a festivo). No hay servicio disponible en esta fecha."}
            </p>
          </div>
        )}

        {/* Grilla de Franjas Horarias */}
        {!isMaintenanceDay && (
          <div className="mt-5 sm:mt-6 grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
                  className={`group flex flex-col justify-between rounded-lg border p-3 sm:p-3.5 text-left transition-all min-w-0 ${
                    isSelected
                      ? "border-sky-600 bg-sky-50/60 ring-2 ring-sky-500 shadow-sm"
                      : slot.canBePurchased
                      ? "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm cursor-pointer"
                      : "cursor-not-allowed border-zinc-100 bg-zinc-50/70 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-semibold text-xs sm:text-sm text-zinc-900 whitespace-nowrap">
                      {slot.startTime} — {slot.endTime}
                    </span>
                    {slot.isCurrentSlot && (
                      <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        AHORA
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 shrink">
                      {getStatusBadge(slot)}
                    </div>
                    <span className="text-xs font-bold text-zinc-800 whitespace-nowrap shrink-0">
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

