# 📋 Resumen Ejecutivo de Cambios — Rama `fe-1b/HU-01/auth-API-Jandy`

* **Repositorio:** `Vice-City-Proyect/vice-city`
* **Rama de Trabajo:** `fe-1b/HU-01/auth-API-Jandy`
* **Historia de Usuario:** HU-01: Autenticación y Registro de Usuarios
* **Subtarea:** HU01-B API Endpoint de registro (VCP-27)
* **Desarrollador:** Jandy Peña (BlurTrace)
* **Fecha:** Octubre 2026

---

## 1. 🎯 Objetivo de la Tarea
Exponer la ruta API en Next.js (`POST /api/auth/register`) para procesar el registro de nuevos usuarios en el sistema bajo una **arquitectura por capas desacoplada**, validando exhaustivamente los datos de entrada en el servidor, delegando la persistencia a la capa de lógica de negocio (sin acceso directo a la base de datos desde la API), respondiendo con los códigos de estado HTTP correctos (`201`, `400`, `409`, `500`) y documentando el endpoint bajo el estándar **Swagger / OpenAPI 3.0**.

---

## 2. 🏗️ Arquitectura Implementada

Se siguió estrictamente la separación de responsabilidades acordada con el equipo de backend:

```text
[ Cliente HTTP / Frontend ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 1: API / Route Handler                           │
│  src/app/api/auth/register/route.ts                    │
│  - Valida Content-Type (application/json)              │
│  - Captura cuerpo vacío o JSON malformado (HTTP 400)   │
│  - Valida esquema estricto Zod (.strict()) (HTTP 400)  │
│  - Mapea códigos de estado (201, 400, 409, 500)        │
└──────────────────────────┬─────────────────────────────┘
                           │ Invoca registerUser(input)
                           ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 2: Lógica de Negocio / Servicios                 │
│  src/features/auth/services/register.service.ts        │
│  - Normalización de email (lowercase + trim)           │
│  - Detección de duplicados insensible a mayúsculas     │
│  - Encriptación de contraseña (bcryptjs, cost 10)      │
│  - Asignación de rol CLIENT (customer)                 │
│  - Exclusión de password_hash en la respuesta          │
└──────────────────────────┬─────────────────────────────┘
                           │ Consultas tipadas
                           ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 3: Persistencia / ORM (Prisma + Supabase)        │
│  src/lib/prisma.ts  &  prisma/schema.prisma            │
│  - PostgreSQL 17 en Supabase                           │
│  - Transaction Pooler (puerto 6543) para runtime       │
│  - Session Pooler (puerto 5432) para DDL / migraciones │
└────────────────────────────────────────────────────────┘
```

---

## 3. 📁 Archivos Creados y Modificados

### A. Capa API y Contratos (HU01-B)
1. **`src/app/api/auth/register/route.ts`** *(Nuevo)*
   * Controlador HTTP para `POST /api/auth/register`.
   * Implementa validación estricta que rechaza cuerpos vacíos, JSON con sintaxis rota y payloads con campos adicionales no autorizados (prevención de inyección de roles como `ADMIN`).
   * No interactúa con Prisma ni SQL directo.
2. **`docs/swagger/auth-register.swagger.json`** *(Nuevo)*
   * Contrato formal en formato OpenAPI 3.0 / Swagger describiendo la ruta, esquema del cuerpo requerido y las respuestas esperadas (`201 Created`, `400 Bad Request`, `409 Conflict`, `500 Internal Server Error`).
3. **`tests/unit/register.route.test.mjs`** *(Nuevo)*
   * Suite de pruebas automatizadas del Route Handler que valida los 5 criterios de aceptación de la API (Content-Type, cuerpo vacío, campos extra, validación de formato y existencia del contrato Swagger).

### B. Capa de Lógica de Negocio y Dominio (`src/features/auth`)
1. **`src/features/auth/types/index.ts`** *(Nuevo)*: Interfaces TypeScript (`RegisterInput`, `RegisteredUser`).
2. **`src/features/auth/errors/auth.errors.ts`** *(Nuevo)*: Clases de error de negocio (`UserAlreadyExistsError`, `RoleNotFoundError`, `AuthValidationError`).
3. **`src/features/auth/schemas/register.schema.ts`** *(Nuevo)*: Esquema Zod con validación de nombre (mínimo 2 letras), email válido y contraseña (mínimo 8 caracteres).
4. **`src/features/auth/services/register.service.ts`** *(Nuevo)*: Servicio que ejecuta la creación de usuarios con encriptación y verificación de duplicados.
5. **`src/features/auth/index.ts`** *(Nuevo)*: Barrel export para el módulo de autenticación.
6. **`src/lib/password.ts`** *(Nuevo)*: Utilidad segura para hashing con `bcryptjs` (salt rounds: 10).
7. **`tests/unit/register.service.test.mjs`** *(Nuevo)*: 5 pruebas unitarias para la lógica del servicio.

