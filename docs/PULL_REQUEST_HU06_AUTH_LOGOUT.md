# 📄 Documentación de Pull Request: HU06 — Cierre de Sesión (Backend Completo)

## 1. Información General
* **Historia de Usuario:** `HU06` — Cierre de sesión
* **Subtareas Abordadas:**
  * `HU06-B LN`: Lógica de negocio de cierre de sesión
  * `HU06-B API`: Endpoint de cierre de sesión y protección de rutas
* **Rama:** `feature/HU06-B-API/cierre-sesion/jandy-pena`
* **Rama Base (Target PR):** `feature/fe-1b/auth`
* **Desarrollador Responsable:** Jandy Peña (`BlurTrace`)
* **Dependencias:** `VCP-21` (Autenticación y sesiones JWT en NextAuth v4)

---

## 2. Justificación Arquitectónica: ¿Por qué no se requiere capa ORM?
En la arquitectura de Vice City, la autenticación y las sesiones operan bajo el estándar de **JWT sin estado (stateless JWT)** (`session: { strategy: "jwt" }` en `authOptions`).

* En este esquema, el servidor no almacena registros de sesiones en la base de datos (no existe una tabla `sessions`). El estado reside exclusivamente en la cookie criptográficamente firmada del cliente (`next-auth.session-token`).
* Para cerrar sesión e invalidar el acceso de forma segura, el servidor emite encabezados HTTP `Set-Cookie` con `Max-Age=0` y `Expires=Thu, 01 Jan 1970 00:00:00 GMT` para todas las cookies de autenticación, destruyendo el token en el cliente.
* Al no existir mutaciones de base de datos ni consultas SQL necesarias, **esta historia no requiere subtarea ORM**.

---

## 3. Descripción de los Cambios Realizados

### A. Capa de Lógica de Negocio (`HU06-B LN`):
* **Servicio de Logout (`src/features/auth/services/logout.service.ts`):**
  * `generateExpiredCookies(isSecure)`: Genera los descriptores de expiración inmediata para todas las cookies de NextAuth (`next-auth.session-token`, `__Secure-next-auth.session-token`, `next-auth.csrf-token`, `__Host-next-auth.csrf-token`, `next-auth.callback-url`, etc.).
  * `invalidateSession(token, options)`: Lógica de invalidación de sesión segura e idempotente.
  * **Manejo de Errores e Idempotencia:** Si el token no existe, ya expiró o está malformado, la operación procede sin lanzar excepciones y asegura la purga de cookies en el cliente.
  * `applyExpiredCookies(response, expiredCookies)`: Inyecta los encabezados `Set-Cookie` en la respuesta de Next.js.

### B. Capa API y Endpoints (`HU06-B API`):
* **Route Handler de Cierre de Sesión (`src/app/api/auth/logout/route.ts`):**
  * **`POST /api/auth/logout`:** Endpoint REST que invoca la lógica de negocio, adjunta los encabezados `Set-Cookie` de expiración inmediata y retorna el sobre estándar:
    ```json
    {
      "success": true,
      "message": "Sesión cerrada exitosamente.",
      "data": {
        "loggedOut": true,
        "redirectTo": "/login"
      }
    }
    ```
  * **`GET /api/auth/logout`:** Permite navegaciones directas o enlaces de salida emitiendo una redirección HTTP hacia `/login` tras purgar las cookies.
* **Integración con NextAuth (`src/lib/auth.ts` y `src/app/api/auth/[...nextauth]/route.ts`):**
  * Configuración de `pages.signOut = "/login"` en `authOptions`, permitiendo que la acción nativa de NextAuth `signOut()` redirija directamente al login.
* **Middleware de Protección de Rutas (`src/middleware.ts`):**
  * Intercepta peticiones hacia `/client/*`, `/admin/*` y `/employee/*`.
  * Si el usuario cerró sesión (las cookies fueron eliminadas) o no cuenta con token de sesión activo, redirige automáticamente al login (`/login?callbackUrl=...`).

### C. Documentación Swagger / OpenAPI 3.0 (`docs/swagger/auth-logout.swagger.json`):**
* Especificación OpenAPI 3.0.3 documentando:
  * `POST /api/auth/logout`
  * `GET /api/auth/logout`
  * `POST /api/auth/signout`
  * Respuestas HTTP 200, 302 y esquemas de respuesta.

---

## 4. Criterios de Aceptación Verificados

### Criterios de HU06-B LN (Lógica de Negocio):
- [x] **La sesión y las cookies quedan eliminadas:** `generateExpiredCookies` genera expiración para todas las cookies de NextAuth con `Max-Age=0` y `Expires=1970`.
- [x] **Caso de error: un token ya vencido no genera error al cerrar sesión:** Operación idempotente verificada en `tests/unit/logout.service.test.mjs`.
- [x] **Caso límite: cerrar sesión en varias pestañas deja todas sin acceso:** Al expirar las cookies a nivel del cliente/navegador, todas las pestañas pierden sus credenciales compartidas.
- [x] **Pruebas unitarias de la lógica:** Suite de 6 pruebas unitarias aprobadas en `tests/unit/logout.service.test.mjs`.

### Criterios de HU06-B API (Capa API):
- [x] **Cerrar sesión elimina la sesión y redirige al login:** `POST /api/auth/logout` devuelve `redirectTo: "/login"` con cookies expiradas; `GET /api/auth/logout` redirige directamente a `/login`.
- [x] **Caso de error: cerrar sesión sin una sesión activa no produce error:** Peticiones sin sesión activa responden 200 OK de forma limpia e idempotente.
- [x] **Caso límite: después de cerrar sesión, las rutas protegidas ya no son accesibles:** El middleware intercepta intentos de acceso a `/client/*`, `/admin/*` y `/employee/*` sin cookies de sesión y redirige a `/login`.
- [x] **Pruebas unitarias de la API:** Suite de 7 pruebas unitarias aprobadas en `tests/unit/logout.api.test.mjs`.

---

## 5. Archivos Creados y Modificados

```text
├── docs/
│   ├── PULL_REQUEST_HU06_AUTH_LOGOUT.md       # Documentación de este PR
│   └── swagger/
│       └── auth-logout.swagger.json           # Contrato OpenAPI 3.0.3 de cierre de sesión
├── src/
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           └── logout/
│   │               └── route.ts               # Route Handler POST/GET /api/auth/logout
│   ├── features/
│   │   └── auth/
│   │       ├── index.ts                       # Exportaciones públicas de logoutService
│   │       └── services/
│   │           └── logout.service.ts          # Lógica de negocio de invalidación y cookies
│   ├── lib/
│   │   └── auth.ts                            # Configuración signOut: "/login" en NextAuth
│   └── middleware.ts                          # Protección de rutas /client, /admin, /employee
└── tests/
    └── unit/
        ├── logout.service.test.mjs            # Pruebas unitarias de lógica de negocio (HU06-B LN)
        └── logout.api.test.mjs                # Pruebas unitarias de API y Middleware (HU06-B API)
```

---

## 6. Instrucciones de Ejecución y Pruebas

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar únicamente las pruebas de cierre de sesión
npx tsx --test tests/unit/logout*.test.mjs
```

