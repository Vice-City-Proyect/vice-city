# HU19 — Gestión de Empleados por el Administrador (HU19)

## Historia de Usuario

> **Como** administrador de Vice City,  
> **quiero** crear, listar, desactivar y reactivar las cuentas del personal/empleados del complejo,  
> **para** controlar quiénes pueden realizar ventas físicas (POS) o validar accesos mediante códigos QR, asegurando la trazabilidad de las acciones administrativas.

**Ticket:** HU19 Gestión de empleados por el administrador  
**Rama:** `feature/HU19/gestion-empleados/jose-gutierrez`  
**Dependencias:** Autenticación (HU02), Gestión de roles (HU07), Base de Datos (VCP-20)  
**Estado:** ✅ Completada

---

## Objetivo y Alcance

Permitir la creación y administración del personal del complejo con los siguientes lineamientos:
1. **Roles Autorizados de Empleado:** Únicamente `TICKET_SELLER` y `QR_VALIDATOR`. Asignaciones a roles no permitidos (ej. `ADMIN`, `CLIENT`) son rechazadas.
2. **Ciclo de Vida Completo:** Creación, listado, desactivación (`is_active = false`) y reactivación (`is_active = true`).
3. **Bloqueo de Autenticación:** Un empleado en estado desactivado no puede iniciar sesión.
4. **Seguridad y Encriptación:** La contraseña es encriptada usando bcrypt (`crypt($1, gen_salt('bf', 10))`).
5. **Auditoría Obligatoria (`audit_logs`):** Toda acción administrativa (creación, edición, desactivación, reactivación) genera un registro en la tabla `audit_logs`.
6. **Prohibición de Autodesactivación (Caso Límite):** El administrador no puede desactivar su propia cuenta.

---

## Arquitectura de Archivos Implementados

```text
src/
├── app/
│   └── api/
│       └── employees/
│           ├── route.ts                 # GET (listar empleados), POST (crear empleado - ADMIN)
│           └── [id]/route.ts            # GET (detalle), PATCH (actualizar/cambiar estado), DELETE (desactivar)
└── features/
    └── employees/
        ├── types.ts                     # Definiciones TypeScript (CreateEmployeeInput, EmployeeRole, etc.)
        ├── employees.repository.ts     # Repositorio ORM de empleados y registro de auditoría en audit_logs
        └── index.ts                     # Exportaciones públicas de la feature
scripts/
└── test-employees.mjs                   # Suite automatizada de pruebas de aceptación (7/7 CA)
prisma/
└── schema.prisma                        # Modelo introspectado audit_logs y relaciones
```

---

## Reglas de Negocio Implementadas

1. **Restricción Estricta de Roles:**
   - La creación o actualización de empleados valida que el rol corresponda a `TICKET_SELLER` o `QR_VALIDATOR`.
   - Cualquier intento de asignar otro rol retorna error `400 Bad Request`.
2. **Unicidad de Correo:**
   - Si se intenta registrar un correo ya existente en el sistema (sin distinguir mayúsculas), la petición es rechazada con `400 Bad Request`.
3. **Control de Acceso (ADMIN):**
   - Toda la API de `/api/employees` requiere rol `ADMIN`. Solicitudes realizadas por roles `CLIENT`, `TICKET_SELLER` o `QR_VALIDATOR` retornan `403 Forbidden`.
4. **Imposibilidad de Autodesactivación:**
   - Si un administrador intenta desactivar su propio `userId`, la operación es denegada con error `400 Bad Request`.
5. **Registro en `audit_logs`:**
   - Las operaciones de creación, actualización, desactivación y reactivación escriben en la tabla `audit_logs` especificando el `actor_id`, la acción (`EMPLOYEE_CREATED`, `EMPLOYEE_DEACTIVATED`, `EMPLOYEE_REACTIVATED`, `EMPLOYEE_UPDATED`), el `entity_id` y los detalles en formato JSON.

---

## Criterios de Aceptación Verificados

| Criterio | Test | Estado |
|---|---|---|
| **CA01** | El administrador crea un empleado con rol TICKET_SELLER o QR_VALIDATOR | CA01 | ✅ PASS |
| **CA02** | Un empleado desactivado no puede iniciar sesión (`is_active = false`) | CA02 | ✅ PASS |
| **CA03** | Caso de error: correo repetido o rol no permitido es rechazado (400 Bad Request); usuario no ADMIN recibe 403 | CA03.1 / CA03.2 / CA03.3 | ✅ PASS |
| **CA04** | Caso límite: el administrador no puede desactivarse a sí mismo | CA04 | ✅ PASS |
| **Auditoría** | Las acciones quedan registradas en `audit_logs` | Auditoría | ✅ PASS |

---

## Comandos Disponibles

```bash
# Ejecutar suite de pruebas de aceptación de HU19
npm run test:employees

# Pruebas de regresión completas
npm run test:pricing
npm run test:services
npm run db:test:users
npm run db:test:login
npm run db:test:verification
npm run db:test:password-reset
npm run db:test:linked-accounts
```

---

## Autor

**Jose Gutierrez** — `feature/HU19/gestion-empleados/jose-gutierrez`
