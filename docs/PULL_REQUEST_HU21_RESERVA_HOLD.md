# 📄 Documentación de Pull Request: FT-04 / HU21 Reserva con Retención (HOLD) de 10 Minutos

## 1. Información General
* **Jira Tarea:** `HU21` — Reserva con retención (HOLD) de 10 minutos (FT-04 Motor de Reservas & HOLD)
* **Tipo:** Feature Full-Stack / Vertical Slice
* **Rama:** `feature/HU21/reserva-hold/daniela-zapata`
* **Rama Base:** `feature/HU20/catalogo-disponibilidad/daniela-zapata`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado (Vertical Slice)
Se implementó el motor de reservas con retención temporal (**HOLD**) de 10 minutos de Vice City, dando cumplimiento a las reglas de negocio **RN-006, RN-009, RN-011 y RN-012**, garantizando la inmutabilidad de recursos físicos, fijación de tarifas históricas, liberación automática de cupos y protección contra condiciones de carrera mediante transacciones atómicas de Prisma ORM.

### Arquitectura por Capas:
1. **Base de Datos & ORM (`@/lib/prisma`):**
   * Transacciones atómicas con `prisma.$transaction` que evalúan la disponibilidad y crean el registro de reserva en un único bloque consistente, evitando sobreventa simultánea.
   * Fijación del campo `total_amount` como valor histórico inmutable (RN-006).
2. **Lógica de Negocio y Dominio (`src/features/reservations/`):**
   * [`reservation-hold.service.ts`](file:///c:/Users/User/Documents/vice-city/src/features/reservations/services/reservation-hold.service.ts):
     * Genera la reserva en estado `pending` con `expires_at = now + 10 minutos exactos` (**RN-011**).
     * **Liberación automática:** Filtra de forma reactiva las reservas cuyo tiempo de retención ya venció (`expires_at <= now`), permitiendo que el cupo vuelva a quedar disponible de inmediato sin cron jobs pesados.
     * Valida duración permitida (mínimo 1h, máximo 9h continuas, **RN-009**).
     * Congela la tarifa histórica calculada según precio del servicio por hora y cupos solicitados.
   * [`reservation.errors.ts`](file:///c:/Users/User/Documents/vice-city/src/features/reservations/errors/reservation.errors.ts): Errores tipados con código HTTP asociado (`SlotFullConflictError` 409, `HoldExpiredError` 410, `InvalidDurationError` 400).
3. **Contratos de API & Zod (`.strict()`):**
   * `POST /api/reservations/hold`: Crea la reserva y genera la retención exclusiva de 10 minutos.
   * `GET /api/reservations/:id`: Consulta los datos de la reserva, estado y segundos restantes del timer de pago.
   * Validación estricta con Zod (`.strict()`) y respuesta unificada `{ success, message, data?, error? }`.
4. **Swagger / OpenAPI 3.0:**
   * [`docs/swagger/hu21-reservation-hold.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu21-reservation-hold.swagger.json).
5. **Componentes e Interfaz UI (Tailwind v4):**
   * [`HoldTimer.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/reservations/components/HoldTimer.tsx): Temporizador dinámico regresivo con barra de progreso y alerta visual cuando resta poco tiempo o expira.
   * [`ReservationSummaryCard.tsx`](file:///c:/Users/User/Documents/vice-city/src/features/reservations/components/ReservationSummaryCard.tsx): Resumen detallado con fecha, franja horaria y tarifa histórica congelada.
   * [`src/app/(public)/checkout/[bookingId]/page.tsx`](file:///c:/Users/User/Documents/vice-city/src/app/(public)/checkout/[bookingId]/page.tsx): Vista pública de checkout con el HOLD de 10 minutos activo.

---

## 3. Criterios de Aceptación Verificados

- [x] **Una reserva nueva queda PENDING y retiene el cupo durante 10 minutos:** Crea la reserva con `status: "pending"` y `expires_at` exactamente 10 minutos después.
- [x] **Pasado el tiempo sin pago, el cupo vuelve a estar disponible:** Reservas en estado `pending` con `expires_at` superado son omitidas del cálculo de aforo ocupado, liberando los cupos automáticamente.
- [x] **Caso de error: reservar sin cupo devuelve un conflicto claro:** Lanza `SlotFullConflictError` con código `SLOT_FULL_CONFLICT` y status `409 Conflict`.
- [x] **Caso límite: dos clientes reservan a la vez el último cupo, solo uno lo obtiene:** La transacción atómica garantiza que la primera solicitud toma el cupo y la concurrente es rechazada con conflicto 409.
- [x] **Pruebas unitarias de la lógica:** 5 de 5 pruebas unitarias automatizadas ejecutadas con Node Test Runner (`npm test`).
- [x] **Zero Interference Policy:** Ningún archivo de autenticación ni de otros módulos fue modificado.

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
▶ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos
  ✔ Criterio 1: Una reserva nueva queda PENDING y retiene el cupo durante 10 minutos exactos (41.8012ms)
  ✔ Criterio 2: Pasado el tiempo de 10 minutos sin pago, el cupo vuelve a estar disponible automáticamente (3.8586ms)
  ✔ Criterio 3: Caso de error - Reservar sin cupo devuelve un conflicto claro (SlotFullConflictError / 409) (6.4397ms)
  ✔ Criterio 4: Caso límite - Dos clientes reservan a la vez el último cupo, solo uno lo obtiene (3.2463ms)
  ✔ Validación de duración y precio histórico inmutable (RN-006 y RN-009) (3.9894ms)
✔ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos (64.2446ms)
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
- [x] **Vertical Slice:** Incluye Prisma (transacción), Servicios, Zod, API Routes, UI, Tests y Swagger en una sola rama/PR.
- [x] **Aislamiento:** Confinado en `src/features/reservations/`, `src/app/api/reservations/` y `src/app/(public)/checkout/`.
- [x] **Calidad:** 100% de tests unitarios aprobados.
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU21_RESERVA_HOLD.md`.

