# Pull Request — Sprint 2: Google OAuth, Pagos con Stripe (test) y Correo Electrónico

**Rama:** `feature/sprint2-oauth-payments-email` → `develop`
**Alcance:** habilitar el inicio de sesión/registro real con Google, el pago en línea
con Stripe (test mode) del flujo de reservas web, y el sistema de correo
(confirmación de cuenta, recuperación de contraseña, confirmación de reserva con
ticket QR).

> Nota: no se realizaron commits/push; estos cambios están listos para revisión.

---

## 1. Resumen de cambios

### 1.1 Google OAuth (login y registro)
- El proveedor Google ya estaba configurado en `src/lib/auth.ts` (`signIn` callback
  delega en `googleAuthService.handleGoogleAuth`, registra rol CLIENT y vincula la
  cuenta). Se activó la UI:
  - `login-form.tsx`: el botón "Continue with Google" ahora llama a
    `signIn('google', { callbackUrl, redirect: false })` con estado de carga y
    manejo de errores; se muestran mensajes claros para `?error=` (cuenta
    inactiva, correo no provisto, cuenta no vinculada, etc.).
  - `RegisterForm.tsx`: nuevo botón "Registrarse con Google" (misma delegación).
  - `app/login/page.tsx`: `LoginForm` envuelto en `Suspense` (usa
    `useSearchParams`).

### 1.2 Reservas web + Pagos con Stripe (test mode)
- **Precio y disponibilidad server-side** (nunca desde el cliente):
  - `src/features/payments/lib/pricing.ts`: motor de precios puro (descuento de
    miércoles 20% o piscina completa 20%, no acumulables; duraciones 1–9 h).
  - `src/features/reservations/services/availability.service.ts`: validación de
    ventana de reserva, horario 8:00–17:00, día de mantenimiento (lunes), aforo
    por modalidad (`EXCLUSIVE_RESERVATION` = 1, `PER_PERSON_HOUR` = capacity) y
    prevención de sobreventa (HOLD vencido no ocupa la franja).
  - `src/features/reservations/services/reservations.service.ts`: crea la reserva
    `pending` con HOLD de 10 min dentro de `$transaction` con
    `pg_advisory_xact_lock` (anti-carrera).
- **Checkout**: `checkout.service.ts` valida dueño (o ADMIN), estado pagable y
  HOLD vigente; el monto se toma de `booking.total_amount`; persiste el
  `stripe_session_id`. Cliente Stripe con inicialización perezosa
  (`stripe.client.ts`) para no romper el arranque sin credenciales.
- **Webhook** (`webhook.service.ts`): verifica firma (`STRIPE_WEBHOOK_SECRET`),
  es idempotente y atómico:
  - `checkout.session.completed` / `async_payment_succeeded` (pagado): confirma
    reserva + registra pago `SUCCEEDED` + emite ticket + envía correo con QR
    (una sola vez).
  - HOLD vencido: registra pago `REFUNDED`, solicita reembolso a Stripe y **no**
    confirma.
  - `checkout.session.expired` / `async_payment_failed`: pago `FAILED` y reserva
    `expired`; nunca degrada un pago exitoso.
- **Tickets**: `ticket.service.ts` genera código seguro de 128 bits.

### 1.3 Correo electrónico
- `email.service.ts`: nuevo `SmtpEmailSender` (nodemailer) + `getEmailSender()`.
  Si no hay `SMTP_HOST`, usa `ConsoleEmailSender` (desarrollo).
- `email-confirmation.service.ts` / `password-reset.service.ts`: usan
  `getEmailSender()`; se corrigió la URL base hardcodeada (`https://vicecity.com`)
  por `NEXT_PUBLIC_APP_URL` y el enlace de reset a `/reset-password`.
- `register/route.ts`: dispara el correo de verificación tras registrar (un
  fallo de correo no impide el registro).
- Plantillas: `src/features/auth/email/templates.ts` (verificación, reset) y
  `src/features/payments/email/templates.ts` (confirmación de reserva + QR).
- `booking-email.service.ts`: genera el QR (`qrcode`) e incrusta el ticket.

### 1.4 Nuevos endpoints (Route Handlers)
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| POST | `/api/reservations` | CLIENT, ADMIN | Crea reserva `pending` con HOLD 10 min |
| POST | `/api/payments/checkout` | CLIENT, ADMIN | Crea Checkout Session de Stripe |
| POST | `/api/payments/webhook` | Público (firma Stripe) | Confirma/expira reservas |
| POST | `/api/auth/confirm-email` | Público | Consume token de verificación |
| POST | `/api/auth/resend-confirmation` | Público | Reenvía verificación (invalida el anterior) |

