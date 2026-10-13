# 📄 Documentación de Pull Request: FT-05 / HU24 Webhook de Stripe y Confirmación del Ticket

## 1. Información General
* **Jira Tarea:** `HU24` — Webhook de Stripe y confirmación del ticket (FT-05 Pagos & Stripe Webhook)
* **Tipo:** Feature Full-Stack / Vertical Slice
* **Rama:** `feature/HU24/webhook-stripe/daniela-zapata`
* **Rama Base:** `feature/HU23/checkout-stripe/daniela-zapata`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado (Vertical Slice)
Se implementó el receptor oficial de eventos de la pasarela Stripe (**Webhook**) que garantiza la confirmación segura y atómica de la reserva únicamente tras la verificación del cobro, emitiendo el ticket digital con código QR seguro, dando cumplimiento a las reglas de negocio **RN-016, RN-018 y RN-019**:

### Arquitectura por Capas:
1. **Base de Datos & ORM (`@/lib/prisma`):**
   * Transacciones atómicas de Prisma (`prisma.$transaction`) que actualizan simultáneamente el estado de la reserva (`bookings.status = 'confirmed'`), el estado del pago (`payments.status = 'paid'`, `paid_at = now()`) y generan el registro en `tickets`.
2. **Lógica de Negocio y Dominio (`src/features/payments/`):**
   * [`stripe-webhook.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/payments/services/stripe-webhook.service.ts):
     * **Verificación criptográfica de firma (RN-016):** Valida la firma del header `stripe-signature` con `STRIPE_WEBHOOK_SECRET` mediante `constructEvent`. Rechaza firmas no autorizadas con `InvalidWebhookSignatureError` (HTTP 400).
     * **Idempotencia (Criterio 3):** Si Stripe reenvía el mismo evento `payment_intent.succeeded` o se presentan reintentos por latencia, el servicio detecta si la reserva ya está confirmada y devuelve el ticket existente sin crear duplicados.
     * **Manejo de HOLD vencido (Criterio 4):** Si el pago se confirma cuando la ventana de 10 minutos ya expiró, el servicio rescata y confirma la reserva asignando el ticket e integrando trazabilidad en metadatos (`overdue_hold_rescued: true`), evitando pérdidas para el cliente.
     * **Sin reembolsos (RN-018):** Eventos de reembolso (como `charge.refunded`) no cancelan ni revocan tickets en el MVP.
     * **Generación de Ticket y QR seguro (RN-019):** Genera un código criptográfico único (`crypto.randomUUID()`) asignando validez horaria (`valid_from = start_at`, `valid_until = end_at`) y estado `valid`.
   * [`webhook.errors.ts`](file:///c:/Users/User/Documents/vice-city/src/features/payments/errors/webhook.errors.ts): Excepciones tipadas (`InvalidWebhookSignatureError` 400, `WebhookBookingNotFoundError` 404, `WebhookProcessingError` 500).
3. **Contratos de API & Zod:**
   * Endpoint `POST /api/payments/webhook`: Consume el cuerpo RAW (`request.text()`) para validar la firma de Stripe y responde con el contrato unificado `{ success, message, data?, error? }`.
4. **Componentes e Interfaz UI (Tailwind v4):**
   * [`TicketQRCodeCard.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/tickets/components/TicketQRCodeCard.tsx): Tarjeta de acceso digital deportiva con visualización del código QR, titular, rango de validez y badge de estado.
5. **Swagger / OpenAPI 3.0:**
   * [`docs/swagger/hu24-stripe-webhook.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu24-stripe-webhook.swagger.json).

---

## 3. Criterios de Aceptación Verificados

- [x] **Un evento payment_intent.succeeded válido confirma la reserva y crea el ticket:** Reserva pasa a `confirmed`, pago pasa a `paid` y se genera el ticket con su QR seguro.
- [x] **Caso de error: un evento sin firma válida es rechazado:** Si falta la firma o es incorrecta, se arroja `InvalidWebhookSignatureError` con código HTTP 400.
- [x] **Caso límite: el mismo evento recibido dos veces no duplica el ticket:** Idempotencia garantizada con `isAlreadyProcessed: true` sin mutaciones duplicadas en la base de datos.
- [x] **Caso límite: un pago confirmado después de vencido el HOLD se maneja de forma controlada:** Rescate seguro de la reserva con ticket válido y bandera de auditoría en metadata.
- [x] **Sin reembolsos ni cancelaciones de dinero (RN-018):** Eventos de reembolso son ignorados sin revocar reservas activas.
- [x] **Pruebas unitarias:** 5 de 5 pruebas unitarias automatizadas ejecutadas exitosamente con Node Test Runner (`npm test`).
- [x] **Zero Interference Policy:** Confinado estrictamente en `src/features/payments/`, `src/features/tickets/` y `src/app/api/payments/webhook/`.

---

## 4. Instrucciones de Ejecución y Pruebas

### Pruebas Unitarias:
```bash
npm test
```

**Resultado obtenido:**
```text
▶ FT-05 / HU24: Webhook de Stripe y Confirmación de Tickets
  ✔ Criterio 1: Un evento payment_intent.succeeded válido confirma la reserva y crea el ticket (RN-016 y RN-019)
  ✔ Criterio 2: Caso de error - Un evento sin firma válida es rechazado (RN-016)
  ✔ Criterio 3: Caso límite - El mismo evento recibido dos veces no duplica el ticket (Idempotencia)
  ✔ Criterio 4: Caso límite - Un pago confirmado después de vencido el HOLD se maneja de forma controlada
  ✔ Criterio 5: Sin reembolsos en MVP (RN-018) - Eventos no admitidos se ignoran sin mutar reservas
✔ FT-05 / HU24: Webhook de Stripe y Confirmación de Tickets (5 tests)
```

### Compilación y Build:
```bash
npm run build
```
*Next.js compila `/api/payments/webhook` y la suite completa con código de salida 0.*

---

## 5. Checklist de Code Review
- [x] **Vertical Slice:** Verificación de firma, Transacción atómica de Dominio, Generación de Ticket QR, Endpoint RAW, Swagger y Tests.
- [x] **Aislamiento:** Confinado en `src/features/payments/` y `src/features/tickets/`.
- [x] **Calidad:** 100% de tests unitarios aprobados (25/25 en total).
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU24_STRIPE_WEBHOOK.md`.
