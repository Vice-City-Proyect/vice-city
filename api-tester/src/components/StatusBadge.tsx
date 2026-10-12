import React from 'react';

interface StatusBadgeProps {
  status?: number;
  statusText?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, statusText }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
        Error de red
      </span>
    );
  }

  let style = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  if (status >= 200 && status < 300) {
    style = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    dotColor = 'bg-emerald-400';
  } else if (status >= 300 && status < 400) {
    style = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    dotColor = 'bg-sky-400';
  } else if (status >= 400 && status < 500) {
    style = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    dotColor = 'bg-amber-400';
  } else if (status >= 500) {
    style = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    dotColor = 'bg-rose-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border font-mono ${style}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      <span>{status}</span>
      {statusText && <span className="font-sans font-normal opacity-90">{statusText}</span>}
    </span>
  );
};

