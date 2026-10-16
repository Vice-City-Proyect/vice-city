"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface HoldTimerProps {
  initialSeconds: number;
  onExpire?: () => void;
  redirectTo?: string;
}

export function HoldTimer({ initialSeconds, onExpire, redirectTo }: HoldTimerProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [previousInitialSeconds, setPreviousInitialSeconds] =
    useState<number>(initialSeconds);

  if (initialSeconds !== previousInitialSeconds) {
    setPreviousInitialSeconds(initialSeconds);
    setSecondsLeft(initialSeconds);
  }

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
      if (redirectTo) {
        router.push(redirectTo);
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire, redirectTo, router]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isLowTime = secondsLeft < 120 && secondsLeft > 0;
  const isExpired = secondsLeft <= 0;

  // Porcentaje del tiempo restante respecto a 10 minutos (600s)
  const percentage = Math.max(0, Math.min(100, (secondsLeft / 600) * 100));

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-all ${
        isExpired
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : isLowTime
          ? "border-amber-300 bg-amber-50 text-amber-900 animate-pulse"
          : "border-sky-200 bg-sky-50 text-sky-900"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2">
          <span className="text-xl shrink-0">{isExpired ? "⚠️" : "⏱️"}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">
              {isExpired ? "Tiempo Expirado" : "Tiempo Restante para Pagar (HOLD)"}
            </p>
            <p className="text-xs opacity-80">
              {isExpired
                ? "Tu reserva venció. El cupo ha sido liberado automáticamente para otros clientes."
                : "Tu cupo está retenido de forma exclusiva mientras completas el pago."}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span
            className={`font-mono text-2xl font-extrabold ${
              isExpired
                ? "text-rose-600"
                : isLowTime
                ? "text-amber-600"
                : "text-sky-700"
            }`}
          >
            {formattedTime}
          </span>
        </div>
      </div>

      {!isExpired && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className={`h-full transition-all duration-1000 ${
              isLowTime ? "bg-amber-500" : "bg-sky-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
