const COP_FORMAT = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

export function formatCOP(value: number): string {
  return COP_FORMAT.format(value).replace(/\u00a0/g, ' ');
}

export function formatCOPShort(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return `$${value}`;
}

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(`${iso}T12:00:00-05:00`));
}

export function formatLongDate(iso: string): string {
  return LONG_DATE_FORMAT.format(new Date(`${iso}T12:00:00-05:00`));
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
