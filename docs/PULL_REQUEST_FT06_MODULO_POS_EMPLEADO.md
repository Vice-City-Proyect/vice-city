# 📄 Documentación de Pull Request: FT-06 Módulo POS Empleado

## 1. Información General
* **Feature:** `FT-06` — Módulo POS Empleado (SRS)
* **Historias de Usuario Incluidas:**
  * `HU25` — Venta presencial en el POS (RN-017)
  * `HU26` — Previsualización y emisión del ticket digital (RN-017, RN-019, RN-020)
* **Tipo:** Feature Completa / Full-Stack Vertical Slice (3 Capas)
* **Rama:** `feature/FT-06/modulo-pos-empleado/daniela-zapata`
* **Rama Base (Target):** `backend`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Módulo y Arquitectura en 3 Capas

La feature **FT-06** implementa el sistema integral de venta presencial en taquilla (**POS**) ubicado en `/employee/pos`. Permite al personal con rol **`TICKET_SELLER`** (o `ADMIN`) registrar ventas presenciales directas con efectivo o tarjeta, consultar en tiempo real la misma disponibilidad y aforo que la plataforma web, previsualizar fielmente el ticket antes de confirmar, y emitir tickets digitales con código QR único al portador verificado en la base de datos, dando cumplimiento estricto a las reglas de negocio **RN-001, RN-003, RN-004, RN-010, RN-012, RN-017, RN-019 y RN-020**.

### 🏗️ Arquitectura de las 3 Capas Desarrolladas:

```text
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3: INTERFAZ, RUTAS API Y CONTRATOS (ZOD .strict())    │
│  - POST /api/pos/preview                                    │
│  - POST /api/pos/sale                                       │
│  - UI: PosSaleForm, PosTicketPreviewModal, PosReceiptCard   │
│  - Vista Empleado: /employee/pos                            │
│  - Swagger OpenAPI 3.0 para Venta y Previsualización        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  CAPA 2: LÓGICA DE NEGOCIO Y DOMINIO (SERVICIOS PURIFICADOS)│
│  - PosSaleService: previewSale (cálculo puro sin mutaciones)│
│  - PosSaleService: processSale (emisión y concurrencia)     │
│  - Control de Acceso: TICKET_SELLER / ADMIN (403 Forbidden) │
│  - Horarios (RN-001), Mantenimiento (RN-003), Aforo (RN-004)│
│  - Franja Iniciada (RN-010), Desfase Aforo (409 Conflict)   │
│  - Idempotencia ante doble clic (idempotencyKey)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  CAPA 1: BASE DE DATOS Y ORM (PRISMA 6 & SUPABASE)          │
│  - Transacciones atómicas ($transaction)                    │
│  - Modelos: users (clientes POS), bookings, payments,       │
│    tickets (con QR único al portador RN-020)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Detalle por Historia de Usuario (HU)

### 📌 HU25 — Venta Presencial en el POS
* **Datos obligatorios y validación estricta:** Nombre del cliente, documento de identificación (cédula), servicio, franja horaria y cantidad, validados con esquema Zod `.strict()` sin tolerar campos ajenos (**RN-017**).
* **Métodos de pago presencial:** Soporte para pago en efectivo (`cash`) y tarjeta/datáfono (`card`).
* **Misma disponibilidad y aforo (RN-012 y RN-004):** Consulta en tiempo real las reservas activas (confirmadas y en retención HOLD válida), deduciéndolas de la capacidad del servicio.
* **Control de acceso por roles (Criterio 3):** Exclusivo para empleados con rol `TICKET_SELLER` o `ADMIN`. Cualquier otro rol recibe `ForbiddenPosAccessError` (HTTP 403 Forbidden).
* **Mantenimiento semanal (RN-003):** Bloqueo total de ventas presenciales los días lunes (o martes si el lunes es festivo colombiano) arrojando `PosMaintenanceDayError` (HTTP 422).
* **Horario oficial (RN-001):** Validación de franjas comprendidas entre las 8:00 AM y las 5:00 PM.
* **Franja ya iniciada (RN-010 / Criterio 4):** Si el cliente compra una franja horaria que ya comenzó (ej. 10:15 AM para la franja 10:00 – 11:00 AM), se cobra la hora completa y el código QR vence al terminar la franja (`valid_until = 11:00 AM`).

### 📌 HU26 — Previsualización y Emisión del Ticket Digital
* **Previsualización 1:1 (`previewSale`):** Muestra el resumen completo antes de emitir: nombre del cliente, cédula, servicio, franja horaria, cantidad, precio unitario, total, moneda, método de pago y aforo disponible, sin realizar escrituras ni mutaciones en base de datos.
* **Emisión con QR único al portador (RN-019 y RN-020):** Al confirmar, genera la reserva confirmada, el registro de pago y el ticket digital con un código criptográfico alfanumérico seguro persistido y validable contra la base de datos.
* **Protección contra desfase de aforo (Criterio 3):** Si el aforo cambia entre la previsualización y la confirmación y los cupos restantes no son suficientes, la venta es rechazada con `PosAvailabilityChangedError` (HTTP 409 Conflict) con mensaje claro para el cajero.
* **Idempotencia contra doble clic (Criterio 4):** El uso de `idempotencyKey` vinculado al `previewId` evita que clics repetidos generen cobros o tickets duplicados, retornando el ticket ya emitido con la bandera `isReused: true`.

---

## 4. Endpoints y Contratos API Desarrollados

### 1. `POST /api/pos/preview`
* **Descripción:** Genera el borrador/cálculo previo del ticket para revisión en taquilla sin mutar la base de datos.
* **Payload:**
```json
{
  "sellerId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
  "clientName": "Carlos Gómez",
  "clientId": "1020304050",
  "serviceId": "b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e",
  "startAt": "2026-10-15T10:00:00-05:00",
  "endAt": "2026-10-15T11:00:00-05:00",
  "quantity": 2,
  "paymentMethod": "cash"
}
```
* **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "message": "Previsualización del ticket generada exitosamente",
  "data": {
    "previewId": "8f9a2b1c4e7d5a3f",
    "sellerId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    "sellerName": "Daniela Taquillera",
    "clientName": "Carlos Gómez",
    "clientId": "1020304050",
    "serviceId": "b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e",
    "serviceName": "Piscina Adultos",
    "startAt": "2026-10-15T15:00:00.000Z",
    "endAt": "2026-10-15T16:00:00.000Z",
    "quantity": 2,
    "unitPrice": 5000,
    "totalAmount": 10000,
    "currency": "COP",
    "paymentMethod": "cash",
    "availableCapacity": 48,
    "isStartedSlotPurchased": false,
    "expiresAtEndOfSlot": "2026-10-15T16:00:00.000Z"
  }
}
```

