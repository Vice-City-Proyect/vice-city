# 📄 Documentación de Pull Request: FT-06 / HU25 Venta Presencial en el POS

## 1. Información General
* **Jira Tarea:** `HU25` — Venta presencial en el POS (FT-06 Módulo POS Empleado)
* **Tipo:** Feature Full-Stack / Vertical Slice
* **Rama:** `feature/HU25/venta-pos/daniela-zapata`
* **Rama Base:** `feature/FT-05/pagos-stripe-webhook/daniela-zapata`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado (Vertical Slice)
Se implementó el punto de venta presencial (**POS**) en `/employee/pos` para que el personal de taquilla con rol **`TICKET_SELLER`** (o `ADMIN`) registre compras directas en efectivo o tarjeta con datáfono, dando cumplimiento a las reglas de negocio **RN-001, RN-003, RN-004, RN-010, RN-012 y RN-017**:

### Arquitectura por Capas:
1. **Base de Datos & ORM (`@/lib/prisma`):**
   * Transacciones atómicas con `prisma.$transaction` que en un único paso consistente:
     1. Crean o vinculan el registro del cliente presencial en `users`.
     2. Crean la reserva directamente en estado `confirmed` (sin requerir retención HOLD).
     3. Registran el cobro en `payments` con `status: "paid"`, `paid_at: now()`, `method: "cash" | "card"` y proveedor `pos_terminal`.
     4. Emiten el ticket digital en `tickets` con código QR criptográfico seguro y validez horaria.
2. **Lógica de Negocio y Dominio (`src/features/pos/`):**
   * [`pos-sale.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/services/pos-sale.service.ts):
     * **Control de acceso por roles (Criterio 3):** Valida que el empleado posea el rol `TICKET_SELLER` o `ADMIN`. Cualquier otro rol (`CLIENT`, `QR_VALIDATOR` o ausente) es rechazado inmediatamente con `ForbiddenPosAccessError` (HTTP 403 Forbidden).
     * **Misma fuente de verdad (RN-012):** Consulta y valida el mismo aforo restante y disponibilidad horaria que la plataforma web.
     * **Mantenimiento semanal (RN-003):** Bloquea ventas en lunes de mantenimiento (o martes posterior a festivo) arrojando `PosMaintenanceDayError` (HTTP 422).
     * **Horario operativo (RN-001):** Valida que la franja esté comprendida entre las 8:00 AM y las 5:00 PM.
     * **Franja ya iniciada (RN-010 / Criterio 4):** Si el cliente llega a taquilla cuando la franja horaria ya inició (ej. 10:20 AM para la franja 10:00 – 11:00 AM), permite la compra cobrando la tarifa completa de la hora y garantiza que el ticket QR venza exactamente al final de la franja horaria (`valid_until: 11:00 AM`).
   * [`pos.errors.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/errors/pos.errors.ts): Excepciones tipadas (`ForbiddenPosAccessError` 403, `PosCapacityExceededError` 409, `PosMaintenanceDayError` 422, `PosServiceNotFoundError` 404, `PosOperatingHoursError` 400, `PosPastSlotError` 400).
   * [`pos.types.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/types/pos.types.ts): Tipos TypeScript para ventas en taquilla, métodos de pago y comprobante.
3. **Contratos de API & Zod (`.strict()`):**
   * Endpoint `POST /api/pos/sale`: Validado rigurosamente mediante [`pos-sale.schema.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/schemas/pos-sale.schema.ts) con `.strict()` para rechazar payloads con campos no autorizados o datos faltantes.
4. **Componentes e Interfaz UI (Tailwind v4):**
   * [`PosSaleForm.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/pos/components/PosSaleForm.tsx): Formulario responsivo y rápido para el cajero en taquilla, con cálculo automático de totales y selección de método de pago (Efectivo 💵 / Tarjeta 💳).
   * [`PosReceiptCard.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/pos/components/PosReceiptCard.tsx): Comprobante de venta presencial con visualización del ticket QR generado para entregar al cliente.
   * Página pública/empleado: [`src/app/employee/pos/page.tsx`](file:///c:/Users/User/Documents/vice-city/src/app/employee/pos/page.tsx).
5. **Swagger / OpenAPI 3.0:**
   * [`docs/swagger/hu25-pos-sale.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu25-pos-sale.swagger.json).

---

## 3. Criterios de Aceptación Verificados

- [x] **Una venta completa genera la reserva pagada y el ticket:** Genera atómicamente la reserva confirmada, pago marcado como `paid` y el ticket digital con código QR seguro.
- [x] **Caso de error: Faltan datos obligatorios, no hay cupo o es lunes de mantenimiento:**
  - Faltan datos obligatorios: Zod responde con 400 Bad Request.
  - No hay cupo: Lanza `PosCapacityExceededError` (409 Conflict).
  - Lunes de mantenimiento: Lanza `PosMaintenanceDayError` (422 Unprocessable Entity).
- [x] **Caso de error: Usuario sin rol TICKET_SELLER recibe 403:** Se valida el rol del vendedor; roles no autorizados reciben `ForbiddenPosAccessError` (403 Forbidden).
- [x] **Caso límite: Venta en una franja ya iniciada cobra la hora completa y el QR vence al final de la franja (RN-010):** Se cobra la tarifa completa de la hora y `valid_until` se fija con precisión al término de la franja.
- [x] **Pruebas unitarias:** 4 de 4 pruebas unitarias automatizadas ejecutadas exitosamente con Node Test Runner (`npm test`).
- [x] **Zero Interference Policy:** Confinado limpiamente en `src/features/pos/`, `src/app/api/pos/` y `src/app/employee/pos/`.

---

## 4. Instrucciones de Ejecución y Pruebas

### Pruebas Unitarias:
```bash
npm test
```

**Resultado obtenido:**
```text
▶ FT-06 / HU25: Venta Presencial en el POS (Módulo Empleado)
  ✔ Criterio 1: Una venta completa genera la reserva pagada y el ticket (RN-017)
  ✔ Criterio 2: Caso de error - Faltan datos obligatorios, no hay cupo o es lunes de mantenimiento
  ✔ Criterio 3: Caso de error - Un usuario sin rol TICKET_SELLER recibe 403 (RN-017)
  ✔ Criterio 4: Caso límite - Venta en una franja ya iniciada cobra la hora completa y el QR vence al final de la franja (RN-010)
✔ FT-06 / HU25: Venta Presencial en el POS (Módulo Empleado) (4 tests)
```

### Compilación y Build:
```bash
npm run build
```
*Next.js compila `/employee/pos`, `/api/pos/sale` y toda la suite con código de salida 0.*

---

## 5. Checklist de Code Review
- [x] **Vertical Slice:** Zod `.strict()`, Servicio de Dominio POS, API Route, Formulario y Comprobante UI, Swagger y Pruebas Unitarias.
- [x] **Aislamiento:** Confinado en `src/features/pos/` y `src/app/api/pos/`.
- [x] **Calidad:** 100% de tests unitarios aprobados (29/29 en total).
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU25_VENTA_POS.md`.
