# 📄 Documentación de Pull Request: HU07 — Gestión de Roles (Backend Completo)

## 1. Información General
* **Historia de Usuario:** `HU07` — Gestión de roles
* **Subtareas Abordadas:**
  * `HU07-BD ORM`: Prisma ORM - Gestión de roles y auditoría
  * `HU07-B LN`: Lógica de negocio de gestión de roles
  * `HU07-B API`: Endpoints administrativos de gestión de roles
* **Rama:** `feature/HU07/gestion-roles/jandy-pena`
* **Rama Destino (Base):** `develop` (o `backend` / `feature/fe-1b/auth`)
* **Desarrollador Responsable:** Jandy Peña (`BlurTrace`)
* **Dependencias:** `VCP-20` (tablas base), `HU01-BD` (usuarios), `HU02-B` (NextAuth / JWT / Roles)

---

## 2. Descripción de los Cambios Implementados

Se desarrolló la solución completa e integrada para las 3 capas del backend correspondientes a la **Gestión de Roles y Auditoría**:

### A. Capa de Acceso a Datos (ORM Prisma - `HU07-BD`):
* **Modelo en Prisma (`prisma/schema.prisma`):**
  * Incorporación del modelo `audit_logs` con `action`, `entity`, `entity_id`, `details (Json)`, `ip_address` y relación con `users`.
* **Repositorio ORM (`src/features/users/role-management.repository.ts`):**
  * `listUsersWithRolePaged({ page, limit, search, role })`: Consulta paginada y optimizada con filtros por texto y rol.
  * `countAdminUsers()`: Conteo en tiempo real de administradores activos para garantizar la integridad del sistema.
  * `findRole(identifier)`: Búsqueda flexible de roles por UUID o por nombre normalizado.
  * `updateUserRoleWithAudit(params)`: **Transaccionalidad atómica (`prisma.$transaction`)**: El cambio de rol del usuario y la inserción del evento en `audit_logs` se ejecutan juntos o la transacción se revierte por completo (Criterio 2).
  * **Manejo de errores:** Si el usuario no existe, retorna `{ success: false, reason: "USER_NOT_FOUND" }` de forma controlada sin lanzar excepciones no deseadas.

### B. Capa de Lógica de Negocio (`HU07-B LN`):
* **Servicio Principal (`src/features/users/services/role-management.service.ts`):**
  * `changeUserRole(input, requester)`:
    1. **Validación de permisos:** Solo usuarios con rol `ADMIN` pueden cambiar roles (`UnauthorizedRoleManagerError` -> 403).
    2. **Validación de roles del SRS:** Exclusivamente los 4 roles autorizados: `ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR` (`InvalidRoleError` -> 400).
    3. **Regla del Último Administrador:** Previene revocar el rol al último administrador activo del sistema (`CannotDemoteLastAdminError` -> 400).
    4. **Auditoría obligatoria:** Inserta detalles con `previous_role`, `new_role`, `changed_by_admin` y motivo.
  * `listUsers(params, requester)`: Asegura que únicamente los administradores consulten el directorio de roles.
* **Errores de Dominio (`src/features/users/errors/role-management.errors.ts`):**
  * `UnauthorizedRoleManagerError` (403)
  * `InvalidRoleError` (400)
  * `CannotDemoteLastAdminError` (400)
  * `TargetUserNotFoundError` (404)
  * `RoleNotFoundError` (404)

### C. Capa API y Route Handlers (`HU07-B API`):
* **Listado de Usuarios (`src/app/api/admin/users/route.ts`):**
  * `GET`: Endpoint paginado con query params (`page`, `limit`, `search`, `role`). Exige sesión activa (401) y rol `ADMIN` (403).
* **Cambio de Rol (`src/app/api/admin/users/[id]/role/route.ts`):**
  * `PATCH` y `PUT`: Validación estricta con Zod (`changeUserRoleSchema.strict()`), verificación de `Content-Type: application/json` y delegación desacoplada al servicio.
