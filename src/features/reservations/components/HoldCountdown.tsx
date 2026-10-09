'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface HoldCountdownProps {
  expiresAt: string;
}

function remaining(expiresAt: string): number {
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

export function HoldCountdown({ expiresAt }: HoldCountdownProps) {
  const [milliseconds, setMilliseconds] = useState(() => remaining(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => setMilliseconds(remaining(expiresAt)), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-yellow/50 bg-brand-yellow/15 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/30 text-text-main">
        <Timer className="h-4 w-4" />
      </span>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          La capacidad se libera en
        </span>
        <span className="font-mono text-lg font-black text-text-main">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
