# 📄 Pull Request: HU03-B — API Endpoints de Confirmación y Reenvío de Correo

## 1. Información General
* **Historia de Usuario:** VCP-11 — Confirmación de Correo Electrónico
* **Subtarea:** [VCP-38] HU03-B API Endpoints de confirmación de correo
* **Rama:** `feature/HU03-B-API/confirmacion-correo/jandy-pena`
* **Desarrollador:** Jandy Peña (Capa API)
* **Dependencias:** HU03-B Lógica de negocio y HU03-BD ORM

---

## 2. Objetivo de la Tarea
Exponer y asegurar los endpoints HTTP en Next.js App Router para:
1. `POST /api/auth/confirm-email`: Confirmación de correo electrónico mediante token en el cuerpo JSON con esquema estricto Zod v4.
2. `GET /api/auth/confirm-email`: Confirmación directa cuando el usuario hace clic en el enlace de su correo (`?token=...`).
3. `POST /api/auth/resend-confirmation`: Solicitud para reenviar el correo de confirmación a un usuario registrado.
4. Mapeo semántico y riguroso de códigos HTTP:
   * `200 OK`: Confirmación o reenvío exitoso.
   * `400 Bad Request`: Parámetros inválidos, token corrupto, token ya utilizado (`TOKEN_ALREADY_USED`) o correo ya verificado.
   * `410 Gone`: Token expirado (`TOKEN_EXPIRED`), cumpliendo la especificación explícita de negocio.
   * `404 Not Found`: Usuario no registrado al solicitar reenvío.
   * `500 Internal Server Error`: Errores no controlados.
5. Documentación completa bajo la especificación OpenAPI 3.0 / Swagger en `docs/swagger/auth-confirm-email.swagger.json`.
6. Suite exhaustiva de pruebas unitarias automatizadas para la capa de API.

---

## 3. Arquitectura y Separación por Capas
Se respeta estrictamente la arquitectura modular por capas definida en las directrices de `vice-city`:

```text
[ Cliente HTTP / Frontend / Enlace de Email ]
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 1: API / Route Handlers (Jandy Peña - VCP-38)    │
│  - src/app/api/auth/confirm-email/route.ts (POST/GET)  │
│  - src/app/api/auth/resend-confirmation/route.ts (POST)│
│                                                        │
│  - Valida Content-Type (application/json) en POST      │
│  - Captura cuerpo vacío o JSON malformado (HTTP 400)   │
│  - Valida esquemas Zod .strict() sin campos extra      │
│  - Mapea códigos de estado (200, 400, 410, 404, 500)   │
│  - 0 consultas a Prisma / Supabase                     │
└──────────────────────────┬─────────────────────────────┘
                           │ Invoca contratos desacoplados
                           ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 2: Lógica de Negocio / Servicios (HU03-B)        │
│  src/features/auth/services/confirm-email.service.ts   │
│  - confirmUserEmail({ token })                         │
│  - resendConfirmationEmail({ email })                  │
│  - Lanza excepciones fuertemente tipadas de dominio:   │
│    * TokenExpiredError                                 │
│    * InvalidTokenError                                 │
│    * TokenAlreadyUsedError                              │
│    * UserNotFoundError                                 │
│    * EmailAlreadyConfirmedError                        │
└──────────────────────────┬─────────────────────────────┘
                           │ Consultas tipadas ORM
                           ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 3: Persistencia / Base de Datos (HU03-BD)        │
│  src/lib/prisma.ts  &  prisma/schema.prisma            │
└────────────────────────────────────────────────────────┘
```

---

## 4. Endpoints Expuestos y Contratos

### `POST /api/auth/confirm-email`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "token": "vcp_token_abc123xyz789"
}
```
* **Respuestas:**
  * `200 OK`: `{ "success": true, "message": "Correo electrónico confirmado exitosamente", "data": { "email": "...", "emailVerified": true } }`
  * `400 Bad Request`: Token faltante, token inválido o token ya consumido (`TOKEN_ALREADY_USED`).
  * `410 Gone`: Token expirado (`TOKEN_EXPIRED`).

### `GET /api/auth/confirm-email?token=...`
* **Query Params:** `token` (string requerido)
* **Respuestas:** Idénticas al método `POST`, ideal para links enviados directamente por correo.

### `POST /api/auth/resend-confirmation`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```
* **Respuestas:**
  * `200 OK`: `{ "success": true, "message": "Correo de confirmación reenviado exitosamente", "data": { "email": "..." } }`
  * `400 Bad Request`: Email inválido, payload malformado o correo ya confirmado.
  * `404 Not Found`: Usuario no registrado en el sistema (`USER_NOT_FOUND`).

---

## 5. Criterios de Aceptación Cumplidos
- [x] **Un token válido confirma el correo y responde 200.**
- [x] **Caso de error: un token inválido devuelve un error claro (400 Bad Request / `INVALID_TOKEN`).**
- [x] **Caso de error: un token expirado devuelve 410 Gone (`TOKEN_EXPIRED`).**
- [x] **Caso límite: usar el mismo token dos veces es rechazado (400 Bad Request / `TOKEN_ALREADY_USED`).**
- [x] **Caso límite: cuerpo vacío o payload con campos extra rechazado con 400 (`.strict()`).**
- [x] **Los endpoints aparecen en Swagger (`docs/swagger/auth-confirm-email.swagger.json`).**
- [x] **Desacoplamiento total:** La capa API no accede a Prisma ni ejecuta persistencia directa.

---

## 6. Archivos Creados y Modificados

```text
vice-city/
├── docs/
│   ├── swagger/
│   │   └── auth-confirm-email.swagger.json          # Especificación Swagger / OpenAPI 3.0.3 (Nuevo)
│   └── PULL_REQUEST_HU03_AUTH_CONFIRMATION_API.md   # Documentación del Pull Request (Nuevo)
├── src/
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           ├── confirm-email/
│   │           │   └── route.ts                     # Route Handler POST y GET (Nuevo)
│   │           └── resend-confirmation/
│   │               └── route.ts                     # Route Handler POST (Nuevo)
│   └── features/
│       └── auth/
│           ├── errors/
│           │   └── auth.errors.ts                   # Excepciones tipadas de dominio (Modificado)
│           ├── schemas/
│           │   ├── confirm-email.schema.ts          # Esquema Zod de confirmación (Nuevo)
│           │   └── resend-confirmation.schema.ts    # Esquema Zod de reenvío (Nuevo)
│           ├── services/
│           │   └── confirm-email.service.ts         # Contratos desacoplados de negocio (Nuevo)
│           ├── types/
│           │   └── index.ts                         # Tipos TypeScript para HU03 (Modificado)
│           └── index.ts                             # Exportación centralizada del módulo (Modificado)
└── tests/
    └── unit/
        └── confirm-email.route.test.mjs             # Suite de pruebas unitarias (Nuevo - 16 tests)
```

---

## 7. Ejecución de Pruebas
```bash
npm test
```
**Resultado:** 5 suites, 40 pruebas unitarias pasando con 0 errores (incluyendo 16 pruebas dedicadas a HU03-B).
