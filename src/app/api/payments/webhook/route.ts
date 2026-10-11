/**
 * API Route Handler: Webhook Oficial de Stripe (HU24 / RN-016, RN-018, RN-019)
 * POST /api/payments/webhook
 *
 * Contrato de Respuesta Unificado: { success, message, data?, error? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  stripeWebhookService,
  InvalidWebhookSignatureError,
  WebhookBookingNotFoundError,
} from "@/features/payments";

export async function POST(request: NextRequest) {
  try {
    // 1. Obtener el cuerpo crudo (RAW) y la firma de Stripe
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    // 2. Criterio 2: Validar la firma criptográfica del webhook
    const event = stripeWebhookService.verifyWebhookSignature(rawBody, signature);

    // 3. Criterios 1, 3 y 4: Procesar confirmación atómica e idempotente
    const result = await stripeWebhookService.handleWebhookEvent(event);

    return NextResponse.json(
      {
        success: true,
        message: result.isAlreadyProcessed
          ? "Evento de webhook ya procesado previamente (idempotente)"
          : "Evento de pago procesado exitosamente y ticket generado",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 400 }
      );
    }

    if (error instanceof WebhookBookingNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code },
        },
        { status: 404 }
      );
    }

    console.error("Error no controlado en POST /api/payments/webhook:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al procesar el webhook de Stripe",
        error: { code: "INTERNAL_SERVER_ERROR" },
      },
      { status: 500 }
    );
  }
}
