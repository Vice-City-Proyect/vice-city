# 📄 Documentación de Pull Request: API Endpoint de Registro de Usuarios (HU01-B)

## 1. Información General
* **Historia de Usuario:** HU-01 - Autenticación y Registro de Usuarios
* **Subtarea:** HU01-B API Endpoint de registro (VCP-27)
* **Módulo:** Backend / Capa API (`src/app/api/auth/register`)
* **Rama:** `fe-1b/HU-01/auth-API-Jandy`
* **Desarrollador:** Jandy Peña

---

## 2. Objetivo de la Tarea
Implementar el Route Handler (`/api/auth/register`) en Next.js App Router para recibir los datos del formulario de registro, validar la entrada en el servidor, delegar la ejecución a la capa de lógica de negocio (sin acceder directamente a la base de datos) y responder con los códigos HTTP y contratos estructurados correspondientes, documentando el endpoint en Swagger / OpenAPI 3.0.

---

## 3. Criterios de Aceptación Cumplidos

- [x] **Responde 201 Created al registrar un usuario nuevo:**
  * Retorna `{ success: true, message: "Usuario registrado exitosamente", data: user }` sin exponer datos sensibles (`password_hash`).
- [x] **Responde 400 Bad Request si faltan campos obligatorios o el formato es inválido:**
  * Valida `fullName` (mínimo 2 caracteres), `email` (formato email) y `password` (mínimo 8 caracteres) retornando detalles estructurados.
- [x] **Responde 409 Conflict si el correo ya existe:**
  * Captura `UserAlreadyExistsError` de la lógica de negocio y responde con `{ error: "USER_ALREADY_EXISTS", message: "El correo electrónico ya se encuentra registrado" }`.
- [x] **Documentación del endpoint en Swagger / OpenAPI 3.0:**
  * Especificación OpenAPI 3.0 completa en `docs/swagger/auth-register.swagger.json`.
- [x] **Caso límite: cuerpo vacío o campos extra:**
  * Cuerpo vacío o JSON malformado se rechaza con `400 Bad Request` sin romper el servidor.
  * Payloads con campos extra no reconocidos se rechazan con `400 Bad Request` mediante esquema `.strict()`.
- [x] **Arquitectura desacoplada por capas:**
  * La API invoca únicamente a `registerUser` de `@/features/auth/services/register.service`. No importa `PrismaClient` ni accede a la base de datos.
- [x] **Pruebas automatizadas (10/10 pasando):**
  * Suite de pruebas unitarias en `tests/unit/register.route.test.mjs` y `tests/unit/register.service.test.mjs`.

---

## 4. Archivos Creados y Modificados

```text
vice-city/
├── docs/
│   ├── swagger/
│   │   └── auth-register.swagger.json       # Especificación Swagger / OpenAPI 3.0
│   └── PULL_REQUEST_HU01_AUTH_API.md        # Documentación para el PR
├── src/
│   └── app/
│       └── api/
│           └── auth/
│               └── register/
│                   └── route.ts             # Route Handler del endpoint POST /api/auth/register
├── tests/
│   └── unit/
│       └── register.route.test.mjs          # Pruebas automatizadas del endpoint
├── package.json                             # Script de prueba multi-suite (npm test)
└── readme.md                                # Documentación actualizada del endpoint
```

---

## 5. Guía de Ejecución y Pruebas

### A. Ejecutar Pruebas Automatizadas
```bash
npm test
```
**Salida esperada:**
```text
▶ HU01-B: API Endpoint de registro (/api/auth/register)
  ✔ Criterio: Responde 400 si falta el encabezado Content-Type application/json
  ✔ Criterio: Caso límite - Responde 400 si el cuerpo está completamente vacío
  ✔ Criterio: Caso límite - Responde 400 si el JSON tiene campos extra no permitidos
  ✔ Criterio: Responde 400 si faltan campos obligatorios o formato inválido
  ✔ Criterio: El contrato OpenAPI / Swagger existe y documenta el endpoint
✔ HU01-B: API Endpoint de registro (/api/auth/register)
ℹ tests 10 | pass 10 | fail 0
```

### B. Pruebas Manuales con curl
```bash
# 1. Registro exitoso (201)
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Jandy Peña", "email": "jandy@test.com", "password": "Password123!"}'

# 2. Validación de campos (400)
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName": "J", "email": "invalido", "password": "123"}'

# 3. Caso límite: cuerpo vacío (400)
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d ''

# 4. Correo ya registrado (409)
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Jandy Peña", "email": "jandy@test.com", "password": "Password123!"}'
```

### C. Compilación de Producción
```bash
npm run build
```
Genera la ruta `/api/auth/register` (Dynamic) sin errores de TypeScript.
