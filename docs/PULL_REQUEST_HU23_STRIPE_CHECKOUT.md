# 📄 Documentación de Pull Request: FT-05 / HU23 Checkout con Tarjeta (Stripe Test)

## 1. Información General
* **Jira Tarea:** `HU23` — Checkout con tarjeta (Stripe Test) (FT-05 Pagos & Stripe Webhook)
* **Tipo:** Feature Full-Stack / Vertical Slice
* **Rama:** `feature/HU23/checkout-stripe/daniela-zapata`
* **Rama Base:** `feature/FT-04/motor-reservas-hold/daniela-zapata`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado (Vertical Slice)
Se implementó el inicio del flujo de pago con tarjeta de crédito o débito a través de la pasarela **Stripe en modo de prueba (RN-016)**, conectado al motor de reservas con retención (**HOLD**) de 10 minutos y tarifas congeladas con descuentos:

### Arquitectura por Capas:
1. **Base de Datos & ORM (`@/lib/prisma`):**
   * Consumo del modelo `payments` existente sin alterar el esquema.
   * Registro del pago en estado `pending`, con método `card`, proveedor `stripe`, referencia del `payment_intent.id` y `total_amount` inmutable.
2. **Lógica de Negocio y Dominio (`src/features/payments/`):**
   * [`stripe-payment.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/payments/services/stripe-payment.service.ts):
     * Valida que la reserva exista y no esté pagada ni cancelada.
     * **Validación de HOLD (RN-011 / RN-016):** Si `expires_at <= now`, rechaza el pago arrojando `HoldExpiredPaymentError` (HTTP 410 Gone).
     * **Idempotencia (Doble clic / Reintento):** Detecta si ya existe un `payment` en estado `pending` con un intent activo en Stripe y reutiliza el `clientSecret` para prevenir cobros dobles o registros redundantes.
     * Genera el PaymentIntent en Stripe con monto exacto en centavos (con descuentos de HU22 ya contemplados), moneda COP/USD y metadatos de trazabilidad.
   * [`payment.errors.ts`](file:///c:/Users/User/Documents/vice-city/src/features/payments/errors/payment.errors.ts): Excepciones tipadas (`HoldExpiredPaymentError` 410, `BookingAlreadyPaidError` 409, `BookingNotFoundError` 404, `BookingCancelledError` 400, `StripePaymentError` 502).
3. **Contratos de API & Zod (`.strict()`):**
   * `POST /api/payments/create-intent`: Endpoint público validado con [`create-payment-intent.schema.ts`](file:///c:/Users/User/Documents/vice-city/src/features/payments/schemas/create-payment-intent.schema.ts).
   * Respuesta unificada `{ success, message, data?, error? }`.
4. **Componentes e Interfaz UI (Tailwind v4):**
   * [`StripeCheckoutForm.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/payments/components/StripeCheckoutForm.tsx): Formulario responsivo con modo de prueba visible (tarjeta `4242 4242 4242 4242`), bloqueo automático al expirar el HOLD y procesamiento seguro.
   * Integración en la pantalla [`src/app/(public)/checkout/[bookingId]/page.tsx`](file:///c:/Users/User/Documents/vice-city/src/app/(public)/checkout/[bookingId]/page.tsx).
   * **Desacoplamiento estricto:** El frontend NO marca la reserva como pagada; solo inicializa el cobro de Stripe.
5. **Swagger / OpenAPI 3.0:**
   * [`docs/swagger/hu23-stripe-checkout.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu23-stripe-checkout.swagger.json).

---

## 3. Criterios de Aceptación Verificados

- [x] **Se crea el pago con el monto correcto, con descuentos incluidos:** El intent de Stripe se genera por el valor exacto de la reserva congelada con descuentos aplicados.
- [x] **Caso de error: pagar una reserva con el HOLD vencido es rechazado:** Si `expires_at <= now`, se lanza `HoldExpiredPaymentError` (410) y no se realiza ninguna petición a Stripe.
- [x] **Caso límite: un doble clic o reintento del pago no genera dos cobros:** Si ya existe un intento pendiente, se consulta e idempotentemente se devuelve el `clientSecret` existente sin duplicar cobros.
- [x] **Tarjetas de crédito y débito:** Configuración con `payment_method_types: ["card"]`.
- [x] **Frontend desacoplado:** La reserva permanece en `pending` hasta que el webhook de Stripe certifique el éxito.
- [x] **Pruebas unitarias:** 5 de 5 pruebas unitarias automatizadas ejecutadas exitosamente con Node Test Runner (`npm test`).
- [x] **Zero Interference Policy:** Encapsulado estrictamente en `src/features/payments/` y `src/app/api/payments/`.

---

## 4. Instrucciones de Ejecución y Pruebas

### Pruebas Unitarias:
```bash
npm test
```

**Resultado obtenido:**
```text
▶ FT-05 / HU23: Checkout con Tarjeta (Stripe Test)
  ✔ Criterio 1: Se crea el pago con el monto correcto, con descuentos incluidos (RN-016)
  ✔ Criterio 2: Caso de error - Pagar una reserva con el HOLD vencido es rechazado (RN-011 / RN-016)
  ✔ Criterio 3: Caso de error - Pagar una reserva ya pagada o cancelada es rechazada
  ✔ Criterio 4: Caso límite - Doble clic o reintento de pago no genera dos cobros (Idempotencia)
  ✔ Criterio 5: Validación de contrato Zod con .strict()
✔ FT-05 / HU23: Checkout con Tarjeta (Stripe Test) (5 tests)
```

### Compilación y Build:
```bash
npm run build
```
*Next.js compila `/api/payments/create-intent` y la suite completa con código de salida 0.*

---

## 5. Checklist de Code Review
- [x] **Vertical Slice:** Zod `.strict()`, Servicio de Dominio, API Route, Formulario UI, Swagger y Pruebas Unitarias.
- [x] **Aislamiento:** Confinado en `src/features/payments/` y `src/app/api/payments/`.
- [x] **Calidad:** 100% de tests unitarios aprobados (20/20 en total).
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU23_STRIPE_CHECKOUT.md`.
