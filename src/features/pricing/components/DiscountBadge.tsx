"use client";

import React from "react";
import type { DiscountType } from "../types/discount.types";

interface DiscountBadgeProps {
  discountType: DiscountType;
  discountPercent?: number;
}

export function DiscountBadge({ discountType, discountPercent = 20 }: DiscountBadgeProps) {
  if (discountType === "NONE" || discountPercent === 0) {
    return null;
  }

  const getLabel = () => {
    switch (discountType) {
      case "WEDNESDAY_DISCOUNT":
        return `🎉 ${discountPercent}% OFF Miércoles`;
      case "FULL_POOL_DISCOUNT":
        return `🏊 ${discountPercent}% OFF Piscina Completa`;
      default:
        return `${discountPercent}% OFF`;
    }
  };

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      {getLabel()}
    </span>
  );
}

