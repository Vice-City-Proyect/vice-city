/**
 * Plantillas HTML de correo para confirmaciones de reserva y ticket digital.
 * Vice City - Features: Payments
 *
 * Diseño responsivo y mobile-friendly con la identidad visual del club.
 */

export interface BookingEmailData {
  holderName: string;
  serviceName: string;
  startAt: Date;
  endAt: Date;
  quantity: number;
  totalAmount: number;
  ticketCode: string;
  qrDataUrl?: string;
}

export function formatCOP(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}

function formatRange(startAt: Date, endAt: Date): string {
  const date = startAt.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fmt = (d: Date) =>
    d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${fmt(startAt)} – ${fmt(endAt)}`;
}

export function bookingConfirmationHtml(data: BookingEmailData): string {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(data.ticketCode)}`;

  const qrBlock = `
    <div style="text-align:center;margin:24px 0;background:#f8fafc;padding:20px;border-radius:16px;border:1px solid #e2e8f0;">
      <img src="${qrImageUrl}" alt="Código QR del ticket" width="220" height="220" style="display:inline-block;border-radius:12px;border:1px solid #cbd5e1;background:#ffffff;padding:8px;" />
      <p style="font-family:monospace;font-size:14px;color:#0f172a;font-weight:bold;margin:12px 0 4px;letter-spacing:1px;">${data.ticketCode}</p>
      <p style="font-size:11px;color:#64748b;margin:0;">Presenta este código en portería o ingrésalo manualmente</p>
    </div>`;

  return `
  <div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0f172a;padding:20px 24px;">
        <span style="color:#b0bf3f;font-size:22px;font-weight:900;letter-spacing:2px;font-family:Georgia,serif;">VICE CITY</span>
        <span style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:3px;display:block;">Sports</span>
      </div>
      <div style="padding:28px 24px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">¡Pago confirmado! 🎉</h2>
        <p style="color:#334155;font-size:14px;line-height:1.6;">Hola <strong>${data.holderName}</strong>, tu reserva fue confirmada y tu ticket digital está listo.</p>

        <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:14px;">
          <tr><td style="padding:8px 0;color:#64748b;">Servicio</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:bold;">${data.serviceName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Fecha y hora</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:bold;">${formatRange(data.startAt, data.endAt)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Personas</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:bold;">${data.quantity}</td></tr>
          <tr><td style="padding:8px 0;border-top:1px solid #e2e8f0;color:#64748b;">Total pagado</td><td style="padding:8px 0;border-top:1px solid #e2e8f0;text-align:right;color:#0f172a;font-weight:900;font-size:16px;">${formatCOP(data.totalAmount)}</td></tr>
        </table>

        ${qrBlock}

        <p style="color:#64748b;font-size:12px;line-height:1.6;">Presenta este código QR en el acceso del complejo. El ticket es válido únicamente para la franja reservada.</p>
      </div>
      <div style="background:#f8fafc;padding:16px 24px;color:#94a3b8;font-size:11px;text-align:center;">
        Vice City Sports — Sistema de reservas
      </div>
    </div>
  </div>`;
}

export function bookingConfirmationText(data: BookingEmailData): string {
  return [
    `Hola ${data.holderName}, tu pago fue confirmado.`,
    `Servicio: ${data.serviceName}`,
    `Fecha: ${formatRange(data.startAt, data.endAt)}`,
    `Personas: ${data.quantity}`,
    `Total: ${formatCOP(data.totalAmount)}`,
    `Código de ticket: ${data.ticketCode}`,
  ].join("\n");
}