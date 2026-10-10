# 📄 Pull Request: HU04-B API — Endpoints de Recuperación y Restablecimiento de Contraseña

## 1. Información General
* **Historia de Usuario:** HU-04 — Recuperación de Contraseña
* **Subtarea:** HU04-B API — Endpoints HTTP y Documentación Swagger
* **Rama:** `feature/HU04-B-API/recuperacion-contrasena/jandy-pena`
* **Rama Base:** `feature/HU04-B-LN/logica-recuperacion/daniela-zapata`
* **Desarrollador:** Jandy Peña (Capa API)
* **Dependencias Integradas:**
  * **HU04-BD:** José Gutiérrez (ORM Prisma - Modelo `verification_tokens` y repositorio atómico).
  * **HU04-B LN:** Daniela Zapata (Lógica de Negocio - `PasswordResetService`, `IEmailSender` y errores de dominio).

---

## 2. Objetivo de la Tarea
Exponer y asegurar los endpoints HTTP en Next.js App Router para el flujo completo de recuperación de contraseña:
1. `POST /api/auth/forgot-password`: Recepción de correo electrónico, validación de formato mediante Zod estricto, generación de token criptográfico seguro de un solo uso con vigencia de 1 hora y despacho desacoplado por correo.
2. `POST /api/auth/reset-password`: Consumo del token y establecimiento de nueva contraseña con validación de fortaleza (mínimo 8 caracteres), encriptación con `bcryptjs` y consumo atómico en la base de datos.
3. `GET /api/auth/reset-password`: Consulta previa y validación del estado del token sin consumirlo, permitiendo a la UI comprobar si el enlace sigue vigente antes de desplegar el formulario al usuario.
4. Mapeo semántico de códigos HTTP:
   * `200 OK`: Éxito en solicitud, restablecimiento o validación de token activo.
   * `400 Bad Request`: Token inválido o ya consumido (`INVALID_TOKEN`), contraseña débil (`WEAK_PASSWORD`), cuerpo malformado o campos extra (`VALIDATION_ERROR`).
   * `410 Gone`: Token expirado (`TOKEN_EXPIRED`), superó la ventana de 1 hora.
   * `404 Not Found`: Correo no registrado en el sistema (`USER_NOT_FOUND`).
   * `500 Internal Server Error`: Errores no controlados.
5. Documentación completa bajo la especificación OpenAPI 3.0.3 / Swagger en `docs/swagger/auth-password-reset.swagger.json`.
6. Suite exhaustiva de pruebas unitarias automatizadas para la capa de API.

---

## 3. Arquitectura y Separación por Capas

```text
[ Cliente Web / Móvil / Formulario ]
                │
                ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 1: API / Route Handlers (Jandy Peña)             │
│  - src/app/api/auth/forgot-password/route.ts (POST)    │
│  - src/app/api/auth/reset-password/route.ts (POST/GET) │
│                                                        │
│  - Valida Content-Type (application/json)              │
│  - Captura cuerpo vacío o JSON malformado (HTTP 400)   │
│  - Valida esquemas Zod con .strict()                   │
│  - Mapea códigos de estado (200, 400, 410, 404, 500)   │
│  - Cero consultas a Prisma / Supabase                  │
└──────────────────────────┬─────────────────────────────┘
                           │ Invoca servicios desacoplados
                           ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 2: Lógica de Negocio / Servicios (Daniela Zapata)│
│  src/features/auth/services/password-reset.service.ts  │
│  - requestPasswordReset(email, clientBaseUrl)          │
│  - resetPassword(token, newPassword)                   │
│  - validateTokenStatus(token)                          │
│  - Lanza excepciones tipadas de dominio:               │
│    * PasswordResetTokenExpiredError (TOKEN_EXPIRED)    │
│    * InvalidPasswordResetTokenError (INVALID_TOKEN)    │
│    * UserNotFoundError (USER_NOT_FOUND)                │
│    * WeakPasswordError (WEAK_PASSWORD)                 │
└──────────────────────────┬─────────────────────────────┘
                           │ Operaciones atómicas ORM
                           ▼
┌────────────────────────────────────────────────────────┐
│  CAPA 3: Persistencia / ORM Prisma (José Gutiérrez)   │
│  src/features/users/password-reset.repository.ts       │
│  - Tabla verification_tokens (type: password_reset)   │
│  - Hashes SHA-256 en BD y expiración de 1h             │
└────────────────────────────────────────────────────────┘
```

