# HU32-B (VCP-93): listados de reservas y resúmenes de dashboard con datos reales

## Qué se resuelve
Antes no existía ningún `GET` que listara reservas ni un resumen para los dashboards, así que varias pantallas
seguían con datos escritos a mano (`MOCK_*`). Este PR crea los endpoints que faltaban y conecta las pantallas.

## Backend
| Endpoint | Roles | Qué devuelve |
|---|---|---|
| `GET /api/reservations` | CLIENT, ADMIN | Reservas con filtros de estado, servicio y rango de fechas, paginación y orden. El CLIENT ve solo las suyas (el usuario sale de la sesión, nunca de la URL); el ADMIN ve todas. |
| `GET /api/reports/dashboard-summary` | ADMIN | Reservas pendientes (HOLD de 10 minutos vigente), usuarios activos y las 6 próximas reservas confirmadas. |
| `GET /api/employee/summary` | TICKET_SELLER, QR_VALIDATOR, ADMIN | Reservas de hoy (hora de Bogotá), visitantes esperados, ingresos por registrar y servicios activos. Sin correo, teléfono ni notas internas del cliente. |

Contratos en `docs/swagger/reservations.swagger.json` (GET agregado) y `docs/swagger/dashboard-summary.swagger.json` (nuevo).
No hizo falta tocar `route-permissions.ts`: las tres rutas ya quedaban cubiertas por reglas existentes.

## Frontend
| Pantalla | Antes | Ahora |
|---|---|---|
| `cliente/reservas` | `MOCK_RESERVATIONS` | `GET /api/reservations` (carga, error con reintento, vacío) |
| Tarjeta "Tu próxima reserva" | `MOCK_RESERVATIONS` | `GET /api/reservations` |
| Dashboard admin: Pendientes, Usuarios, Próximas reservas | Retiradas / datos de ejemplo | `GET /api/reports/dashboard-summary` |
| `empleado` (dashboard) y `empleado/reservas` | `MOCK_RESERVATIONS` y `MOCK_SERVICES` | `GET /api/employee/summary` |

Se eliminaron los archivos `mock-reservations.ts`, `mock-occupancy.ts` y `mock-session.ts`, que quedaron sin uso.
Las fechas y horas del frontend usan America/Bogota, no la zona horaria del navegador.

## Decisiones que conviene revisar
1. **No se implementó la cancelación de reservas por el cliente** (alcance 3 del ticket): la regla del MVP dice
   "There are no client cancellations in the MVP". Se retiró el botón "Cancelar reserva" de `cliente/reservas`, que solo
   cambiaba el estado en pantalla sin avisar al backend.
2. **Se retiraron los botones "Registrar entrada/salida" de `empleado/reservas`** por el mismo motivo: no persistían nada.
   El ingreso real se registra en la validación de QR (`/empleado/qr`, HU13).
3. **Se corrigió el mapeo de estados reales de la base** en `computeOperationalStatus`: `expired` se muestra como cancelada,
   y `completed` y `no_show` como finalizada. Antes aparecían como "Pendiente". Afecta también a la pantalla del admin.
4. El listado de empleados muestra **solo las reservas de hoy**; el cliente ve sus **100 reservas más recientes**.
5. Rama base: este trabajo sale de `develop`, no de `frontend` como indica el ticket, porque ahí está el módulo de reservas
   del admin (MR1). Pendiente de confirmar con Jandy.

## Validación
- `npm test`: 603/604. La única que falla es `tests/unit/pos.preview.test.mjs`, que usa la fecha fija `2026-10-15T09:00`
  y desde las 10:00 de ese día rechaza la franja por pasada. No depende de estos cambios.
- `npx tsc --noEmit`: sin errores en `src`.
- eslint: 0 errores.
- `npm run build`: no ejecutado.
- **No verificado en vivo:** el comportamiento con sesión real de cada rol y con la base compartida.

## Hallazgos ajenos a la tarea (no corregidos)
- **Unrelated issue detected:** `tests/unit/pos.preview.test.mjs` (líneas 92 a 386) depende de la hora real. Tarea sugerida: fijar la
  hora con `nowFn`. Falla en el CI desde el 15/oct/2026 a las 10:00 (Bogotá).
- **Unrelated issue detected:** `src/app/empleado/pos/page.tsx` conserva `MOCK_SERVICES` (módulo POS, FT-06). Tarea sugerida: conectar
  el POS al catálogo real.
- **Unrelated issue detected:** `src/app/admin/usuarios/page.tsx` y `UserDetailModal.tsx` importan `ROLE_LABELS` de
  `mock-users.ts`, que no es un dato de ejemplo sino una constante de etiquetas. Tarea sugerida: moverla a un archivo sin prefijo `mock-`.
- **Unrelated issue detected:** `GET /api/reservations/[id]` es público por UUID (ya documentado antes).
- **Unrelated issue detected:** el login con Google siempre manda a `/cliente`, sin considerar el rol.
