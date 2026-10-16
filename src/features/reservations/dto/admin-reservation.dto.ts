import type {
  AccessStatus,
  DiscountType,
  HoldState,
  PaymentStatus,
  QrStatus,
  Reservation,
  ReservationStatus,
  ReservationType,
  WristbandColor,
} from "@/types/reservation";
import type { ServiceCategory } from "@/types/service";

export function resolveReservationCategory(service: any): ServiceCategory {
  if (!service) return "SOCCER_MICRO";
  if (service.category && typeof service.category === "string") {
    const cat = service.category.toUpperCase();
    if (["POOL", "SOCCER_LARGE", "SOCCER_MICRO", "MULTI_COURT", "GYM", "WET_AREA"].includes(cat)) {
      return cat as ServiceCategory;
    }
  }
  const slug = service.categories?.slug?.toLowerCase() || service.slug?.toLowerCase() || "";
  if (slug === "piscinas" || slug.includes("pool") || slug.includes("piscina")) return "POOL";
  if (slug === "gimnasio" || slug.includes("gym")) return "GYM";
  if (slug === "zona-humeda" || slug.includes("sauna") || slug.includes("humed")) return "WET_AREA";
  if (slug === "canchas" || slug.includes("cancha") || slug.includes("futbol") || slug.includes("fútbol")) {
    const text = `${service.slug ?? ""} ${service.name ?? ""}`.toLowerCase();
    if (text.includes("micro")) return "SOCCER_MICRO";
    if (text.includes("grande") || text.includes("11")) return "SOCCER_LARGE";
    if (text.includes("multi") || text.includes("poli")) return "MULTI_COURT";
    return "SOCCER_MICRO";
  }
  return "SOCCER_MICRO";
}

const WRISTBANDS_BY_CATEGORY: Record<ServiceCategory, WristbandColor> = {
  POOL: "BLUE",
  WET_AREA: "PURPLE",
  GYM: "RED",
  SOCCER_LARGE: "GREEN",
  SOCCER_MICRO: "GREEN",
  MULTI_COURT: "GREEN",
};

export interface AdminReservationDto extends Reservation {
  clientEmail: string;
  clientPhone: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReservationDetailDto extends AdminReservationDto {
  payment: {
    id: string | null;
    amount: number | null;
    currency: string | null;
    method: string | null;
    status: string | null;
    providerReference: string | null;
    paidAt: string | null;
  } | null;
  ticket: {
    id: string | null;
    code: string | null;
    status: string | null;
    usedAt: string | null;
    validFrom: string | null;
    validUntil: string | null;
  } | null;
  tickets?: Array<{
    id: string;
    ticketCode: string;
    status: string;
    createdAt: string;
  }>;
  accessLogs: Array<{
    id: string;
    result: string;
    reason: string | null;
    accessPoint: string | null;
    createdAt: string;
  }>;
}

/**
 * Convierte un objeto Date en strings de fecha (YYYY-MM-DD) y hora (HH:mm) en zona horaria America/Bogota.
 */
export function toBogotaDateParts(date: Date): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  };
}

export function computeOperationalStatus(
  statusDb: string,
  startAt: Date,
  endAt: Date,
  expiresAt: Date | null,
  now: Date
): ReservationStatus {
  const cleanStatus = statusDb.trim().toLowerCase();

  // 'expired' (HOLD vencido) se muestra como no confirmada; 'completed' y 'no_show' ya terminaron.
  if (cleanStatus === "cancelled" || cleanStatus === "expired") {
    return "CANCELLED";
  }

  if (cleanStatus === "completed" || cleanStatus === "no_show") {
    return "FINISHED";
  }

  if (cleanStatus === "pending") {
    if (expiresAt && now.getTime() > expiresAt.getTime()) {
      return "CANCELLED"; // Para UI de filtros, el hold vencido es no confirmada/cancelada
    }
    return "PENDING";
  }

  if (cleanStatus === "confirmed") {
    const nowTime = now.getTime();
    if (nowTime < startAt.getTime()) {
      return "CONFIRMED";
    }
    if (nowTime >= startAt.getTime() && nowTime <= endAt.getTime()) {
      return "IN_PROGRESS";
    }
    return "FINISHED";
  }

  return "PENDING";
}

/**
 * Mapea una entidad booking de Prisma al DTO administrativo de la fila de la tabla.
 */
