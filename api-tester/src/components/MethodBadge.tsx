import React from 'react';
import { HttpMethod } from '../types/openapi';

interface MethodBadgeProps {
  method: HttpMethod | string;
  size?: 'sm' | 'md' | 'lg';
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({ method, size = 'sm' }) => {
  const upper = method.toUpperCase();

  const colorMap: Record<string, string> = {
    GET: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    POST: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PATCH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    OPTIONS: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    HEAD: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'text-xs px-2 py-0.5 font-bold tracking-wider',
    md: 'text-sm px-2.5 py-1 font-bold',
    lg: 'text-base px-3.5 py-1.5 font-extrabold',
  };

  const style = colorMap[upper] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-mono uppercase ${style} ${sizeClasses[size]}`}
    >
      {upper}
    </span>
  );
};

