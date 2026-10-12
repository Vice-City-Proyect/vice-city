# HU17 — CRUD de Categorías y Servicios (FT-03 / SRS v1.1)

## Historia de Usuario

> **Como** administrador del complejo deportivo Vice City,  
> **quiero** crear, consultar, editar y desactivar categorías y servicios deportivos,  
> **para** gestionar la oferta de espacios, aforos, precios y modalidades de reserva de las instalaciones.

**Ticket:** HU17 CRUD de categorías y servicios (FT-03 del SRS v1.1)  
**Rama:** `feature/HU17/crud-categorias-servicios/jose-gutierrez`  
**Dependencias:** Base de datos (VCP-20), Middleware / Guard de roles ADMIN (HU08)  
**Estado:** ✅ Completada

---

## Objetivo y Alcance

Implementar el módulo completo de administración de categorías y servicios deportivos bajo la arquitectura del proyecto:
1. **CRUD completo de Categorías:** Piscinas, Canchas, Gimnasio, Zona Húmeda.
2. **CRUD completo de Servicios:** Definición de nombre, aforo (`capacity` / `max_capacity`), precio, duración, modalidad de reserva y estado activo/inactivo.
3. **Control de Acceso Estricto:** Exclusivo para usuarios con rol `ADMIN` (403 Forbidden para usuarios sin permisos).
4. **Validación de Negocio:** Rechazo estricto de aforos menores o iguales a cero (`capacity <= 0`).
5. **Preservación de Reservas (RN-006):** Desactivar un servicio con reservas futuras no las borra ni las reasigna; se mantienen intactas.

---

## Matriz Oficial de Servicios Iniciales (RN-004)

Sembrada y validada en Supabase mediante `npm run db:seed:services`:

| Categoría | Servicio | Slug | Aforo (`capacity`) | Precio COP | Modalidad |
|---|---|---|---|---|---|
| **Piscinas** | Piscina Adultos 1 | `piscina-adultos-1` | 50 | \$2,000 | Por persona / hora |
| **Piscinas** | Piscina Adultos 2 | `piscina-adultos-2` | 50 | \$2,000 | Por persona / hora |
| **Piscinas** | Piscina Adultos 3 | `piscina-adultos-3` | 50 | \$2,000 | Por persona / hora |
| **Piscinas** | Piscina Niños | `piscina-ninos` | 50 | \$2,000 | Por persona / hora |
| **Canchas** | Cancha Fútbol Grande | `cancha-futbol-grande` | 11 | \$140,000 | Exclusiva |
| **Canchas** | Cancha Microfútbol | `cancha-microfutbol` | 11 | \$80,000 | Exclusiva |
| **Canchas** | Cancha Múltiple | `cancha-multiple` | 11 | \$70,000 | Exclusiva |
| **Gimnasio** | Gimnasio | `gimnasio` | 20 | \$2,000 | Por persona / hora |
| **Zona Húmeda** | Zona Húmeda | `zona-humeda` | 10 | \$4,000 | Por persona / hora |

---

## Arquitectura de Archivos Implementados

```text
src/
├── app/
│   └── api/
│       ├── categories/
│       │   ├── route.ts                 # GET (listar), POST (crear - ADMIN)
│       │   └── [id]/route.ts            # GET, PATCH (editar - ADMIN), DELETE (desactivar - ADMIN)
│       └── services/
│           ├── route.ts                 # GET (listar), POST (crear - ADMIN, aforo > 0)
│           └── [id]/route.ts            # GET, PATCH (editar - ADMIN), DELETE (desactivar seguro RN-006)
└── features/
    └── services/
        ├── types.ts                     # Interfaces y tipos TypeScript
        ├── categories.repository.ts     # Repositorio ORM de categorías
        ├── services.repository.ts       # Repositorio ORM de servicios (reglas de aforo y RN-006)
        ├── auth-guard.ts                # Guard de autorización de rol ADMIN
        └── index.ts                     # Barrel de exportaciones públicas
scripts/
├── seed-services.mjs                    # Siembra de matriz inicial RN-004
└── test-categories-services.mjs         # Suite de pruebas automatizada de criterios de aceptación
```

---

## Reglas de Negocio Implementadas

1. **Aforo Estricto:**
   - La creación o actualización de un servicio con `capacity <= 0` es rechazada con error de validación (400 Bad Request).
2. **Autorización ADMIN:**
   - Todo intento de creación, modificación o desactivación por parte de roles `CLIENT`, `STAFF` o usuarios no autorizados retorna `403 Forbidden`.
3. **Desactivación Segura (RN-006):**
   - Cuando se solicita eliminar un servicio que posee reservas asociadas, la operación realiza una desactivación lógica (`is_active = false`), preservando la integridad de los registros de reserva históricos y futuros.

---

## Criterios de Aceptación Verificados

| Criterio | Test | Estado |
|---|---|---|
| **CA01** | El administrador crea, edita y desactiva categorías y servicios | CA01 | ✅ PASS |
| **CA02** | Los datos iniciales coinciden con la matriz del SRS (RN-004) | CA02.1 / CA02.2 | ✅ PASS |
| **CA03** | Caso de error: usuario sin rol ADMIN recibe 403; aforo menor o igual a cero es rechazado | CA03.1 / CA03.2 | ✅ PASS |
| **CA04** | Caso límite: desactivar un servicio con reservas futuras no las borra ni las reasigna (RN-006) | CA04 | ✅ PASS |

---

## Comandos Disponibles

```bash
# Sembrar categorías y servicios base del SRS
npm run db:seed:services

# Ejecutar suite de pruebas de aceptación de HU17
npm run test:services

# Pruebas de regresión
npm run db:test:users
npm run db:test:login
npm run db:test:verification
npm run db:test:password-reset
npm run db:test:linked-accounts
```

---

## Autor

**Jose Gutierrez** — `feature/HU17/crud-categorias-servicios/jose-gutierrez`
