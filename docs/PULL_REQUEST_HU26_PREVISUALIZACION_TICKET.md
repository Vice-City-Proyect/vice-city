# 📄 Documentación de Pull Request: FT-06 / HU26 Previsualización y Emisión del Ticket Digital POS

## 1. Información General
* **Jira Tarea:** `HU26` — Previsualización y emisión del ticket digital (FT-06 Módulo POS Empleado)
* **Tipo:** Feature Full-Stack / Vertical Slice
* **Rama:** `feature/HU26/previsualizacion-ticket/daniela-zapata`
* **Rama Base:** `feature/HU25/venta-pos/daniela-zapata`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado (Vertical Slice)
Se implementó el flujo de previsualización fiel del ticket digital antes de confirmar la venta en el módulo POS presencial (`/employee/pos`), así como su emisión con código QR único al portador validado en base de datos al confirmar, dando cumplimiento a **RN-017, RN-019 y RN-020**:

### Arquitectura por Capas:
1. **Lógica de Negocio y Dominio (`src/features/pos/`):**
   * [`pos-sale.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/services/pos-sale.service.ts):
     * **Previsualización pura (`previewSale`):** Calcula tarifas, valida aforos, horarios y mantenimiento sin generar mutaciones en la base de datos. Genera un `previewId` criptográfico y retorna todos los datos exactos del ticket proyectado.
     * **Confirmación atómica (`processSale`):** Emite el ticket con código QR seguro al portador verificado en la base de datos (`RN-020`).
     * **Validación de desfase de aforo (Criterio 3):** Si entre la previsualización y la confirmación otro usuario o canal ocupó el aforo restante, se rechaza la venta con `PosAvailabilityChangedError` (HTTP 409 Conflict) indicando el cambio en el aforo disponible.
     * **Idempotencia y prevención de doble clic (Criterio 4):** Si el cajero hace doble clic o reenvía la venta con el mismo `idempotencyKey` (`previewId`), el servicio detecta la reserva existente y retorna el ticket ya emitido sin duplicar registros (`isReused: true`).
   * [`pos.errors.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/errors/pos.errors.ts): Se incorporó `PosAvailabilityChangedError` (409 Conflict).
   * [`pos.types.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/types/pos.types.ts): Definiciones completas de `PosPreviewParams`, `PosPreviewResult` y extensiones a `CreatePosSaleParams` (`previewAvailableCapacity`, `idempotencyKey`).
2. **Contratos de API & Zod (`.strict()`):**
   * Endpoint `POST /api/pos/preview`: Validado con [`pos-preview.schema.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pos/schemas/pos-preview.schema.ts) con `.strict()`.
   * Endpoint `POST /api/pos/sale`: Actualizado para procesar `previewAvailableCapacity` e `idempotencyKey` y mapear `PosAvailabilityChangedError` con código HTTP 409.
3. **Componentes e Interfaz UI (Tailwind v4):**
   * [`PosTicketPreviewModal.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/pos/components/PosTicketPreviewModal.tsx): Modal interactivo que muestra la previsualización del ticket con cliente, documento, franja, cantidad, total y método de pago antes de emitirlo.
   * [`PosSaleForm.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/pos/components/PosSaleForm.tsx): Adaptado para ejecutar el flujo Previsualizar -> Modal de Revisión -> Confirmar y Emitir Ticket con QR.
4. **Swagger / OpenAPI 3.0:**
   * [`docs/swagger/hu26-pos-preview-ticket.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu26-pos-preview-ticket.swagger.json): Especificación del endpoint `/api/pos/preview`.
5. **Pruebas Automatizadas:**
   * [`tests/unit/pos.preview.test.mjs`](file:///c:/Users/User/Documents/vice-city/tests/unit/pos.preview.test.mjs): 5 pruebas unitarias con Node Test Runner cubriendo los 4 criterios de aceptación y validaciones Zod.

---

## 3. Criterios de Aceptación Verificados

- [x] **La previsualización coincide con lo que se va a emitir:** `previewSale` proyecta los mismos datos de cliente, documento, servicio, franja, tarifa, cantidad y total que `processSale` emite.
- [x] **Al confirmar se emite un ticket con QR único:** Al confirmar la venta se genera el ticket con código seguro persistido en base de datos (`RN-019`, `RN-020` al portador).
- [x] **Caso de error: Confirmar una previsualización cuya disponibilidad cambió es rechazado con mensaje claro:** Lanza `PosAvailabilityChangedError` con código HTTP 409 y mensaje explícito de aforo desfasado.
- [x] **Caso límite: Confirmar dos veces la misma venta no genera dos tickets:** Mediante la clave de idempotencia (`idempotencyKey`), la segunda invocación devuelve el ticket existente sin duplicar ventas ni tickets (`isReused: true`).
- [x] **Pruebas unitarias:** 5 pruebas automatizadas ejecutadas y aprobadas al 100% con `npm test`.
- [x] **Zero Interference Policy:** Respeto absoluto a la arquitectura modular del proyecto.

---

## 4. Instrucciones de Ejecución y Pruebas

### Pruebas Unitarias:
```bash
npm test
```

**Resultado obtenido:**
```text
▶ FT-06 / HU26: Previsualización y Emisión del Ticket Digital en POS
  ✔ Criterio 1: La previsualización coincide exactamente 1:1 con lo que se va a emitir (130ms)
  ✔ Criterio 2: Al confirmar se emite un ticket con QR único al portador (RN-019, RN-020) (9ms)
  ✔ Criterio 3: Caso de error - Confirmar una previsualización cuya disponibilidad cambió es rechazado con mensaje claro (409) (6ms)
  ✔ Criterio 4: Caso límite - Confirmar dos veces la misma venta (doble clic / idempotencia) no genera dos tickets (4ms)
  ✔ Validaciones de esquema Zod para Previsualización (posPreviewSchema) (14ms)
✔ FT-06 / HU26: Previsualización y Emisión del Ticket Digital en POS (5 tests)
```

### Compilación y Build:
```bash
npm run build
```
*Compilación limpia con código de salida 0 y rutas `/api/pos/preview` y `/api/pos/sale` generadas exitosamente.*

---

## 5. Checklist de Revisión de Código (Code Review)
- [x] Arquitectura de capas limpia y separada (`services`, `schemas`, `errors`, `types`, `components`, `app/api`).
- [x] Contratos OpenAPI / Swagger documentados.
- [x] Esquemas Zod estrictos con `.strict()`.
- [x] Sin mutaciones accidentales en endpoints de previsualización.
- [x] Integridad transaccional y control de concurrencia e idempotencia en la emisión de tickets.
- [x] 100% de pruebas unitarias exitosas (34/34 tests en toda la aplicación).

