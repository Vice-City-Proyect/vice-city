import { NextRequest, NextResponse } from "next/server";
import {
  StripeWebhookService,
  stripeWebhookService,
} from "@/features/payments/services/webhook.service";
import {
  InvalidStripeSignatureError,
  StripeNotConfiguredError,
} from "@/features/payments/errors/payments.errors";
import {
  InvalidWebhookSignatureError,
  WebhookBookingNotFoundError,
} from "@/features/payments/errors/webhook.errors";

export interface WebhookRouteContext {
  params?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceOverride?: StripeWebhookService | any;
}

/**
 * Endpoint POST /api/payments/webhook
 * Recibe los eventos de Stripe, verifica la firma y confirma/expira reservas.
 *
 * IMPORTANTE: se lee el cuerpo CRUDO (request.text()) porque la verificación de
 * firma de Stripe requiere los bytes exactos enviados por Stripe.
 */
export async function POST(
  request: NextRequest,
  context?: WebhookRouteContext
) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { success: false, error: "MISSING_SIGNATURE", message: "Falta el encabezado stripe-signature" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_BODY", message: "No se pudo leer el cuerpo de la solicitud" },
      { status: 400 }
    );
  }

  if (!rawBody) {
    return NextResponse.json(
      { success: false, error: "EMPTY_BODY", message: "El cuerpo de la solicitud está vacío" },
      { status: 400 }
    );
  }

  const service = context?.serviceOverride ?? stripeWebhookService;

  try {
    // Si el servicio tiene handleRaw (desarrollado en develop)
    if (typeof service.handleRaw === "function") {
      const result = await service.handleRaw(rawBody, signature);
      return NextResponse.json({ success: true, ...result }, { status: 200 });
    }

    // Si el servicio usa la interfaz de stripe-webhook.service (backend)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = typeof (service as any).verifyWebhookSignature === "function"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (service as any).verifyWebhookSignature(rawBody, signature)
      : JSON.parse(rawBody);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (service as any).handleWebhookEvent(event);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error instanceof InvalidStripeSignatureError || error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json(
        { success: false, error: error.code || "INVALID_SIGNATURE", message: error.message },
        { status: 400 }
      );
    }
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: 503 }
      );
    }
    if (error instanceof WebhookBookingNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.code || "BOOKING_NOT_FOUND", message: error.message },
        { status: 404 }
      );
    }

    console.error("[API_PAYMENTS_WEBHOOK_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Error procesando el webhook de pagos" },
      { status: 500 }
    );
  }
}
