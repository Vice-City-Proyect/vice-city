"use client";

import React from "react";
import type { PricingCalculationResult } from "../types/discount.types";
import { DiscountBadge } from "./DiscountBadge";

interface PricingBreakdownProps {
  calculation: PricingCalculationResult;
}

export function PricingBreakdown({ calculation }: PricingBreakdownProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasDiscount = calculation.discountPercent > 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h3 className="text-sm font-bold text-zinc-900">Desglose de Tarifa</h3>
        {hasDiscount && (
          <DiscountBadge
            discountType={calculation.appliedDiscount}
            discountPercent={calculation.discountPercent}
          />
        )}
      </div>

      <div className="mt-3 space-y-2 text-xs text-zinc-600">
        <div className="flex items-center justify-between">
          <span>Precio base ({calculation.durationHours}h):</span>
          <span className="font-medium text-zinc-900">
            {formatCurrency(calculation.originalAmount, calculation.currency)}
          </span>
        </div>

        {hasDiscount && (
          <div className="flex items-center justify-between text-emerald-600 font-semibold">
            <span>Descuento aplicado ({calculation.discountPercent}%):</span>
            <span>
              -{formatCurrency(calculation.discountAmount, calculation.currency)}
            </span>
          </div>
        )}

        {calculation.discountDescription && (
          <p className="pt-1 text-[11px] italic text-zinc-500">
            {calculation.discountDescription}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="text-xs font-bold text-zinc-800">Total a Pagar:</span>
        <span className="text-lg font-extrabold text-zinc-900">
          {formatCurrency(calculation.finalAmount, calculation.currency)}
        </span>
      </div>
    </div>
  );
}