Todos siguen el estándar defensivo (`vice-city-api-contracts`): Content-Type,
parseo seguro, guarda de objeto, Zod `.strict()` y envelope
`{ success, error, message }`.

### 1.5 UI nueva
- Páginas: `/verify-email`, `/forgot-password`, `/reset-password`
  (+ componentes `VerifyEmailClient`, `ForgotPasswordForm`, `ResetPasswordForm`).
- `login-form.tsx`: enlace "¿Olvidaste tu contraseña?" y avisos de
  registro/verificación.

### 1.6 Permisos
- `route-permissions.ts`: públicos `/verify-email`,
  `/api/auth/confirm-email`, `/api/auth/resend-confirmation`,
  `/api/payments/webhook`; protegidos `/api/reservations` y
  `/api/payments/checkout` (CLIENT, ADMIN).
- `session-context.ts`: helper de sesión para handlers (override nombrado, sin
  reinterpretar el contexto de Next.js 16).

### 1.7 Documentación y entorno
- Contratos OpenAPI 3.0.3: `docs/swagger/reservations.swagger.json`,
  `payments.swagger.json`, `auth-email-confirmation.swagger.json`.
- `.env.example`: `NEXT_PUBLIC_APP_URL` y bloque `SMTP_*` / `EMAIL_FROM`.

---

## 2. Variables de entorno requeridas

```bash
# Ya existentes
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Nuevas / a configurar
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."   # solo si se usa Stripe.js en cliente

SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="..."
SMTP_PASS="..."
EMAIL_FROM="Vice City <no-reply@vicecity.club>"
```

`.env` permanece ignorado por git (`.gitignore:34`).

---

## 3. Configuración manual pendiente (fuera del código)

1. **Google Cloud Console:** crear credenciales OAuth 2.0 (Web) y agregar el
   redirect URI `http://localhost:3000/api/auth/callback/google` (+ dominio de
   producción). Ver `docs/GOOGLE_OAUTH_SETUP_GUIDE.md`.
2. **Stripe Dashboard (test mode):** obtener `sk_test_...`, registrar el webhook
   apuntando a `https://<host>/api/payments/webhook` con los eventos
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.expired`, `checkout.session.async_payment_failed`, y copiar
   el `whsec_...`.
3. **SMTP:** definir proveedor (Mailtrap/SES/Resend SMTP) y cargar credenciales.

Sin estas credenciales los flujos externos **no** están verificados end-to-end
(ver limitaciones).

---

## 4. Pruebas y verificación

- **Unitarias/integración:** `npm test` → **267 tests / 267 pass / 0 fail**
  (nuevas suites: pricing, availability, reservations.service, ticket.service,
  webhook.service, checkout.service, reservations.route, checkout.route,
  webhook.route, email.routes, route-permissions.payments, swagger.contracts).
- **Typecheck:** `npx tsc --noEmit` → 0 errores.
- **Build:** `npm run build` → compilación y generación de páginas exitosa.
- **Lint:** componentes/páginas nuevas sin errores. En servicios de dominio
  persisten usos de `any` (regla repo-wide `@typescript-eslint/no-explicit-any`,
  consistente con el código existente).

---

## 5. Riesgos y limitaciones

- **No verificado end-to-end:** no hay credenciales reales de Google/Stripe/SMTP;
  los flujos externos solo están cubiertos con mocks/fixtures.
- **UI de pago:** las pantallas de reserva de `/cliente/reservas` siguen siendo
  mock; no se conectaron a `/api/reservations` ni a `/api/payments/checkout` para
  no introducir un flujo ficticio. Los endpoints de backend están completos y
  testeados, listos para integrarse cuando exista la UI real y credenciales.
- **HOLD vs. Checkout mínimo de Stripe:** la sesión de Checkout de Stripe tiene un
  mínimo de ~30 min, mayor que el HOLD de 10 min; el webhook reembolsa
  automáticamente si el pago llega con el HOLD vencido.
- **`checkout.session.async_payment_succeeded`:** ya se maneja, aunque el método
  de pago por defecto (tarjeta) es síncrono.

---

## 6. Checklist para revisión

- [ ] El monto y el aforo se validan siempre en el servidor.
- [ ] El webhook verifica firma y es idempotente (pago/ticket/correo únicos).
- [ ] No se rompió login por credenciales, recuperación ni RBAC.
- [ ] Variables de entorno documentadas en `.env.example`.
- [ ] Contratos OpenAPI creados para los endpoints nuevos.
