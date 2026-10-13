"use client";

import React, { useState, useEffect } from "react";

interface HoldTimerProps {
  initialSeconds: number;
  onExpire?: () => void;
}

export function HoldTimer({ initialSeconds, onExpire }: HoldTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
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
  }, [secondsLeft, onExpire]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isExpired ? "⚠️" : "⏱️"}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">
              {isExpired ? "Tiempo Expirado" : "Tiempo Restante para Pagar (HOLD)"}
            </p>
            <p className="text-xs opacity-80">
              {isExpired
                ? "El cupo ha sido liberado automáticamente para otros clientes."
                : "Tu cupo está retenido de forma exclusiva mientras completas el pago."}
            </p>
          </div>
        </div>

        <div className="text-right">
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

