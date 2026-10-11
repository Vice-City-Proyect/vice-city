# 📄 Pull Request: HU02-B — API Endpoints de Inicio de Sesión y Consulta de Sesión

## 1. Información General
* **Historia de Usuario:** HU02-B - API Endpoint de sesión y login
* **Rama:** `fe-1b/HU-02-B/auth-API-Jandy`
* **Desarrollador:** Jandy Peña (Capa API)
* **Dependencias integradas:** VCP-21 (Daniela Zapata - Lógica de Negocio y NextAuth JWT), VCP-33 (José - ORM Prisma), VCP-27 (Swagger).

---

## 2. Objetivo de la Tarea
Exponer los endpoints HTTP en Next.js App Router para:
1. `POST /api/auth/login`: Autenticación de credenciales, validación estricta de entrada con Zod v4, delegación al servicio de negocio (`authenticateUser`), y retorno de sesión estructurada con roles del SRS (`ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`).
2. `GET /api/auth/session`: Consulta del estado de autenticación y datos de la sesión actual a través de NextAuth (`getServerSession`).
3. Documentación OpenAPI 3.0.3 en Swagger.
4. Suite de pruebas unitarias automatizadas para la capa de API.

---

## 3. Arquitectura y Separación por Capas
Se respeta estrictamente la arquitectura modular y desacoplada del proyecto:

```text
HTTP Client (CURL / Postman / Frontend)
           ↓
src/app/api/auth/login/route.ts  &  src/app/api/auth/session/route.ts (Capa API)
           ↓ (Valida headers, JSON y Zod .strict())
src/features/auth/schemas/login.schema.ts
           ↓ (Invoca sin importar Prisma)
src/lib/auth.ts (authenticateUser & authOptions - Daniela VCP-21)
           ↓
src/lib/prisma.ts (Instancia compartida)
           ↓
PostgreSQL / Supabase
```

* **Cero consultas a Prisma en las rutas API:** La capa API no accede a Prisma, no hashea contraseñas ni crea modelos.
* **Seguridad y Validación Estricta:** Manejo riguroso de `Content-Type: application/json`, cuerpos vacíos, JSON malformado y rechazo de campos desconocidos mediante `loginSchema.strict()`.

---

## 4. Endpoints Expuestos

### `POST /api/auth/login`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123!"
}
```
* **Códigos HTTP de respuesta:**
  * `200 OK`: Credenciales válidas. Retorna `{ success: true, message: "Inicio de sesión exitoso", data: { id, email, name, role } }`.
  * `400 Bad Request`: Content-Type faltante, JSON malformado, cuerpo vacío, campos faltantes o campos extra no permitidos.
  * `401 Unauthorized`: Credenciales erróneas o rol no perteneciente al SRS.
  * `500 Internal Server Error`: Fallo no controlado.

### `GET /api/auth/session`
* **Sin sesión activa:** `200 OK` con `{ success: true, authenticated: false, data: null }`.
* **Con sesión activa:** `200 OK` con `{ success: true, authenticated: true, data: { id, email, name, role } }`.

---

## 5. Criterios de Aceptación Cumplidos
- [x] Login correcto devuelve una sesión con `id`, `email` y `role` (`ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`).
- [x] Credenciales incorrectas devuelven `401 Unauthorized` con mensaje claro.
- [x] Endpoints documentados en Swagger (`docs/swagger/auth-login.swagger.json`).
- [x] Body vacío devuelve `400 Bad Request`.
- [x] Campos requeridos faltantes devuelven `400 Bad Request`.
- [x] Campos extra inyectados son rechazados con `400 Bad Request` por `loginSchema.strict()`.
- [x] Suite completa de pruebas automatizadas passing (24/24 pruebas).
- [x] Compilación de producción `npm run build` ejecutada exitosamente con Turbopack.

