import { NextRequest, NextResponse } from "next/server";
import {
  StripeWebhookService,
  stripeWebhookService,
} from "@/features/payments/services/webhook.service";
import {
  InvalidStripeSignatureError,
  StripeNotConfiguredError,
} from "@/features/payments/errors/payments.errors";

export interface WebhookRouteContext {
  params?: unknown;
  serviceOverride?: StripeWebhookService;
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
    const result = await service.handleRaw(rawBody, signature);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: unknown) {
    const errCode = (error && typeof error === "object" && "code" in error) ? (error as any).code : undefined;
    if (error instanceof InvalidStripeSignatureError || errCode === "INVALID_STRIPE_SIGNATURE") {
      const err = error as InvalidStripeSignatureError;
      return NextResponse.json(
        { success: false, error: err.code || "INVALID_STRIPE_SIGNATURE", message: err.message },
        { status: 400 }
      );
    }
    if (error instanceof StripeNotConfiguredError || errCode === "STRIPE_NOT_CONFIGURED") {
      const err = error as StripeNotConfiguredError;
      return NextResponse.json(
        { success: false, error: err.code || "STRIPE_NOT_CONFIGURED", message: err.message },
        { status: 503 }
      );
    }

    console.error("[API_PAYMENTS_WEBHOOK_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Error procesando el webhook de pagos" },
      { status: 500 }
    );
  }
}
