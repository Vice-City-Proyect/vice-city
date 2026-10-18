/**
 * API Route Handler: Consulta de Estado y Tiempo de HOLD de una Reserva (HU21)
 * GET /api/reservations/:id
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  reservationHoldService,
  BookingNotFoundError,
} from "@/features/reservations";
import { resolveSession } from "@/features/auth/utils/session-context";
import { stripeWebhookService } from "@/features/payments/services/webhook.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "El ID de la reserva es obligatorio.",
        },
        { status: 400 }
      );
    }

    // Si la reserva sigue en pending y tiene una sesión de Stripe, reconciliarla antes de consultar
    const rawBooking = await prisma.bookings.findUnique({
      where: { id },
      select: { status: true, metadata: true },
    });
    if (
      rawBooking &&
      rawBooking.status === "pending" &&
      Boolean((rawBooking.metadata as any)?.stripe_session_id)
    ) {
      try {
        await stripeWebhookService.syncCheckoutSession(id);
      } catch {
        // La sincronización en línea es tolerante a fallos si Stripe o red no responden
      }
    }

    const bookingDetails = await reservationHoldService.getBookingDetails(id);

    return NextResponse.json({
      success: true,
      message: "Detalles de la reserva obtenidos exitosamente",
      data: bookingDetails,
    });
  } catch (error: any) {
    if (error instanceof BookingNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 404 }
      );
    }

    console.error("Error al consultar reserva:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al consultar la reserva",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint DELETE /api/reservations/:id
 * Permite al usuario o a un administrador liberar/cancelar un HOLD pendiente (RN-011).
 * Si la reserva ya fue confirmada, se rechaza conforme a RN-018 (sin cancelaciones de clientes).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Se requiere sesión activa", error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const booking = await prisma.bookings.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Reserva no encontrada", error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const isAdmin = session.role.toUpperCase() === "ADMIN";
    if (!isAdmin && booking.user_id !== session.id) {
      return NextResponse.json(
        { success: false, message: "No tienes permiso para modificar esta reserva", error: { code: "FORBIDDEN" } },
        { status: 403 }
      );
    }

    if (booking.status === "confirmed") {
      return NextResponse.json(
        { success: false, message: "No se permite la cancelación de reservas confirmadas en el MVP", error: { code: "CANNOT_CANCEL_CONFIRMED" } },
        { status: 400 }
      );
    }

    if (booking.status === "pending") {
      await prisma.bookings.update({
        where: { id },
        data: {
          status: "cancelled",
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Retención de reserva liberada exitosamente",
      data: { id, status: "cancelled" },
    });
  } catch (error: any) {
    console.error("Error al cancelar retención de reserva:", error);
    return NextResponse.json(
      { success: false, message: "Error interno al cancelar la retención de reserva" },
      { status: 500 }
    );
  }
}