* **Esquemas Zod (`src/features/users/schemas/role-management.schema.ts`):**
  * Validación estricta de payloads rechazando campos desconocidos.

### D. Documentación Swagger / OpenAPI 3.0 (`docs/swagger/admin-roles.swagger.json`):**
* Especificación OpenAPI 3.0.3 detallando endpoints `GET /api/admin/users` y `PATCH /api/admin/users/{id}/role` con códigos 200, 400, 401, 403, 404 y 500.

---

## 3. Criterios de Aceptación Verificados

### Criterios de HU07-BD ORM:
- [x] **Listar y actualizar roles funciona contra Supabase:** Consultas paginadas y mutaciones vía Prisma Client.
- [x] **El cambio de rol y el registro de auditoría se guardan juntos o no se guarda ninguno:** Operación atómica garantizada con `prisma.$transaction`.
- [x] **Caso de error: actualizar un usuario inexistente devuelve un resultado controlado:** Retorna `USER_NOT_FOUND` sin romper el flujo.
- [x] **Caso límite: dos cambios simultáneos no dejan inconsistencias:** Transacción de base de datos con verificación.

### Criterios de HU07-B LN:
- [x] **Un ADMIN cambia el rol de otro usuario y queda registrado:** Verificado en pruebas con inserción en `audit_logs`.
- [x] **Caso de error: un rol inválido o solicitante sin permiso devuelve error de negocio claro:** `UnauthorizedRoleManagerError` (403) e `InvalidRoleError` (400).
- [x] **Caso límite: el último ADMIN no puede quitarse su propio rol:** Dispara `CannotDemoteLastAdminError` si `countAdminUsers() <= 1`.
- [x] **Pruebas unitarias de la lógica:** 7 pruebas en `tests/unit/roles.service.test.mjs`.

### Criterios de HU07-B API:
- [x] **Un ADMIN lista usuarios y cambia roles (200):** Endpoints responden 200 con formato envelope estándar.
- [x] **Caso de error: usuario sin rol ADMIN recibe 403 y sin sesión recibe 401:** Verificado en `GET` y `PATCH`.
- [x] **Caso límite: enviar un rol que no existe devuelve 400:** Rechazado por Zod y la lógica de negocio con 400 `VALIDATION_ERROR`.
- [x] **Pruebas unitarias de la API:** 8 pruebas en `tests/unit/roles.api.test.mjs`.

---

## 4. Archivos Creados y Modificados

```text
├── docs/
│   ├── PULL_REQUEST_HU07_ROLE_MANAGEMENT.md      # Documentación formal de este PR
│   └── swagger/
│       └── admin-roles.swagger.json              # Contrato OpenAPI 3.0.3
├── prisma/
│   └── schema.prisma                             # Modelo audit_logs y relación con users
├── src/
│   ├── app/
│   │   └── api/
│   │       └── admin/
│   │           └── users/
│   │               ├── route.ts                  # GET /api/admin/users
│   │               └── [id]/
│   │                   └── role/
│   │                       └── route.ts          # PATCH /api/admin/users/[id]/role
│   └── features/
│       └── users/
│           ├── errors/
│           │   └── role-management.errors.ts     # Errores de dominio (403, 400, 404)
│           ├── index.ts                          # Exportaciones públicas de HU07
│           ├── role-management.repository.ts     # Capa ORM y transacciones con audit_logs
│           ├── schemas/
│           │   └── role-management.schema.ts     # Zod estricto para cambio y consulta
│           └── services/
│               └── role-management.service.ts    # Lógica de negocio y regla del último admin
└── tests/
    └── unit/
        ├── roles.service.test.mjs                # Pruebas unitarias de LN y ORM (HU07-B LN & BD)
        └── roles.api.test.mjs                    # Pruebas unitarias de API y permisos (HU07-B API)
```

---

## 5. Instrucciones de Ejecución y Pruebas

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar las pruebas específicas de gestión de roles
npx tsx --test tests/unit/roles*.test.mjs
```
