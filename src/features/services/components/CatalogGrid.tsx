"use client";

import React from "react";
import type { CategoryWithServices, ServiceItem } from "../types/catalog.types";

interface CatalogGridProps {
  categories: CategoryWithServices[];
  onSelectService?: (service: ServiceItem) => void;
  selectedServiceId?: string;
}

export function CatalogGrid({
  categories,
  onSelectService,
  selectedServiceId,
}: CatalogGridProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category.id} className="space-y-4">
          <div className="border-b border-zinc-200 pb-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-sm text-zinc-600">{category.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {category.services.map((service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <div
                  key={service.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                    isSelected
                      ? "border-sky-600 ring-2 ring-sky-500/20"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-zinc-900 group-hover:text-sky-600">
                        {service.name}
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                        Aforo: {service.capacity}
                      </span>
                    </div>

                    {service.description && (
                      <p className="line-clamp-2 text-xs text-zinc-500">
                        {service.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      <span>⏱️ {service.duration_minutes} min / franja</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                    <div>
                      <p className="text-xs text-zinc-500">Precio por hora</p>
                      <p className="text-lg font-bold text-zinc-900">
                        {formatCurrency(service.price, service.currency)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectService?.(service)}
                      className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-sky-600 text-white hover:bg-sky-700"
                          : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                      }`}
                    >
                      {isSelected ? "Seleccionado" : "Ver Franjas"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

