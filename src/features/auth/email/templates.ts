/**
 * Plantillas HTML/Texto de correo para autenticación (Vice City).
 * - Confirmación de registro (verificación de correo)
 * - Recuperación de contraseña
 */

export const BRAND = {
  primary: "#0f172a",
  accent: "#b0bf3f",
  muted: "#64748b",
  surface: "#f8fafc",
};

function shell(title: string, bodyHtml: string): string {
  return `
  <div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:${BRAND.primary};padding:20px 24px;">
        <span style="color:${BRAND.accent};font-size:22px;font-weight:900;letter-spacing:2px;font-family:Georgia,serif;">VICE CITY</span>
        <span style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:3px;display:block;">Sports</span>
      </div>
      <div style="padding:28px 24px;">
        <h2 style="margin:0 0 12px;color:${BRAND.primary};font-size:20px;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="background:${BRAND.surface};padding:16px 24px;color:#94a3b8;font-size:11px;text-align:center;">
        Vice City Sports — Sistema de reservas
      </div>
    </div>
  </div>`;
}

export function verificationEmailHtml(fullName: string, verificationUrl: string): string {
  return shell(
    "Confirma tu correo electrónico",
    `<p style="color:#334155;font-size:14px;line-height:1.6;">Hola <strong>${fullName}</strong>,</p>
     <p style="color:#334155;font-size:14px;line-height:1.6;">Gracias por registrarte en Vice City. Confirma tu correo para activar tu cuenta:</p>
     <p style="margin:24px 0;text-align:center;">
       <a href="${verificationUrl}" style="background-color:${BRAND.accent};color:#0f172a;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Confirmar mi correo</a>
     </p>
     <p style="color:${BRAND.muted};font-size:12px;line-height:1.6;">O copia este enlace en tu navegador:<br/><span style="word-break:break-all;">${verificationUrl}</span></p>
     <p style="color:${BRAND.muted};font-size:12px;">Este enlace expira en 24 horas y solo puede usarse una vez.</p>`
  );
}

export function passwordResetEmailHtml(fullName: string, resetUrl: string): string {
  return shell(
    "Recuperación de contraseña",
    `<p style="color:#334155;font-size:14px;line-height:1.6;">Hola <strong>${fullName}</strong>,</p>
     <p style="color:#334155;font-size:14px;line-height:1.6;">Solicitaste restablecer tu contraseña en Vice City. Haz clic en el botón para crear una nueva:</p>
     <p style="margin:24px 0;text-align:center;">
       <a href="${resetUrl}" style="background-color:#0284c7;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Restablecer mi contraseña</a>
     </p>
     <p style="color:${BRAND.muted};font-size:12px;line-height:1.6;">Este enlace es de un solo uso y vencerá en 1 hora. Si no solicitaste este cambio, ignora este mensaje.</p>`
  );
}