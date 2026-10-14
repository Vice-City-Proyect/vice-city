import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import {
  CheckoutService,
  checkoutService,
} from "@/features/payments/services/checkout.service";
import { PaymentError } from "@/features/payments/errors/payments.errors";
import {
  resolveSession,
  hasAnyRole,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";

const checkoutSchema = z.object({
  bookingId: z.string().min(1, "El identificador de la reserva es obligatorio"),
});

const strictSchema = checkoutSchema.strict();

export interface CheckoutRouteContext extends SessionAwareRouteContext {
  serviceOverride?: CheckoutService;
}

/**
 * Endpoint POST /api/payments/checkout
 * Crea una Checkout Session de Stripe (test mode) para una reserva pendiente.
 * El monto se calcula en el servidor a partir de booking.total_amount.
 */
export async function POST(
  request: NextRequest,
  context?: CheckoutRouteContext
) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "INVALID_CONTENT_TYPE", message: "El encabezado Content-Type debe ser application/json" },
        { status: 400 }
      );
    }

    const session = await resolveSession(context);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Se requiere una sesión activa para pagar" },
        { status: 401 }
      );
    }
    if (!hasAnyRole(session, ["CLIENT", "ADMIN"])) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Tu rol no tiene permisos para iniciar pagos" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "MALFORMED_JSON", message: "El cuerpo de la solicitud no es un JSON válido o está vacío" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY", message: "El cuerpo de la solicitud debe ser un objeto JSON" },
        { status: 400 }
      );
    }

    const parsed = strictSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de pago inválidos",
          details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? checkoutService;
    const result = await service.createCheckoutSession(parsed.data.bookingId, {
      id: session.id,
      role: session.role,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Sesión de pago creada",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof PaymentError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[API_PAYMENTS_CHECKOUT_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Ocurrió un error interno al crear la sesión de pago" },
      { status: 500 }
    );
  }
}