export function mapBookingToAdminDto(
  booking: any,
  now = new Date()
): AdminReservationDto {
  const startParts = toBogotaDateParts(new Date(booking.start_at));
  const endParts = toBogotaDateParts(new Date(booking.end_at));

  const startAt = new Date(booking.start_at);
  const endAt = new Date(booking.end_at);
  const expiresAt = booking.expires_at ? new Date(booking.expires_at) : null;

  const status = computeOperationalStatus(
    booking.status,
    startAt,
    endAt,
    expiresAt,
    now
  );

  const primaryTicket = booking.tickets?.[0];
  const primaryPayment = booking.payments?.[0];
  const meta = (booking.metadata as Record<string, any>) || {};

  const code =
    primaryTicket?.ticket_code ??
    primaryTicket?.code ??
    meta.code ??
    (booking.id ? `BK-${booking.id.slice(0, 8).toUpperCase()}` : "BK-UNKNOWN");

  const category: ServiceCategory = booking.services
    ? resolveReservationCategory(booking.services)
    : "SOCCER_MICRO";

  const durationMs = endAt.getTime() - startAt.getTime();
  const hours = Math.max(1, Math.round(durationMs / (1000 * 60 * 60)));

  const basePrice = Number(meta.base_amount ?? booking.total_amount ?? 0);
  const discountType: DiscountType =
    meta.discount_type || meta.discountType || "NONE";
  const discountPercent = Number(meta.discount_percent ?? meta.discountPercent ?? 0);
  const total = Number(booking.total_amount ?? 0);

  // Estado del pago
  let paymentStatus: PaymentStatus = "PENDING";
  if (
    booking.payments?.some(
      (p: any) =>
        p.status?.toLowerCase() === "succeeded" ||
        p.status?.toLowerCase() === "confirmed" ||
        p.status?.toLowerCase() === "approved" ||
        p.status?.toLowerCase() === "paid"
    ) ||
    booking.status?.toLowerCase() === "confirmed"
  ) {
    paymentStatus = "CONFIRMED";
  }

  // Estado del HOLD
  let holdState: HoldState = "NONE";
  if (booking.status?.toLowerCase() === "pending") {
    if (expiresAt && now.getTime() > expiresAt.getTime()) {
      holdState = "EXPIRED";
    } else {
      holdState = "ACTIVE";
    }
  }

  const reservationType: ReservationType =
    meta.modality === "EXCLUSIVE_RESERVATION" || meta.type === "FULL_POOL"
      ? "FULL_POOL"
      : "NORMAL";

  // Estado de acceso
  let accessStatus: AccessStatus = "NOT_ENTERED";
  if (primaryTicket?.used_at || primaryTicket?.access_logs?.some((l: any) => l.result === "GRANTED")) {
    accessStatus = "INSIDE";
  }

  // Estado del QR
  let qrStatus: QrStatus = "VALID";
  if (booking.status?.toLowerCase() === "cancelled") {
    qrStatus = "CANCELLED";
  } else if (holdState === "EXPIRED") {
    qrStatus = "EXPIRED";
  } else if (status === "FINISHED" || primaryTicket?.status?.toLowerCase() === "used") {
    qrStatus = "USED";
  } else if (primaryTicket?.status) {
    const rawStatus = primaryTicket.status.toUpperCase();
    if (["VALID", "USED", "EXPIRED", "CANCELLED"].includes(rawStatus)) {
      qrStatus = rawStatus as QrStatus;
    }
  }

  const wristbandColor: WristbandColor =
    meta.wristbandColor || WRISTBANDS_BY_CATEGORY[category] || "GREEN";

  const createdBy: "WEB" | "POS" =
    meta.origin === "POS" || primaryPayment?.method === "CASH" ? "POS" : "WEB";

  return {
    id: booking.id,
    code,
    clientId: booking.user_id,
    clientName: booking.users?.full_name ?? "Cliente Desconocido",
    clientEmail: booking.users?.email ?? "",
    clientPhone: booking.users?.phone ?? null,
    serviceId: booking.service_id,
    serviceName: booking.services?.name ?? meta.service_name_at_booking ?? "Servicio",
    category,
    resource: booking.services?.name ?? "Instalación",
    date: startParts.date,
    startTime: startParts.time,
    endTime: endParts.time,
    guests: booking.quantity ?? 1,
    hours,
    basePrice,
    discountType,
    discountPercent,
    total,
    status,
    paymentStatus,
    holdState,
    holdExpiresAt: expiresAt ? expiresAt.toISOString() : null,
    type: reservationType,
    accessStatus,
    qrStatus,
    wristbandColor,
    createdBy,
    notes: booking.notes ?? null,
    cancellationReason: booking.cancellation_reason ?? null,
    cancelledAt: booking.cancelled_at ? new Date(booking.cancelled_at).toISOString() : null,
    createdAt: new Date(booking.created_at).toISOString(),
    updatedAt: new Date(booking.updated_at).toISOString(),
  };
}

/**
 * Mapea una entidad booking con relaciones extendidas al DTO de detalle.
 */
export function mapBookingToAdminDetailDto(
  booking: any,
  now = new Date()
): AdminReservationDetailDto {
  const base = mapBookingToAdminDto(booking, now);

  const primaryPayment = booking.payments?.[0];
  const primaryTicket = booking.tickets?.[0];

  return {
    ...base,
    payment: primaryPayment
      ? {
          id: primaryPayment.id,
          amount: Number(primaryPayment.amount),
          currency: primaryPayment.currency ?? "COP",
          method: primaryPayment.payment_method ?? primaryPayment.method ?? "stripe",
          status: (primaryPayment.status || "PENDING").toUpperCase(),
          providerReference: primaryPayment.transaction_id ?? primaryPayment.provider_reference ?? null,
          paidAt: primaryPayment.paid_at || primaryPayment.created_at
            ? new Date(primaryPayment.paid_at || primaryPayment.created_at).toISOString()
            : null,
        }
      : null,
    ticket: primaryTicket
      ? {
          id: primaryTicket.id,
          code: primaryTicket.ticket_code ?? primaryTicket.code,
          status: (primaryTicket.status || "VALID").toUpperCase(),
          usedAt: primaryTicket.scanned_at || primaryTicket.used_at
            ? new Date(primaryTicket.scanned_at || primaryTicket.used_at).toISOString()
            : null,
          validFrom: primaryTicket.valid_from
            ? new Date(primaryTicket.valid_from).toISOString()
            : null,
          validUntil: primaryTicket.valid_until
            ? new Date(primaryTicket.valid_until).toISOString()
            : null,
        }
      : null,
    tickets: (booking.tickets ?? []).map((t: any) => ({
      id: t.id,
      ticketCode: t.ticket_code ?? t.code,
      status: (t.status || "VALID").toUpperCase(),
      createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
    })),
    accessLogs: (primaryTicket?.access_logs ?? []).map((log: any) => ({
      id: log.id,
      result: log.result,
      reason: log.reason ?? null,
      accessPoint: log.access_point ?? null,
      createdAt: new Date(log.created_at).toISOString(),
    })),
  };
}
