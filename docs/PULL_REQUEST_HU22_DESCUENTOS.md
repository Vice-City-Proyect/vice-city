# 📄 Documentación de Pull Request: FT-04 / HU22 Descuentos y Promociones

## 1. Información General
* **Jira Tarea:** `HU22` — Descuentos y promociones (FT-04 Motor de Reservas & HOLD)
* **Tipo:** Feature Full-Stack / Vertical Slice
* **Rama:** `feature/HU22/descuentos/daniela-zapata`
* **Rama Base:** `feature/HU21/reserva-hold/daniela-zapata`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado (Vertical Slice)
Se implementó el motor de cálculo de precios y aplicación automática de promociones y descuentos oficiales de Vice City, dando estricto cumplimiento a las reglas de negocio **RN-013, RN-014 y RN-015**:
* **Miércoles (RN-013):** 20% de descuento automático en cualquier reserva cuya fecha corresponda a un miércoles.
* **Reserva Completa de Piscina (RN-014):** 20% de descuento cuando se bloquea el aforo total (50 cupos) de piscina durante toda la jornada operativa (8:00 AM - 5:00 PM) con hasta 20 días de antelación.
* **Días Restringidos para Piscina Completa (RN-014):** Prohibición estricta de reservar la piscina completa los viernes, sábados, domingos y lunes festivos en Colombia (calculados dinámicamente con la Ley Emiliani). Si se intenta, se rechaza la solicitud arrojando un error tipado de dominio `FullPoolDayRestrictedError` (422 Unprocessable Entity).
* **No Acumulables (RN-015):** Los descuentos nunca se suman ni combinan; si una reserva califica para ambos beneficios (ej. reserva completa de piscina un miércoles), se aplica únicamente un solo descuento del 20%, garantizando que nunca se otorgue un 40%.

### Arquitectura por Capas:
1. **Lógica de Negocio y Dominio (`src/features/pricing/`):**
   * [`discount-calculator.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pricing/services/discount-calculator.service.ts):
     * Evalúa el día de la semana y festivos colombianos usando `isColombianHoliday`.
     * Valida si el día está prohibido para reserva completa de piscina según RN-014.
     * Calcula la tarifa base: `horas * cupos * tarifa_hora`.
     * Aplica la regla de no acumulación (RN-015) fijando el descuento máximo en 20%.
   * [`discount.errors.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pricing/errors/discount.errors.ts): Excepciones de dominio tipadas (`PricingError`, `FullPoolDayRestrictedError` con código HTTP 422).
   * [`discount.types.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pricing/types/discount.types.ts): Definiciones TypeScript exhaustivas (`DiscountType`, `PricingCalculationParams`, `PricingCalculationResult`).
2. **Contratos de API & Zod (`.strict()`):**
   * `POST /api/pricing/calculate`: Endpoint público que recibe los parámetros de reserva y devuelve el desglose de tarifas con descuentos aplicados.
   * [`pricing.schema.ts`](file:///c:/Users/User/Documents/vice-city/src/features/pricing/schemas/pricing.schema.ts): Validación con Zod en modo `.strict()` para rechazar payloads con campos inesperados.
   * Respuestas unificadas con el estándar `{ success, message, data?, error? }`.
3. **Swagger / OpenAPI 3.0:**
   * [`docs/swagger/hu22-discounts.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu22-discounts.swagger.json).
4. **Componentes e Interfaz UI (Tailwind v4):**
   * [`DiscountBadge.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/pricing/components/DiscountBadge.tsx): Chip estilizado que destaca visualmente el tipo de promoción aplicado (-20% Miércoles o -20% Piscina Completa).
   * [`PricingBreakdown.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/pricing/components/PricingBreakdown.tsx): Desglose monetario completo en formato COP (Precio original, Descuento aplicado con porcentaje y total final).

---

## 3. Criterios de Aceptación Verificados

- [x] **Una reserva de miércoles recibe el 20%:** Al reservar un miércoles, el sistema calcula y descuenta automáticamente el 20% del valor total.
- [x] **Una reserva completa de piscina con 20 días de antelación recibe el 20%:** Al seleccionar piscina completa para un día habilitado, recibe el 20% de descuento.
- [x] **Caso de error: una reserva completa de piscina en un día prohibido es rechazada:** Rechazada con `FullPoolDayRestrictedError` (422) si se solicita un viernes, sábado, domingo o lunes festivo.
- [x] **Caso límite: una reserva que cumple los dos casos recibe un solo descuento de 20%, no 40%:** La regla de no acumulación (RN-015) asegura que el descuento aplicado sea exactamente 20%.
- [x] **Pruebas unitarias de la lógica:** 5 de 5 pruebas automatizadas ejecutadas exitosamente con Node Test Runner (`npm test`).
- [x] **Zero Interference Policy:** Ningún archivo ajeno fue modificado; el motor se encapsula limpiamente en `src/features/pricing/` y `src/app/api/pricing/`.

---

## 4. Instrucciones de Ejecución y Pruebas

### Pruebas Unitarias:
```bash
npm test
```

**Resultado obtenido:**
```text
▶ FT-04 / HU22: Descuentos y Promociones Oficiales
  ✔ Criterio 1: Una reserva de miércoles recibe automáticamente el 20% de descuento (RN-013) (23.2822ms)
  ✔ Criterio 2: Una reserva completa de piscina recibe el 20% de descuento (RN-014) (0.9103ms)
  ✔ Criterio 3: Caso de error - Una reserva completa de piscina en día prohibido es rechazada (RN-014) (3.9155ms)
  ✔ Criterio 4: Caso límite - Reserva que cumple los dos casos recibe un solo descuento de 20%, nunca 40% (RN-015) (1.2185ms)
  ✔ Día normal sin promoción: Aplica tarifa completa sin descuento (1.6434ms)
✔ FT-04 / HU22: Descuentos y Promociones Oficiales (34.8128ms)
ℹ tests 5
ℹ suites 1
ℹ pass 5
ℹ fail 0
```

### Compilación y Build:
```bash
npm run build
```
*Next.js compila el endpoint `/api/pricing/calculate` y la suite completa con código de salida 0 sin advertencias de tipos.*

---

## 5. Checklist de Code Review
- [x] **Vertical Slice:** Zod `.strict()`, Servicio de Dominio, API Route, Componentes UI, Swagger y Pruebas Unitarias.
- [x] **Aislamiento:** Confinado en `src/features/pricing/` y `src/app/api/pricing/`.
- [x] **Calidad:** 100% de tests unitarios aprobados.
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU22_DESCUENTOS.md`.
