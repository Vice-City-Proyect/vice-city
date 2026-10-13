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
} from "@/features/payments";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    const result = await stripePaymentService.createPaymentIntent(parseResult.data);

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

