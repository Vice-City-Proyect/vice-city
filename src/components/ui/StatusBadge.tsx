import type { ReactNode } from 'react';

const TONES = {
  pending: 'bg-brand-yellow/25 text-text-main',
  success: 'bg-club-primary/35 text-btn-text',
  danger: 'bg-red-500/15 text-red-600',
  info: 'bg-brand-blue/15 text-brand-blue',
  neutral: 'bg-club-bg text-text-muted',
  dark: 'bg-club-accent text-white',
} as const;

export type BadgeTone = keyof typeof TONES;

const STATUS_STYLES: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pendiente', tone: 'pending' },
  CONFIRMED: { label: 'Confirmada', tone: 'success' },
  IN_PROGRESS: { label: 'En curso', tone: 'info' },
  FINISHED: { label: 'Finalizada', tone: 'neutral' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },

  PAYMENT_PENDING: { label: 'Pago pendiente', tone: 'pending' },
  PAYMENT_CONFIRMED: { label: 'Pago confirmado', tone: 'success' },

  HOLD_ACTIVE: { label: 'En espera de pago', tone: 'pending' },
  HOLD_EXPIRED: { label: 'Expirada por HOLD', tone: 'danger' },

  NORMAL: { label: 'Reserva normal', tone: 'neutral' },
  FULL_POOL: { label: 'Piscina completa', tone: 'info' },

  VALID: { label: 'QR válido', tone: 'success' },
  USED: { label: 'QR usado', tone: 'neutral' },
  EXPIRED: { label: 'QR expirado', tone: 'danger' },
  OUTSIDE_TIME: { label: 'Fuera de horario', tone: 'pending' },
  NOT_FOUND: { label: 'No encontrada', tone: 'danger' },

  ACCESS_NOT_ENTERED: { label: 'Sin ingreso', tone: 'neutral' },
  ACCESS_INSIDE: { label: 'Dentro del complejo', tone: 'success' },
  ACCESS_EXITED: { label: 'Retirado', tone: 'info' },

  ACTIVE: { label: 'Activo', tone: 'success' },
  INACTIVE: { label: 'Inactivo', tone: 'neutral' },

  WEB: { label: 'Reserva web', tone: 'neutral' },
  POS: { label: 'Venta en sitio', tone: 'info' },
};

export type StatusKey = keyof typeof STATUS_STYLES;

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? { label: status, tone: 'neutral' as BadgeTone };

  return (
    <Badge tone={style.tone} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {style.label}
    </Badge>
  );
}

export function paymentKey(payment: 'PENDING' | 'CONFIRMED'): StatusKey {
  return payment === 'PENDING' ? 'PAYMENT_PENDING' : 'PAYMENT_CONFIRMED';
}

export function accessKey(access: 'NOT_ENTERED' | 'INSIDE' | 'EXITED'): StatusKey {
  if (access === 'INSIDE') return 'ACCESS_INSIDE';
  if (access === 'EXITED') return 'ACCESS_EXITED';
  return 'ACCESS_NOT_ENTERED';
}

export function holdKey(hold: 'NONE' | 'ACTIVE' | 'EXPIRED'): StatusKey | null {
  if (hold === 'ACTIVE') return 'HOLD_ACTIVE';
  if (hold === 'EXPIRED') return 'HOLD_EXPIRED';
  return null;
}
