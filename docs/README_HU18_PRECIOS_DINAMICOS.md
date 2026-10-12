# HU18 — Precios Dinámicos de Servicios (RN-007)

## Historia de Usuario

> **Como** administrador de Vice City,  
> **quiero** modificar las tarifas base de los servicios según estrategias de precios dinámicos,  
> **para** actualizar la oferta comercial sin alterar el valor histórico de las reservas ya realizadas o en proceso de pago (HOLD).

**Ticket:** HU18 Precios dinámicos de servicios (RN-007)  
**Rama:** `feature/HU18/precios-dinamicos/jose-gutierrez`  
**Dependencias:** HU17 (CRUD categorías y servicios), Base de datos (VCP-20)  
**Estado:** ✅ Completada

---

## Objetivo y Alcance

Permitir la modificación de la tarifa base (`price`) de cada servicio deportivo con las siguientes garantías:
1. **Aplicabilidad Exclusiva a Nuevas Reservas:** El cambio de tarifa solo aplica a reservas creadas posteriormente a la modificación.
2. **Preservación del Valor Histórico (RN-007):** Las reservas confirmadas o existentes mantienen exactamente el monto y tarifa con la que fueron adquiridas.
3. **Protección de Reservas en HOLD (Caso Límite):** Las reservas en estado de retención de pago (`pending` con ventana de hold de 10 minutos) preservan su valor congelado aunque la tarifa del servicio aumente o disminuya durante esa ventana.
4. **Validaciones de Error:** Rechazo estricto de precios menores a cero (`price < 0`), nulos o no numéricos con código 400.
5. **Control de Acceso:** Modificación exclusiva para el rol `ADMIN` (403 Forbidden para usuarios sin privilegios).

---

## Implementación Técnica

### 1. Repositorio de Servicios (`src/features/services/services.repository.ts`)
- **`updateServicePrice(id, newPrice)`:**
  - Valida que `newPrice` sea numérico y `>= 0`.
  - Registra el precio anterior (`previousPrice`) y el nuevo precio (`newPrice`) junto con la fecha de actualización para auditoría.
- **`createBookingWithAppliedPrice(input)`:**
  - Persiste la reserva congelando el `applied_unit_price` y calculando `total_amount = applied_unit_price * quantity`.
  - Almacena en `metadata.applied_unit_price` y `total_amount` el valor exacto de la compra.
  - Para reservas en estado `pending`, configura el `expires_at` con el hold reglamentario de 10 minutos.

### 2. Endpoints de API REST
- **`PATCH /api/services/[id]`:**
  - Protegido por `requireAdminRole` (`auth-guard.ts`).
  - Valida exhaustivamente el campo `price`: rechaza valores negativos o vacíos con error 400.
  - Actualiza la tarifa del servicio en la base de datos sin alterar los registros existentes en la tabla `bookings`.

---

## Criterios de Aceptación Verificados

| Criterio | Test | Estado |
|---|---|---|
| **CA01** | Cambiar un precio se refleja en las nuevas reservas | CA01 | ✅ PASS |
| **CA02** | Las reservas existentes conservan el precio con el que se compraron (RN-007) | CA02 | ✅ PASS |
| **CA03** | Caso de error: un precio negativo o vacío es rechazado; usuario sin rol ADMIN recibe 403 | CA03.1 / CA03.2 | ✅ PASS |
| **CA04** | Caso límite: cambio de precio mientras hay una reserva en HOLD no altera su valor | CA04 | ✅ PASS |

---

## Comandos Disponibles

```bash
# Ejecutar suite de pruebas de aceptación de HU18
npm run test:pricing

# Ejecutar pruebas de HU17
npm run test:services

# Pruebas de regresión completas
npm run db:test:users
npm run db:test:login
npm run db:test:verification
npm run db:test:password-reset
npm run db:test:linked-accounts
```

---

## Autor

**Jose Gutierrez** — `feature/HU18/precios-dinamicos/jose-gutierrez`