### C. Configuración de Base de Datos y Entorno
1. **`prisma/schema.prisma`** *(Nuevo)*: Introspección de las 9 tablas de Supabase (`users`, `roles`, `services`, `bookings`, `payments`, `tickets`, `categories`, `service_schedules`, `access_logs`) y sus relaciones/enums.
2. **`src/lib/prisma.ts`** *(Nuevo)*: Singleton de `PrismaClient` para evitar sobrecarga de conexiones en el hot-reload de Next.js.
3. **`scripts/test-db.mjs`** *(Nuevo)*: Script para comprobar la conexión directa a PostgreSQL y listar roles.
4. **`.env.local` y `.env`**: Corrección de sintaxis de la URL de conexión (eliminación de comillas anidadas y líneas rotas sin comentar).
5. **`src/middleware.ts`**: Implementación de middleware base de Next.js (`NextResponse.next()`) para resolver el error que bloqueaba `next build`.

### D. Documentación y Configuración del Proyecto
1. **`package.json`**:
   * Instalación de Prisma 6 estable (`prisma@6` y `@prisma/client@6`) en lugar de versiones release candidate incompatibles.
   * Adición de scripts de utilidad: `npm run db:pull`, `npm run db:generate`, `npm run db:studio`, `npm run db:test`, `npm test`.
2. **`README.md`**: Actualizado con la guía de configuración local de base de datos, tabla de troubleshooting y documentación del endpoint de registro.
3. **`docs/PULL_REQUEST_HU01_AUTH_API.md`** *(Nuevo)*: Plantilla completa para el Pull Request con criterios de aceptación cumplidos y checklist de Code Review.
4. **`docs/PULL_REQUEST_BACKEND_SETUP.md`** *(Nuevo)*: Documentación de la configuración base del backend.
5. **Sincronización de skills:** Se incorporaron `.agents/skills` y `AGENTS.md` desde `main` a las ramas `develop`, `backend` y `fe-1b/HU-01/auth-API-Jandy`.

---

## 4. ✅ Criterios de Aceptación Verificados

| Criterio de Jira | Estado | Evidencia |
| :--- | :---: | :--- |
| **Responde 201 al registrar un usuario nuevo** | Cumplido | Retorna código `201`, `success: true` y perfil creado sin exponer `password_hash`. |
| **Responde 400 si faltan campos o formato inválido** | Cumplido | Zod valida nombre (<2 car.), email malformado y contraseña (<8 car.) devolviendo `VALIDATION_ERROR`. |
| **Responde error claro si el correo ya existe (409)** | Cumplido | Captura `UserAlreadyExistsError` y responde con código `409` y mensaje descriptivo. |
| **Endpoint documentado en Swagger** | Cumplido | Especificación disponible en `docs/swagger/auth-register.swagger.json`. |
| **Caso límite: cuerpo vacío o campos extra rechazados** | Cumplido | Cuerpo vacío devuelve `MALFORMED_JSON` (400) sin tumbar el servidor; campos extra son rechazados por `.strict()`. |
| **Llamar a la lógica de negocio sin tocar la BD directo** | Cumplido | El controlador solo consume `registerUser` de la capa de servicios. |

---

## 5. 🧪 Resultados de las Pruebas

### Pruebas Automatizadas (`npm test`):
```text
✔ HU01-B: API Endpoint de registro (/api/auth/register)
  ✔ Criterio: Responde 400 si falta el encabezado Content-Type application/json
  ✔ Criterio: Caso límite - Responde 400 si el cuerpo está completamente vacío
  ✔ Criterio: Caso límite - Responde 400 si el JSON tiene campos extra no permitidos
  ✔ Criterio: Responde 400 si faltan campos obligatorios o formato inválido
  ✔ Criterio: El contrato OpenAPI / Swagger existe y documenta el endpoint

✔ HU-01: Lógica de Negocio - Registro de Usuarios
  ✔ Criterio 1: Debe registrar un usuario exitosamente con contraseña encriptada y rol CLIENT
  ✔ Criterio 2: Caso de error - Correo ya registrado devuelve un error de negocio claro
  ✔ Criterio 3: Caso límite - Correos que solo cambian en mayúsculas/minúsculas se detectan como duplicados
  ✔ Criterio 4: Valida datos obligatorios faltantes o inválidos con AuthValidationError
  ✔ Criterio 5: Caso de error cuando el rol CLIENT no se encuentra en el sistema

ℹ tests 10 | suites 2 | pass 10 | fail 0
```

### Compilación de Producción (`npm run build`):
```text
✓ Compiled successfully in 37.3s
✓ Finished TypeScript in 7.5s
Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /api/auth/register (Dynamic)
```

---

## 6. 🚀 Historial de Commits en la Rama

1. `69c9226` — `feat: se añade configuracion de base de datos supabase y modelos prisma`
2. `a634528` — `first commit` (Estructura base de archivos)
3. `3bc3f84` — `Merge remote-tracking branch into fe-1b/HU-01/auth-business-daniella`
4. `cbba212` — `feat(auth): documentacion de PR y dependencias para logica de registro (HU-01-B)`
5. `9fe24fe` — `feat: endpoint de registro de usuarios y documentacion swagger (HU01-B)`
6. `db437bf` — `style: formateo de saltos de linea en endpoint, swagger y tests`
