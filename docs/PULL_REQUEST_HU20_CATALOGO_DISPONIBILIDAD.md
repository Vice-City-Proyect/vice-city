# 📄 Documentación de Pull Request: FT-04 / HU20 Catálogo y Disponibilidad de Servicios

## 1. Información General
* **Jira Tarea:** `HU20` — Catálogo y disponibilidad de servicios (FT-04 Motor de Reservas & HOLD)
* **Tipo:** Feature Full-Stack / Vertical Slice
* **Rama:** `feature/HU20/catalogo-disponibilidad/daniela-zapata`
* **Rama Base:** `backend`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado (Vertical Slice)
Se implementó de punta a punta (*Vertical Slice*) el motor de disponibilidad y catálogo público para Vice City, dando cumplimiento estricto a las reglas de negocio **RN-001 a RN-012**, aislamiento arquitectónico (*Zero Interference Policy*) y validación de contratos con Zod `.strict()`.

### Arquitectura por Capas:
1. **Base de Datos & ORM (`@/lib/prisma`):**
   * Consumo exclusivo de los modelos `categories`, `services`, `bookings` y `service_schedules`.
   * Consultas optimizadas con filtros de estado (`confirmed`, `pending`) y rangos horarios.
2. **Lógica de Negocio y Dominio (`src/features/services/`):**
   * [`availability.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/services/services/availability.service.ts): Motor de aforo que genera las 9 franjas operativas (08:00 a 17:00), computa cupos ocupados, calcula `remainingCapacity` y evalúa estados (`AVAILABLE`, `FULL`, `MAINTENANCE`, `IN_PROGRESS`, `PAST`).
   * [`catalog.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/services/services/catalog.service.ts): Consulta pública de categorías y servicios activos con tarifas formateadas.
   * [`colombian-holidays.util.ts`](file:///c:/Users/User/Documents/vice-city/src/features/services/utils/colombian-holidays.util.ts): Cálculo algorítmico de días festivos en Colombia (Ley Emiliani) para trasladar el mantenimiento al martes cuando el lunes es festivo (RN-003).
   * [`date-bogota.util.ts`](file:///c:/Users/User/Documents/vice-city/src/features/services/utils/date-bogota.util.ts): Normalización estricta a la zona horaria `America/Bogota` (RN-002).
   * [`availability.errors.ts`](file:///c:/Users/User/Documents/vice-city/src/features/services/errors/availability.errors.ts): Errores tipados de negocio (`AdvanceBookingLimitError`, `PastDateError`, `MaintenanceDayError`, `ServiceNotFoundError`).
3. **Contratos de API (`src/app/api/`):**
   * `GET /api/catalog`: Retorna catálogo público de categorías y servicios.
   * `GET /api/availability?serviceId=UUID&date=YYYY-MM-DD`: Motor unificado de disponibilidad para Web y POS (RN-012).
   * Validación con Zod `.strict()` en query params y respuesta estándar `{ success, message, data?, error? }`.
4. **Documentación Swagger / OpenAPI 3.0:**
   * [`docs/swagger/hu20-availability.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu20-availability.swagger.json).
5. **Componentes UI (Tailwind v4):**
   * [`CatalogGrid.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/services/components/CatalogGrid.tsx): Cuadrícula responsiva con tarjetas de servicios, tarifas y aforos.
   * [`AvailabilitySlots.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/services/components/AvailabilitySlots.tsx): Selector interactivo de franjas con alertas de mantenimiento y badges de cupos restantes.
   * [`src/app/(public)/catalog/page.tsx`](file:///c:/Users/User/Documents/vice-city/src/app/(public)/catalog/page.tsx): Vista pública interactiva de catálogo y consulta en tiempo real.

---

## 3. Criterios de Aceptación Verificados

- [x] **La disponibilidad refleja el aforo restante de cada franja:** `remainingCapacity = Math.max(0, capacity - ocupados)` para cada una de las 9 franjas horarias.
- [x] **Los lunes (o martes festivo) no hay disponibilidad:** Lunes regular bloqueado por mantenimiento; si el lunes es festivo en Colombia, el complejo opera el lunes y se bloquea el martes por mantenimiento trasladado.
- [x] **Caso de error: fechas fuera de la anticipación o fuera del horario son rechazadas:** Lanza `AdvanceBookingLimitError` (límite de 15 días normal, 20 días piscina completa) y `PastDateError` para fechas en el pasado.
- [x] **Caso límite: una franja ya iniciada se puede comprar con tarifa completa de la hora (RN-010):** Si son las 09:25, la franja 09:00 - 10:00 se marca como `IN_PROGRESS`, `canBePurchased: true` con tarifa completa de 1h y finaliza a las 10:00 sin extenderse.
- [x] **Pruebas unitarias de la lógica:** 5 de 5 pruebas unitarias automatizadas ejecutadas con Node Test Runner (`npm test`).
- [x] **Zero Interference Policy:** Ningún archivo de `src/features/auth/` ni de otros módulos fue alterado.

---

## 4. Instrucciones de Ejecución y Pruebas

### Pruebas Unitarias:
```bash
npm test
# o:
npm run test:unit
```

**Resultado esperado:**
```text
▶ FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios
  ✔ Criterio 1: La disponibilidad refleja el aforo restante de cada franja (54.499ms)
  ✔ Criterio 2: Los lunes (o martes posterior a festivo) no hay disponibilidad por mantenimiento semanal (2.4882ms)
  ✔ Criterio 3: Caso de error - Fechas fuera de la anticipación o en el pasado son rechazadas (2.9828ms)
  ✔ Criterio 4: Caso límite - Una franja ya iniciada se puede comprar con tarifa completa de la hora (RN-010) (2.6742ms)
  ✔ Catálogo público: Retorna categorías y servicios activos con precio y aforo (1.5788ms)
✔ FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios (68.4159ms)
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

### Compilación y Build:
```bash
npm run build
```
*Comprueba que Next.js y TypeScript compilan limpiamente con código de salida 0.*

---

## 5. Checklist de Code Review
- [x] **Vertical Slice:** Incluye Prisma (consumo), Servicios, Zod, API Routes, UI, Tests y Swagger en una sola rama/PR.
- [x] **Aislamiento:** Código confinado en `src/features/services/`, `src/app/api/` y `src/app/(public)/catalog/`.
- [x] **Calidad:** 100% de tests unitarios aprobados.
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU20_CATALOGO_DISPONIBILIDAD.md`.