---

## 4. Endpoints Expuestos y Contratos

### `POST /api/auth/forgot-password`
* **Header:** `Content-Type: application/json`
* **Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```
* **Respuestas:**
  * `200 OK`: `{ "success": true, "message": "Se ha enviado un enlace de recuperación a tu correo electrónico." }`
  * `400 Bad Request`: Formato de correo inválido, cuerpo vacío o campos extra.
  * `404 Not Found`: No existe una cuenta registrada con dicho correo (`USER_NOT_FOUND`).

### `POST /api/auth/reset-password`
* **Header:** `Content-Type: application/json`
* **Body:**
```json
{
  "token": "vcp_token_abc123xyz789",
  "newPassword": "NuevaContraseñaSegura123!"
}
```
* **Respuestas:**
  * `200 OK`: `{ "success": true, "message": "Tu contraseña ha sido restablecida exitosamente." }`
  * `400 Bad Request`: Contraseña menor a 8 caracteres (`WEAK_PASSWORD`), token inválido o ya utilizado (`INVALID_TOKEN`).
  * `410 Gone`: Token expirado tras 1 hora (`TOKEN_EXPIRED`).

### `GET /api/auth/reset-password?token=...`
* **Query Params:** `token` (string requerido)
* **Respuestas:**
  * `200 OK`: `{ "success": true, "message": "Token de recuperación válido.", "data": { "isValid": true } }`
  * `400 Bad Request`: Token no encontrado o ya consumido (`TOKEN_ALREADY_USED` / `INVALID_TOKEN`).
  * `410 Gone`: Token expirado (`TOKEN_EXPIRED`).

---

## 5. Criterios de Aceptación Verificados
- [x] Solicitud con correo válido genera token, envía correo y responde 200.
- [x] Solicitud con correo inexistente responde 404 con mensaje claro (`USER_NOT_FOUND`).
- [x] Restablecer con token válido guarda la nueva contraseña encriptada y responde 200.
- [x] Restablecer con contraseña débil (< 8 caracteres) responde 400 Bad Request (`WEAK_PASSWORD`).
- [x] Restablecer con token expirado (superó 1 hora) responde 410 Gone (`TOKEN_EXPIRED`).
- [x] Restablecer con token ya utilizado responde 400 Bad Request (`INVALID_TOKEN`).
- [x] Endpoint GET permite a la UI validar el estado del token antes de enviar el formulario.
- [x] Cuerpos vacíos o campos no reconocidos son rechazados con 400 Bad Request (`.strict()`).
- [x] Contrato OpenAPI 3.0 / Swagger documentado en `docs/swagger/auth-password-reset.swagger.json`.
- [x] Desacoplamiento total: la capa API no accede directamente a Prisma ni a la base de datos.

---

## 6. Archivos Creados y Modificados
```text
vice-city/
├── docs/
│   ├── swagger/
│   │   └── auth-password-reset.swagger.json         # Especificación OpenAPI 3.0.3 (Nuevo)
│   └── PULL_REQUEST_HU04_AUTH_RESET_API.md          # Documentación del PR (Nuevo)
├── package.json                                     # Agregado zod y scripts de test multi-suite (Modificado)
├── src/
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           ├── forgot-password/
│   │           │   └── route.ts                     # Route Handler POST /forgot-password (Nuevo)
│   │           └── reset-password/
│   │               └── route.ts                     # Route Handler POST y GET /reset-password (Nuevo)
│   └── features/
│       └── auth/
│           ├── schemas/
│           │   ├── forgot-password.schema.ts        # Esquema Zod con .strict() (Nuevo)
│           │   └── reset-password.schema.ts         # Esquemas Zod con .strict() (Nuevo)
│           ├── types/
│           │   └── password-reset.types.ts          # Interfaces TypeScript (Nuevo)
│           └── index.ts                             # Exportación centralizada del módulo (Modificado)
└── tests/
    └── unit/
        └── password-reset.route.test.mjs            # 18 pruebas unitarias de API (Nuevo)
```

---

## 7. Ejecución de Pruebas Automatizadas
```bash
npm test
```
**Resultado:** 2 suites, 24 pruebas pasando exitosamente (18 pruebas de API + 6 pruebas de Lógica de Negocio de Daniela) con 0 fallos.
