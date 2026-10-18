import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireStaleBookings } from "@/features/reservations";
import { resolveSession } from "@/features/auth/utils/session-context";

/**
 * Endpoint POST /api/reservations/expire-holds
 * Permite ejecutar la expiración periódica o manual de reservas con HOLD vencido (RN-011).
 * Libera la restricción de exclusión en PostgreSQL y actualiza el estado a 'expired'.
 *
 * Autorización: Header Bearer con CRON_SECRET o sesión activa.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized =
      Boolean(cronSecret) && Boolean(authHeader) && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const session = await resolveSession();
      if (!session) {
        return NextResponse.json(
          {
            success: false,
            message: "Se requiere autenticación para ejecutar la expiración de reservas",
            error: { code: "UNAUTHORIZED" },
          },
          { status: 401 }
        );
      }
    }

    const count = await expireStaleBookings(prisma);

    return NextResponse.json({
      success: true,
      message: `Se expiraron ${count} reservas pendientes con HOLD vencido`,
      data: { expiredCount: count },
    });
  } catch (error: any) {
    console.error("[EXPIRE_HOLDS_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al expirar reservas vencidas",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

