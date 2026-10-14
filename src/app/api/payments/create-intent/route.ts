/**
 * API Route Handler: Creación de Payment Intent de Stripe (HU23 / RN-016)
 * POST /api/payments/create-intent
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  stripePaymentService,
  createPaymentIntentSchema,
  HoldExpiredPaymentError,
  BookingAlreadyPaidError,
  BookingNotFoundError,
  BookingCancelledError,
  StripePaymentError,
  StripeNotConfiguredError,
} from "@/features/payments";
import { ForbiddenBookingAccessError } from "@/features/payments/errors/payments.errors";
import {
  resolveSession,
  hasAnyRole,
  type SessionAwareRouteContext,
} from "@/features/auth/utils/session-context";

export interface CreateIntentRouteContext extends SessionAwareRouteContext {
  serviceOverride?: Pick<typeof stripePaymentService, "createPaymentIntent">;
}

export async function POST(request: NextRequest, context?: CreateIntentRouteContext) {
  try {
    // Solo el dueño de la reserva (o un ADMIN) puede iniciar su pago.
    const session = await resolveSession(context);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere una sesión activa para pagar",
          error: { code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }
    if (!hasAnyRole(session, ["CLIENT", "ADMIN"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Tu rol no tiene permisos para iniciar pagos",
          error: { code: "FORBIDDEN" },
        },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "El cuerpo de la solicitud no es un JSON válido o está vacío",
          error: { code: "MALFORMED_JSON" },
        },
        { status: 400 }
      );
    }

    const parseResult = createPaymentIntentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros de pago inválidos",
          error: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const service = context?.serviceOverride ?? stripePaymentService;
    const result = await service.createPaymentIntent(parseResult.data, {
      id: session.id,
      role: session.role,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.isReused
          ? "Intento de pago recuperado exitosamente (idempotente)"
          : "Intento de pago generado exitosamente en Stripe",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof HoldExpiredPaymentError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 410 }
      );
    }

    if (error instanceof BookingAlreadyPaidError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 409 }
      );
    }

    if (error instanceof ForbiddenBookingAccessError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 403 }
      );
    }

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

    if (error instanceof BookingCancelledError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 400 }
      );
    }

    if (error instanceof StripePaymentError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 502 }
      );
    }

    if (error instanceof StripeNotConfiguredError || (error as any)?.code === "STRIPE_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          success: false,
          message: (error as any)?.message || "La pasarela de pagos no está configurada.",
          error: { code: "STRIPE_NOT_CONFIGURED" },
        },
        { status: 503 }
      );
    }

    console.error("Error no controlado en POST /api/payments/create-intent:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor al procesar la solicitud de pago",
        error: { code: "INTERNAL_SERVER_ERROR" },
      },
      { status: 500 }
    );
  }
}

