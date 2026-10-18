import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveSession, hasAnyRole } from "@/features/auth/utils/session-context";
import { stripeWebhookService } from "@/features/payments/services/webhook.service";

const syncSchema = z
  .object({
    bookingId: z.string().optional(),
    sessionId: z.string().optional(),
  })
  .refine((data) => Boolean(data.bookingId || data.sessionId), {
    message: "Se requiere bookingId o sessionId",
  });

/**
 * Endpoint POST /api/payments/checkout/sync
 * Sincroniza y reconcilia una reserva directamente con Stripe.
 * Permite confirmar reservas cuando el usuario retorna exitosamente del checkout
 * o cuando los webhooks presentan latencia o no están configurados en entornos locales.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await resolveSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Se requiere sesión activa" },
        { status: 401 }
      );
    }

    if (!hasAnyRole(session, ["CLIENT", "ADMIN"])) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Rol no autorizado" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY", message: "Cuerpo JSON inválido" },
        { status: 400 }
      );
    }

    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Parámetros de sincronización inválidos",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { bookingId, sessionId } = parsed.data;
    const lookupId = bookingId || sessionId!;

    // Si se pasa bookingId, validar pertenencia o rol ADMIN
    if (bookingId) {
      const existing = await prisma.bookings.findUnique({
        where: { id: bookingId },
        select: { id: true, user_id: true, status: true },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "NOT_FOUND", message: "Reserva no encontrada" },
          { status: 404 }
        );
      }

      const isAdmin = session.role?.toUpperCase() === "ADMIN";
      if (!isAdmin && existing.user_id !== session.id) {
        return NextResponse.json(
          { success: false, error: "FORBIDDEN", message: "No tienes permiso para ver esta reserva" },
          { status: 403 }
        );
      }
    }

    const result = await stripeWebhookService.syncCheckoutSession(lookupId);

    return NextResponse.json(
      {
        success: true,
        message: result.confirmed ? "Reserva sincronizada y confirmada" : "Estado sincronizado",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API_PAYMENTS_CHECKOUT_SYNC_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Error al sincronizar con Stripe" },
      { status: 500 }
    );
  }
}

