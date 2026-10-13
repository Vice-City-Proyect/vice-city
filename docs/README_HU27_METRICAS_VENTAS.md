# HU27 — Métricas de Ventas y Ocupación (FT-08 del SRS)

## 📌 Información General
- **Historia de Usuario:** HU27 — Métricas de ventas y ocupación
- **Funcionalidad SRS:** FT-08 — Reportes y Métricas Administrativas
- **Rama:** `feature/HU27/metricas-ventas/jose-gutierrez`
- **Dependencias:** HU24 (Confirmación de ventas y pagos Stripe), HU25 (Venta presencial POS).

---

## 🎯 Objetivo de la Historia de Usuario
Proveer al Administrador (`ADMIN`) un conjunto integral de estadísticas de ingresos, ocupación por servicio y días de mayor venta, con filtros dinámicos por período (`day`, `week`, `month`, `year`), segregación por canal de venta (Web vs POS) y delimitación estricta de tiempo bajo el huso horario oficial `America/Bogota` (UTC-5).

---

## 📋 Requerimientos y Cumplimiento de Reglas de Negocio

1. **Ingresos Desglosados:**
   - Consolidación del total facturado en el período.
   - Separación estricta entre ventas online Web (`stripe`) y ventas presenciales POS en taquilla (`pos_terminal`).

2. **Ocupación por Servicio:**
   - Cálculo de la cantidad total de personas/reservas por instalación deportiva.
   - Tasa de ocupación porcentual (`occupancyRate`) calculada contra el aforo operativo del complejo (9 horas diarias, 8:00 AM a 5:00 PM).
   - Ocupación promedio global ponderada del complejo.

3. **Días de Mayor Venta (Top Sales Days):**
   - Agrupación cronológica de ingresos y cantidad de reservas por fecha calendario en Bogotá.
   - Ordenamiento descendente por facturación.
   - Identificación del día de mayor venta (`topDay`).

4. **Flujo de Ingresos (Revenue Flow):**
   - Serie temporal continua lista para graficar en componentes de frontend (`RevenueChart`):
     - `day`: Horas operativas (`08:00` a `16:00` / `17:00`).
     - `week`: Días de la semana (`Lun`, `Mar`, `Mié`, `Jue`, `Vie`, `Sáb`, `Dom`).
     - `month`: Semanas del mes (`Sem 1`, `Sem 2`, `Sem 3`, `Sem 4`).
     - `year`: Meses del año (`Ene`, `Feb`, ..., `Dic`).

5. **Zona Horaria Oficial (RN-002):**
   - Toda la aritmética de fechas opera en `America/Bogota` (UTC-5 sin horario de verano), evitando desfases provocados por la zona horaria del servidor o despliegue.

6. **Control de Acceso (RBAC):**
   - Endpoint restringido con rol `ADMIN`. Usuarios con roles `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR` reciben `403 Forbidden`. Solicitudes anónimas reciben `401 Unauthorized`.

---

## 🏗️ Arquitectura de Archivos Implementados

```text
src/
├── app/
│   └── api/
│       └── reports/
│           └── metrics/
│               └── route.ts          # Route Handler GET /api/reports/metrics con requireAdminRole
├── features/
│   └── reports/
│       ├── types.ts                  # Interfaces TypeScript para métricas, rangos y flujo
│       ├── index.ts                  # Barrel export público del módulo
│       ├── data/
│       │   └── mock-revenue.ts       # Datos de referencia compatibles
│       ├── utils/
│       │   └── date-range.util.ts    # Utilidades para cálculo de rangos en America/Bogota
│       └── services/
│           └── metrics.service.ts    # Servicio de negocio MetricsService con inyección de dependencias
scripts/
└── test-metrics.mjs                  # Script de aceptación automatizada CA01 - CA04
tests/
└── unit/
    └── reports.metrics.test.mjs      # Pruebas unitarias Node Test Runner
```

---

## ✅ Criterios de Aceptación (Verificación)

| Criterio | Descripción | Estado | Evidencia |
| :--- | :--- | :---: | :--- |
| **CA01** | Las cifras coinciden con las reservas y pagos registrados (Total, Web vs POS). | **PASS** | Validado contra la BD Supabase y con mocks unitarios. Sumas de ingresos Web + POS equivalen exactamente al total general. |
| **CA02** | Cada filtro de período devuelve el rango correcto en `America/Bogota`. | **PASS** | `day`, `week`, `month` y `year` generan los timestamps UTC exactos correspondientes a `00:00:00.000` y `23:59:59.999` en Bogotá. |
| **CA03** | Caso de error: usuario sin rol ADMIN recibe 403 (o 401 si no autenticado). | **PASS** | `GET /api/reports/metrics` devuelve 403 con roles `CLIENT` o `TICKET_SELLER` y 401 sin sesión. |
| **CA04** | Caso límite: un período sin ventas devuelve ceros, no error. | **PASS** | Períodos sin facturación retornan HTTP 200 con `{ totalRevenue: 0, webRevenue: 0, posRevenue: 0, topService: "N/A", topDay: "N/A" }` sin excepciones. |

---

## 📡 Contrato de API

### Endpoint:
```http
GET /api/reports/metrics?period=month
```

#### Query Parameters:
- `period` (opcional): `'day' | 'week' | 'month' | 'year'`. Por defecto: `'month'`.

#### Headers requeridos:
- Sesión NextAuth con rol `ADMIN` o header de simulación: `x-user-role: ADMIN`.

#### Respuesta Exitosa (200 OK):
```json
{
  "success": true,
  "data": {
    "period": "month",
    "range": {
      "start": "2026-10-01T00:00:00.000-05:00",
      "end": "2026-10-31T23:59:59.999-05:00",
      "timezone": "America/Bogota",
      "label": "Mes 10/2026"
    },
    "summary": {
      "totalRevenue": 264000,
      "webRevenue": 264000,
      "posRevenue": 0,
      "totalReservations": 6,
      "webReservations": 6,
      "posReservations": 0,
      "topService": "Cancha Microfútbol",
      "topDay": "Lunes",
      "averageOccupancy": 0
    },
    "revenueFlow": [
      { "label": "Sem 1", "value": 0, "webValue": 0, "posValue": 0 },
      { "label": "Sem 2", "value": 264000, "webValue": 264000, "posValue": 0 },
      { "label": "Sem 3", "value": 0, "webValue": 0, "posValue": 0 },
      { "label": "Sem 4", "value": 0, "webValue": 0, "posValue": 0 }
    ],
    "occupancyByService": [
      {
        "serviceId": "0420e420-e6a1-43cb-9d68-755c9a7740cd",
        "serviceName": "Cancha Microfútbol",
        "categoryName": "Canchas",
        "capacity": 11,
        "bookedCount": 2,
        "occupancyRate": 1,
        "revenue": 160000,
        "webBookings": 2,
        "posBookings": 0
      }
    ],
    "topSalesDays": [
      {
        "date": "2026-10-12",
        "dayName": "Lunes",
        "totalRevenue": 160000,
        "webRevenue": 160000,
        "posRevenue": 0,
        "reservationsCount": 2
      }
    ]
  }
}
```

---

## 🧪 Ejecución de Pruebas

### 1. Prueba de Aceptación End-to-End
Ejecuta la suite automatizada con conexión a base de datos y simulación de peticiones HTTP:
```bash
npm run test:metrics
```

### 2. Suite Completa de Pruebas Unitarias
Ejecuta los 170 tests unitarios del proyecto para comprobar cero regresiones:
```bash
npm run test
```
