/**
 * Servicio de correo de confirmación de reserva con ticket digital (QR).
 * Vice City - Features: Payments
 *
 * El QR se genera en el servidor (data URL PNG) y se incrusta en el correo.
 * La generación del QR es inyectable para poder probar sin dependencias de red.
 */

import QRCode from "qrcode";
import {
  getEmailSender,
  type IEmailSender,
} from "@/features/auth/services/email.service";
import {
  bookingConfirmationHtml,
  bookingConfirmationText,
} from "../email/templates";

export interface QrGenerator {
  toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
}

export interface BookingConfirmationEmailParams {
  to: string;
  holderName: string;
  serviceName: string;
  startAt: Date;
  endAt: Date;
  quantity: number;
  totalAmount: number;
  ticketCode: string;
  qrGenerator?: QrGenerator;
  emailSender?: IEmailSender;
}

/**
 * Envía el correo de confirmación de pago con el ticket digital (QR).
 * Devuelve true si el correo fue despachado.
 */
export async function sendBookingConfirmationEmail(
  params: BookingConfirmationEmailParams
): Promise<boolean> {
  const emailSender = params.emailSender ?? getEmailSender();
  const qrGenerator = params.qrGenerator ?? (QRCode as unknown as QrGenerator);

  let qrDataUrl: string | undefined;
  try {
    qrDataUrl = await qrGenerator.toDataURL(params.ticketCode, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  } catch {
    // Si el QR falla, el correo aún se envía con el código en texto.
    qrDataUrl = undefined;
  }

  const html = bookingConfirmationHtml({
    holderName: params.holderName,
    serviceName: params.serviceName,
    startAt: params.startAt,
    endAt: params.endAt,
    quantity: params.quantity,
    totalAmount: params.totalAmount,
    ticketCode: params.ticketCode,
    qrDataUrl,
  });

  await emailSender.sendEmail({
    to: params.to,
    subject: `Reserva confirmada — ${params.serviceName} (Ticket ${params.ticketCode})`,
    html,
    text: bookingConfirmationText({
      holderName: params.holderName,
      serviceName: params.serviceName,
      startAt: params.startAt,
      endAt: params.endAt,
      quantity: params.quantity,
      totalAmount: params.totalAmount,
      ticketCode: params.ticketCode,
    }),
  });

  return true;
}