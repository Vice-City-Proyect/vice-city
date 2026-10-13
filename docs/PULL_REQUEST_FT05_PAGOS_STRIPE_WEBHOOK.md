# 📄 Documentación de Pull Request: FT-05 Pagos & Stripe Webhook

## 1. Información General
* **Feature:** `FT-05` — Pagos & Stripe Webhook (SRS)
* **Historias de Usuario Incluidas:**
  * `HU23` — Checkout con tarjeta (Stripe Test) (RN-016)
  * `HU24` — Webhook de Stripe y confirmación del ticket (RN-016, RN-018, RN-019)
* **Tipo:** Feature Completa / Full-Stack Vertical Slice (3 Capas)
* **Rama:** `feature/FT-05/pagos-stripe-webhook/daniela-zapata`
* **Rama Base (Target):** `backend`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Módulo y Arquitectura en 3 Capas

La feature **FT-05** implementa la pasarela de pagos oficial mediante Stripe (modo test), garantizando el inicio seguro del checkout, la recepción y validación criptográfica de eventos vía Webhooks, la confirmación atómica de reservas, y la emisión de tickets digitales con código QR para control de acceso, cumpliendo estrictamente con las reglas de negocio **RN-016, RN-018 y RN-019**.

### 🏗️ Arquitectura de las 3 Capas Desarrolladas:

```text
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3: INTERFAZ, RUTAS API Y CONTRATOS (ZOD .strict())    │
│  - POST /api/payments/create-intent                         │
│  - POST /api/payments/webhook                               │
│  - UI: StripeCheckoutForm, PaymentStatusAlert, TicketQRCode │
│  - Swagger OpenAPI 3.0 para Checkout y Webhooks             │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  CAPA 2: LÓGICA DE NEGOCIO Y DOMINIO (SERVICIOS PURIFICADOS)│
│  - StripePaymentService (RN-016, Idempotencia, HOLD 10 min) │
│  - StripeWebhookService (Firma criptográfica, RN-018 y 019) │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  CAPA 1: BASE DE DATOS Y ORM (PRISMA 6 & SUPABASE)          │
│  - Transacciones atómicas ($transaction)                    │
│  - Modelos: bookings, payments, tickets                     │
│  - Tarifas congeladas y trazabilidad con provider_reference │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Detalle por Historia de Usuario (HU)

### 📌 HU23 — Checkout con Tarjeta (Stripe Test)
* **Monto exacto:** Creación de PaymentIntents con la tarifa histórica congelada de la reserva en centavos, incluyendo automáticamente los descuentos de HU22 (**RN-016**).
* **Validación de HOLD (RN-011 / RN-016):** Rechazo inmediato con `HoldExpiredPaymentError` (HTTP 410 Gone) si la reserva tiene `expires_at <= now()`.
* **Idempotencia contra doble clic:** Reutiliza el `clientSecret` existente si el usuario hace doble clic o reintenta pagar, evitando cobros dobles en Stripe y registros duplicados.
* **Desacoplamiento:** El frontend no marca la reserva como pagada; solo inicia el intent.

### 📌 HU24 — Webhook de Stripe y Confirmación del Ticket
* **Validación de firma criptográfica:** Verificación de `stripe-signature` con `STRIPE_WEBHOOK_SECRET` mediante `constructEvent`. Rechazo con HTTP 400 si la firma es apócrifa (**RN-016**).
* **Confirmación atómica:** Al recibir `payment_intent.succeeded`, actualiza `bookings.status = 'confirmed'`, marca `payments.status = 'paid'` con `paid_at = now()`, y genera el ticket en `tickets` (**RN-019**).
* **Idempotencia en Webhook:** Manejo seguro ante reintentos de Stripe (`isAlreadyProcessed = true`), sin duplicar tickets.
* **Manejo de HOLD vencido:** Si el pago se confirma tras vencer la ventana de 10 min, se rescata controladamente la reserva emitiendo el ticket con trazabilidad en metadata (`overdue_hold_rescued = true`).
* **Sin reembolsos (RN-018):** El sistema no revoca ni cancela tickets ante eventos de reembolso en el MVP.

---

## 4. Endpoints Expuestos y Documentación Swagger

| Método | Endpoint | Descripción | Swagger Doc |
|---|---|---|---|
| `POST` | `/api/payments/create-intent` | Crea o reutiliza PaymentIntent de Stripe | [`hu23-stripe-checkout.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu23-stripe-checkout.swagger.json) |
| `POST` | `/api/payments/webhook` | Receptor oficial de webhooks y confirmación | [`hu24-stripe-webhook.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu24-stripe-webhook.swagger.json) |

---

## 5. Pruebas Unitarias y Calidad

Ejecución de la suite completa de Vice City (25 pruebas unitarias automatizadas):
```bash
npm test
```

**Resultado obtenido (25/25 tests aprobados al 100%):**
```text
▶ FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios (5 tests ✔)
▶ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos (5 tests ✔)
▶ FT-04 / HU22: Descuentos y Promociones Oficiales (5 tests ✔)
▶ FT-05 / HU23: Checkout con Tarjeta (Stripe Test) (5 tests ✔)
▶ FT-05 / HU24: Webhook de Stripe y Confirmación de Tickets (5 tests ✔)

ℹ tests 25
ℹ suites 5
ℹ pass 25
ℹ fail 0
```

### Compilación y Build:
```bash
npm run build
```
*Next.js compila todas las páginas dinámicas, rutas y middleware sin errores.*

---

## 6. Zero Interference Policy
* Ningún módulo ajeno (`auth/`, `users/`, etc.) fue afectado.
* Librería oficial `stripe` agregada limpiamente en `package.json`.
* Código 100% modular, encapsulado en `src/features/payments/` y `src/features/tickets/`.
