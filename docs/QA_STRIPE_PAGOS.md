# QA Report — Pagos con Stripe (HU28)

Jira: HU28 — auditoría integral de la pasarela de pagos. Relacionados: VCP-82 (secretos de respaldo de Stripe), VCP-79 (flujo de reserva del cliente), VCP-93 (listado de reservas).

Fecha de la prueba: 14 de octubre de 2026 (hora de Bogotá).
Entorno: Stripe **modo test** (clave `sk_test_`, sin cobros reales), servidor local `localhost:3000`, base de datos de Supabase compartida.

> Esta es una verificación hecha por quien implementó las correcciones. La revisión QA independiente sigue siendo necesaria.

## Functionality tested

Flujo completo: reserva → HOLD de 10 minutos → sesión de Stripe Checkout → pago → webhook → confirmación (pago, reserva y ticket).

Archivos principales del cambio:

- `src/features/payments/services/webhook.service.ts`
- `src/features/payments/services/stripe.client.ts` y `src/features/payments/lib/stripe.config.ts`
- `src/features/payments/services/checkout.service.ts`
- `src/app/api/payments/create-intent/route.ts`
- `src/app/api/reservations/hold/route.ts`
- `src/app/cliente/reservar/page.tsx`
- `src/features/auth/permissions/route-permissions.ts`

## Acceptance criteria

- [x] Se crea una sesión de Stripe válida con el monto correcto en pesos colombianos (centavos = pesos × 100).
- [x] El cliente no puede manipular precio, duración, descuento ni monto desde el navegador.
- [x] El pago solo se confirma por el webhook; regresar de Stripe a la página de éxito no confirma nada.
- [x] El webhook rechaza firmas inválidas o cuerpos alterados.
- [x] El webhook es idempotente: eventos repetidos no duplican pagos ni tickets (pago exitoso, pago en revisión y sesión expirada).
- [x] Un pago rechazado, abandonado o con sesión expirada no confirma la reserva.
- [x] Un pago con el HOLD vencido no confirma la reserva ni se reembolsa automáticamente (RN-018).
- [x] El monto cobrado por Stripe se compara con el total de la reserva antes de confirmar.
- [x] Una reserva confirmada conserva el precio y el descuento aplicados originalmente.
- [x] Un fallo del proveedor de correo no hace fallar el webhook ni revierte el pago ya confirmado.
- [ ] Entrega del webhook directamente por Stripe (no se probó: no hay Stripe CLI ni URL pública configuradas).
- [ ] Envío real del correo de confirmación (Resend en modo prueba solo envía a la cuenta de Jandy hasta verificar un dominio).

## Tests executed