### 2. `POST /api/pos/sale`
* **Descripción:** Confirma la venta presencial, registra cliente, reserva y pago, y emite el ticket con su QR único.
* **Payload:** Mismos campos que la previsualización más opcionales `previewAvailableCapacity` e `idempotencyKey`.
* **Respuesta Exitosa (201 Created):**
```json
{
  "success": true,
  "message": "Venta presencial registrada exitosamente y ticket generado",
  "data": {
    "bookingId": "c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f",
    "ticketId": "d5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a",
    "ticketCode": "E9A8C7B6D5E4F3A2B1C0",
    "paymentId": "e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b",
    "amount": 10000,
    "currency": "COP",
    "clientName": "Carlos Gómez",
    "clientId": "1020304050",
    "serviceName": "Piscina Adultos",
    "startAt": "2026-10-15T15:00:00.000Z",
    "endAt": "2026-10-15T16:00:00.000Z",
    "quantity": 2,
    "paymentMethod": "cash",
    "status": "confirmed",
    "sellerId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    "isStartedSlotPurchased": false,
    "qrPayload": {
      "ticketCode": "E9A8C7B6D5E4F3A2B1C0",
      "bookingId": "c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f",
      "validFrom": "2026-10-15T15:00:00.000Z",
      "validUntil": "2026-10-15T16:00:00.000Z"
    }
  }
}
```

---

## 5. Pruebas Automatizadas y Verificación

### Ejecución de la Suite Completa:
```bash
npm test
```

### Resultados Obtenidos (34 tests en 7 suites pasando al 100%):
```text
▶ FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios (5 tests)
✔ FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios (48ms)
▶ FT-04 / HU22: Descuentos y Promociones Oficiales (5 tests)
✔ FT-04 / HU22: Descuentos y Promociones Oficiales (53ms)
▶ FT-05 / HU23: Checkout con Tarjeta (Stripe Test) (5 tests)
✔ FT-05 / HU23: Checkout con Tarjeta (Stripe Test) (44ms)
▶ FT-05 / HU24: Webhook de Stripe y Confirmación de Tickets (5 tests)
✔ FT-05 / HU24: Webhook de Stripe y Confirmación de Tickets (37ms)
▶ FT-06 / HU26: Previsualización y Emisión del Ticket Digital en POS (5 tests)
  ✔ Criterio 1: La previsualización coincide exactamente 1:1 con lo que se va a emitir
  ✔ Criterio 2: Al confirmar se emite un ticket con QR único al portador (RN-019, RN-020)
  ✔ Criterio 3: Caso de error - Confirmar una previsualización cuya disponibilidad cambió es rechazado con mensaje claro (409)
  ✔ Criterio 4: Caso límite - Confirmar dos veces la misma venta (doble clic / idempotencia) no genera dos tickets
  ✔ Validaciones de esquema Zod para Previsualización (posPreviewSchema)
✔ FT-06 / HU26: Previsualización y Emisión del Ticket Digital en POS (178ms)
▶ FT-06 / HU25: Venta Presencial en el POS (Módulo Empleado) (4 tests)
  ✔ Criterio 1: Una venta completa genera la reserva pagada y el ticket (RN-017)
  ✔ Criterio 2: Caso de error - Faltan datos obligatorios, no hay cupo o es lunes de mantenimiento
  ✔ Criterio 3: Caso de error - Un usuario sin rol TICKET_SELLER recibe 403 (RN-017)
  ✔ Criterio 4: Caso límite - Venta en una franja ya iniciada cobra la hora completa y el QR vence al final de la franja (RN-010)
✔ FT-06 / HU25: Venta Presencial en el POS (Módulo Empleado) (124ms)
▶ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos (5 tests)
✔ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos (48ms)

ℹ tests 34
ℹ suites 7
ℹ pass 34
ℹ fail 0
```

### Compilación y Build:
```bash
npm run build
```
*Compilado exitoso con código de salida 0.*

---

## 6. Documentación Swagger OpenAPI 3.0
* `docs/swagger/hu25-pos-sale.swagger.json`
* `docs/swagger/hu26-pos-preview-ticket.swagger.json`

