# 📄 Documentación de Pull Request: FT-04 Motor de Reservas & HOLD

## 1. Información General
* **Feature:** `FT-04` — Motor de Reservas & HOLD (SRS)
* **Historias de Usuario Incluidas:**
  * `HU20` — Catálogo y disponibilidad de servicios
  * `HU21` — Reserva con retención (HOLD) de 10 minutos
  * `HU22` — Descuentos y promociones
* **Tipo:** Feature Completa / Full-Stack Vertical Slice (3 Capas)
* **Rama:** `feature/FT-04/motor-reservas-hold/daniela-zapata`
* **Rama Base (Target):** `backend`
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Módulo y Arquitectura en 3 Capas

La feature **FT-04** implementa el núcleo transaccional de reservas, control de aforo por franja horaria, retención temporal (HOLD) de 10 minutos y cálculo automático de tarifas y descuentos para Vice City, respetando integralmente las reglas de negocio **RN-001 a RN-015**.

### 🏗️ Desarrollo de las 3 Capas en esta Rama:

```text
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3: INTERFAZ, RUTAS API Y CONTRATOS (ZOD .strict())    │
│  - GET /api/catalog          - GET /api/availability        │
│  - POST /api/reservations/hold                              │
│  - GET /api/reservations/:id - POST /api/pricing/calculate  │
│  - UI: /catalog, /checkout/:bookingId, Tailwind v4, Swagger │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  CAPA 2: LÓGICA DE NEGOCIO Y DOMINIO (SERVICIOS PURIFICADOS)│
│  - AvailabilityService       (RN-001 a RN-010, Ley Emiliani)│
│  - ReservationHoldService    (RN-011 HOLD 10m, RN-006, 009) │
│  - DiscountCalculatorService (RN-013, RN-014, RN-015 No Acum)
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  CAPA 1: BASE DE DATOS Y ORM (PRISMA 6 & SUPABASE)          │
│  - Transacciones atómicas ($transaction) contra sobreventa  │
│  - Inmutabilidad de total_amount como precio histórico     │
│  - Modelos: Service, ServiceCategory, Booking, ScheduleSlot │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Detalle por Historia de Usuario (HU)

### 📌 HU20 — Catálogo y Disponibilidad de Servicios
* Catálogo público con categorías, precios y aforo máximo (**RN-004**).
* Disponibilidad por franja horaria (8:00 AM – 5:00 PM) en zona horaria oficial `America/Bogota` (**RN-001**, **RN-002**).
* Bloqueo por mantenimiento semanal los lunes, o martes cuando el lunes es festivo colombiano calculado con la Ley Emiliani (**RN-003**).
* Límites de anticipación (hasta 15 días normal, 20 días piscina completa) (**RN-008**).
* Admite compra de franja iniciada con cobro completo de la hora (**RN-010**).
* Misma fuente de disponibilidad para Web y POS (**RN-012**).

### 📌 HU21 — Reserva con Retención (HOLD) de 10 Minutos
* Creación atómica de reservas en estado `pending` con `expires_at = now + 10 minutos exactos` (**RN-011**).
* Liberación reactiva y automática del aforo si vence el tiempo sin confirmación de pago (**RN-011**).
* Transacción atómica que previene condiciones de carrera si dos clientes intentan reservar el último cupo en el mismo milisegundo (**RN-012**).
* Inmutabilidad del precio pactado en el registro histórico de la reserva (**RN-006**).
* Validación de duraciones continuas entre 1 y 9 horas (**RN-009**).

### 📌 HU22 — Descuentos y Promociones
* 20% de descuento automático los días miércoles (**RN-013**).
* 20% de descuento por reserva completa de piscina (50 cupos, jornada completa de 9h con hasta 20 días de antelación) (**RN-014**).
* Rechazo formal con `FullPoolDayRestrictedError` (422) si se solicita piscina completa en viernes, sábados, domingos o lunes festivos (**RN-014**).
* Regla estricta de **No Acumulación**: si califica para Miércoles y Piscina Completa, se aplica un único 20%, garantizando que nunca se aplique el 40% (**RN-015**).

---

## 4. Endpoints Expuestos y Documentación Swagger

| Método | Endpoint | Descripción | Swagger Doc |
|---|---|---|---|
| `GET` | `/api/catalog` | Lista de servicios activos por categoría | [`hu20-availability.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu20-availability.swagger.json) |
| `GET` | `/api/availability` | Aforo restante y disponibilidad por franja | [`hu20-availability.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu20-availability.swagger.json) |
| `POST` | `/api/reservations/hold` | Creación atómica de reserva con HOLD 10 min | [`hu21-reservation-hold.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu21-reservation-hold.swagger.json) |
| `GET` | `/api/reservations/:id` | Consulta de reserva y estado del HOLD | [`hu21-reservation-hold.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu21-reservation-hold.swagger.json) |
| `POST` | `/api/pricing/calculate` | Cálculo de tarifa y descuentos automáticos | [`hu22-discounts.swagger.json`](file:///c:/Users/User/Documents/vice-city/docs/swagger/hu22-discounts.swagger.json) |

---

## 5. Pruebas Unitarias y Calidad

Ejecución de la suite completa con Node Test Runner:
```bash
npm test
```

**Resultado obtenido (15 tests pasando al 100%):**
```text
▶ FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios
  ✔ Criterio 1: La disponibilidad refleja el aforo restante de cada franja
  ✔ Criterio 2: Los lunes (o martes posterior a festivo) no hay disponibilidad por mantenimiento semanal
  ✔ Criterio 3: Caso de error - Fechas fuera de la anticipación o en el pasado son rechazadas
  ✔ Criterio 4: Caso límite - Una franja ya iniciada se puede comprar con tarifa completa de la hora (RN-010)
  ✔ Catálogo público: Retorna categorías y servicios activos con precio y aforo
✔ FT-04 / HU20: Catálogo y Motor de Disponibilidad de Servicios (5 tests)

▶ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos
  ✔ Criterio 1: Una reserva nueva queda PENDING y retiene el cupo durante 10 minutos exactos
  ✔ Criterio 2: Pasado el tiempo de 10 minutos sin pago, el cupo vuelve a estar disponible automáticamente
  ✔ Criterio 3: Caso de error - Reservar sin cupo devuelve un conflicto claro (SlotFullConflictError / 409)
  ✔ Criterio 4: Caso límite - Dos clientes reservan a la vez el último cupo, solo uno lo obtiene
  ✔ Validación de duración y precio histórico inmutable (RN-006 y RN-009)
✔ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos (5 tests)

▶ FT-04 / HU22: Descuentos y Promociones Oficiales
  ✔ Criterio 1: Una reserva de miércoles recibe automáticamente el 20% de descuento (RN-013)
  ✔ Criterio 2: Una reserva completa de piscina recibe el 20% de descuento (RN-014)
  ✔ Criterio 3: Caso de error - Una reserva completa de piscina en día prohibido es rechazada (RN-014)
  ✔ Criterio 4: Caso límite - Reserva que cumple los dos casos recibe un solo descuento de 20%, nunca 40% (RN-015)
  ✔ Día normal sin promoción: Aplica tarifa completa sin descuento
✔ FT-04 / HU22: Descuentos y Promociones Oficiales (5 tests)

ℹ tests 15
ℹ suites 3
ℹ pass 15
ℹ fail 0
```

### Compilación y Build:
```bash
npm run build
```
*Next.js compila todas las páginas y endpoints dinámicos exitosamente con código de salida 0.*

---

## 6. Zero Interference Policy
* Ningún módulo de terceros (`auth/`, `users/`, etc.) fue modificado.
* No se introdujeron dependencias innecesarias.
* Código 100% modular, encapsulado en `src/features/services/`, `src/features/reservations/` y `src/features/pricing/`.