### Automáticas

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npm run lint` (el del CI) | 0 errores (254 advertencias que ya existían) |
| `npm test` | **486 de 486** en verde (459 al inicio) |
| `npx next build` | Compila correctamente |

Las pruebas del webhook usan un mock de base de datos que **replica las restricciones CHECK y la restricción única reales** de Supabase (`payments_method_valid`, `payments_status_valid`, `bookings_status_valid` y `(provider, provider_reference)`). Se comprobó que las pruebas nuevas **fallan contra el código anterior** y pasan con el corregido.

### Manuales, en vivo contra Stripe test y la base real

#### Prueba 1 — Tarifas y descuento

Scenario: crear una reserva de la Cancha Múltiple, miércoles, 16:00–17:00.
Steps: `POST /api/reservations` con la sesión de un cliente.
Expected: precio base 70.000, descuento del 20 % del miércoles, total 56.000, estado `pending`, HOLD de 10 minutos.
Actual: 201, base 70.000, descuento 20 % (14.000), total 56.000, `pending`, vencimiento a los 10 minutos exactos.
Result: **PASS**. Las 9 tarifas de la base coinciden con las reglas de negocio (piscinas y gimnasio 2.000, zona húmeda 4.000, canchas 140.000, 80.000 y 70.000).

#### Prueba 2 — Monto enviado a Stripe

Scenario: crear sesiones de Checkout con distintos totales.
Steps: `createStripeCheckoutSession` con 1.000, 2.000, 4.000 y 140.000 COP.
Expected: Stripe interpreta el monto en centavos.
Actual: 4.000 → `amount_total` 400000; 140.000 → 14000000; 2.000 → aceptado; 1.000 → rechazado por el mínimo de cobro de Stripe. Con el código anterior (sin ×100), 4.000 COP se rechazaba (`$40.00 COP converts to approximately $0.01 USD`).
Result: **PASS**.

#### Prueba 3 — Firma del webhook

Scenario: validar la firma con el secreto configurado.
Steps: evento firmado válido, evento con el cuerpo alterado y firma falsa.
Expected: solo el válido se acepta.
Actual: válido aceptado; cuerpo alterado y firma falsa rechazados (HTTP 400).
Result: **PASS**.

#### Prueba 4 — Tarjeta rechazada (caso A)

Scenario: pagar con la tarjeta de prueba `4000 0000 0000 0002`.
Expected: Stripe rechaza, la reserva sigue `pending`, sin pago ni ticket.
Actual: Stripe mostró "Se rechazó tu tarjeta"; sesión `open`/`unpaid`; en la base, reserva `pending`, 0 pagos, 0 tickets.
Result: **PASS**.

#### Prueba 5 — Pago tardío con el HOLD vencido (caso B)

Scenario: pagar con `4242 4242 4242 4242` unos 18 minutos después de vencer la retención.
Steps: reenviar al webhook el evento `checkout.session.completed` firmado.
Expected: la reserva no se confirma, no hay ticket, el cobro queda registrado para revisión y no se reembolsa automáticamente.
Actual: HTTP 200 con `confirmed: false`, `HOLD_EXPIRED`; reserva `pending`; cobro `processing` (64.000 COP, `card`); 0 tickets; **0 reembolsos en Stripe**; el reenvío respondió `ALREADY_RECORDED` sin duplicar. El cupo quedó `AVAILABLE`.
Result: **PASS** (con la decisión de negocio pendiente descrita abajo).

#### Prueba 6 — Camino feliz desde la interfaz (caso C)

Scenario: reservar con el botón de la pantalla, pagar y confirmar.
Steps: `/cliente/reservar` → Reservar → `/checkout/[id]` → botón de pago → página de Stripe → tarjeta `4242` → webhook firmado.
Expected: reserva `confirmed`, pago `approved`, ticket `valid`.
Actual: redirección correcta al checkout (temporizador 09:56, total 112.000 con el 20 %); Stripe cobró 11.200.000 centavos; tras el webhook: reserva `confirmed`, pago `approved` (`card`, 112.000), ticket `valid` de 15:00 a 16:00; cuerpo alterado → 400; reenvío → 200 `ALREADY_CONFIRMED` sin duplicar.
Result: **PASS**.

#### Prueba 7 — Abandono (caso D)

Scenario: crear la reserva y la sesión de pago, no pagar, expirar la sesión.
Steps: expirar la sesión en Stripe y reenviar `checkout.session.expired` firmado, dos veces.
Expected: reserva `expired`, pago `failed`, sin ticket; el reenvío no falla.
Actual: reserva `expired`, un pago `failed`, 0 tickets. **El reenvío respondió 500** (insertaba el mismo pago dos veces y la base lo rechaza por la restricción única); se corrigió y, tras el arreglo, ambos envíos respondieron 200 sin duplicados.
Result: **PASS** tras la corrección.

## Business rules verified

- RN-011 / RN-016: HOLD de exactamente 10 minutos y pago con tarifa congelada (con descuento incluido).
- RN-018: sin reembolsos en el MVP. Un cobro que no se puede confirmar queda en revisión manual; Stripe nunca recibe una orden de devolución.
- RN-019: el ticket se emite únicamente cuando el pago se confirma.
- Descuento del miércoles (20 %): aplicado y no acumulable con el de piscina completa (cubierto por `pricing.test.mjs`).
- Precio histórico: la reserva conserva el monto con el que se creó.

## Evidence

- Salida de `npm test`: 486 pruebas, 486 aprobadas.
- Respuestas HTTP del webhook en las pruebas 3 a 7 (códigos y razones citados arriba).
- Estado de la base de datos antes y después de cada envío (reserva, pagos y tickets).
- Datos de Stripe test (sesión `paid`/`unpaid`/`expired`, monto y reembolsos).
- Capturas: pantalla de Stripe con la tarjeta rechazada (prueba 4).

## Problems found

Corregidos en este cambio:

1. **CRÍTICO** — El webhook escribía `method = 'STRIPE'` y `status = 'SUCCEEDED' | 'FAILED'`, valores que las restricciones CHECK de la base rechazan. Ningún pago podía confirmarse.
2. **ALTO** — Los reportes solo cuentan pagos `approved`; las ventas web no habrían aparecido en las métricas.
3. **ALTO** — La sesión de Checkout enviaba pesos sin multiplicar por 100 (Stripe trata el COP con dos decimales).
4. **ALTO** — El webhook no comparaba lo cobrado por Stripe con el total de la reserva.
5. **ALTO** — `/api/payments/create-intent` era público, sin sesión ni propiedad de la reserva.
6. **ALTO** — `/api/reservations/hold` era público y tomaba el `userId` del cuerpo de la solicitud.
7. **ALTO** — `/cliente/reservar` enviaba un `userId` falso fijo: ninguna reserva desde la pantalla funcionaba, y tras reservar no había forma de llegar al pago.
8. **MEDIO** — Dos entregas simultáneas del mismo evento podían duplicar pago y ticket (ahora la confirmación es atómica).
9. **MEDIO** — Un fallo del proveedor de correo hacía responder 500 después de confirmar el pago (Stripe reintentaría sin fin).
10. **MEDIO** — El reenvío de `checkout.session.expired` respondía 500.
11. **MEDIO** — Los errores de Stripe al crear la sesión devolvían un 500 genérico.

### Unrelated issue detected (no se corrigieron)

Location: `src/features/payments/services/checkout.service.ts` (descripción del producto).
Problem: la descripción que ve el cliente en la página de Stripe muestra la fecha en formato ISO crudo (`2026-10-14T21:00:00.000Z`).
Evidence: captura de la página de pago.
Suggested future task: formatear la fecha en hora de Bogotá.

Location: `src/app/cliente/reservas/page.tsx` (y la página de éxito del pago).
Problem: usa datos de ejemplo; el cliente no ve su reserva real tras pagar.
Suggested future task: VCP-93.

Location: precios del miércoles.
Problem: una hora de piscina o gimnasio para una persona vale 1.600 COP con el 20 %, por debajo del mínimo de cobro de Stripe (unos 2.000 COP); ese pago no se puede iniciar.
Suggested future task: decisión de negocio (compra mínima, o solo venta presencial).

Location: `src/app/cliente/reservar/page.tsx`.
Problem: la fecha inicial se calcula con `toISOString()` (UTC); después de las 7:00 p. m. de Bogotá propone el día siguiente.
Suggested future task: calcular la fecha con la zona America/Bogota.

Location: `/api/reservations/[id]` (consulta por UUID, pública para el checkout).
Problem: quien conozca el UUID de una reserva puede ver sus datos.
Suggested future task: validar la propiedad de la reserva en esa consulta.

Location: configuración de correo (Resend).
Problem: solo envía a la cuenta del propietario de la cuenta de Resend mientras no se verifique un dominio.
Suggested future task: verificar un dominio y cambiar el remitente.

## Decisiones de negocio pendientes

- **Pago recibido con el HOLD vencido:** hoy el cliente paga y no recibe reserva; el cobro queda en `processing` para revisión manual (sin reembolso automático, RN-018). El diseño original (FT-05) describía rescatar la reserva si el cupo sigue libre. El dueño del negocio debe decidir cuál de los dos comportamientos quiere.

## Datos de prueba que quedaron en la base compartida

Cuatro reservas del cliente de pruebas para el 14 de octubre (dos confirmadas con ticket, una `expired` y una `pending` con un cobro `processing`). No se borró nada: en el MVP no hay cancelaciones ni reembolsos, así que la limpieza debe hacerla quien administre la base.

## Recommendation

APPROVE para los cambios de este PR: los criterios verificables pasan, las reglas de negocio relevantes se respetan y las pruebas están en verde. Las observaciones anteriores (entrega real del webhook por Stripe, envío real del correo y las decisiones de negocio) no bloquean el cambio, pero deben revisarse antes de salir a producción.
