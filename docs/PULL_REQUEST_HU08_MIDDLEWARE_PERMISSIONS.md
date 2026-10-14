# 📄 Documentación de Pull Request: HU08 — Protección de Rutas y Permisos (Middleware)

## 1. Información General
* **Historia de Usuario:** `HU08` — Protección de rutas y permisos (Middleware)
* **Subtareas Abordadas:**
  * `HU08-B LN`: Lógica de negocio de permisos por rol
  * `HU08-B API`: Middleware de protección de rutas y permisos
* **Rama:** `feature/HU08/middleware-rutas/jandy-pena`
* **Rama Destino (Base):** `feature/fe-1b/auth` (o `develop`)
* **Desarrollador Responsable:** Jandy Peña (`BlurTrace`)
* **Dependencias:** `VCP-21` (Autenticación y sesiones JWT en NextAuth v4)

---

## 2. Justificación Arquitectónica: ¿Por qué no se requiere capa ORM?
La propia especificación de Jira lo establece explícitamente:
> *"Esta historia no lleva subtarea ORM, porque los permisos viven en el código y no en la base de datos."*

* Las reglas de acceso y perfiles de usuario corresponden a la **Sección 8 del SRS de Vice City**, la cual define de forma estática los 4 roles del sistema y sus dominios de operación.
* Mantener la matriz de permisos en memoria dentro del código garantiza latencia mínima (0 ms) en la ejecución del Edge / Server Middleware de Next.js en cada solicitud entrante, sin sobrecargar la base de datos de Supabase con consultas repetitivas de permisos.

---

## 3. Descripción de los Cambios Implementados

### A. Capa de Lógica de Negocio (`HU08-B LN`):
* **Módulo de Permisos (`src/features/auth/permissions/route-permissions.ts`):**
  * `SRS_ROLES`: Define los 4 roles del SRS (`ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`).
  * `normalizeRole(role)`: Normaliza nombres de roles y resuelve alias legacy (`CUSTOMER` -> `CLIENT`).
  * `ROUTE_PERMISSION_RULES`: Matriz estricta de rutas según la sección 8 del SRS:
    * `/admin/*` y `/api/admin/*` -> `ADMIN`
    * `/employee/pos/*` y `/api/employee/pos/*` -> `TICKET_SELLER`, `ADMIN`
    * `/employee/qr-scanner/*`, `/employee/scan/*` y `/api/employee/scan/*` -> `QR_VALIDATOR`, `ADMIN`
    * `/employee/*` y `/api/employee/*` -> `TICKET_SELLER`, `QR_VALIDATOR`, `ADMIN`
    * `/client/*` y `/api/client/*` -> `CLIENT`, `ADMIN`
  * `isPublicRoute(pathname)`: Identifica rutas públicas (`/`, `/login`, `/register`, `/api/auth/*`, etc.) que no requieren autenticación.
  * `isRouteAllowed(role, pathname)`: Función principal que valida si un rol tiene permiso sobre una ruta específica.
  * **Caso de error:** Roles desconocidos, vacíos o nulos son denegados de inmediato para rutas protegidas.
  * **Caso límite:** Rutas anidadas y con parámetros dinámicos (ej. `/admin/users/123/edit`, `/employee/pos/orders/new`) heredan y respetan estrictamente la regla de su ruta padre.

### B. Capa API y Middleware (`HU08-B API`):
* **Middleware de Next.js (`src/middleware.ts`):**
  * **Exclusión de Assets:** Pasa directamente recursos de `/_next`, `/static`, imágenes y archivos estáticos.
  * **Paso Libre a Rutas Públicas:** Permite el acceso inmediato a páginas de autenticación y recursos públicos sin consultar sesión.
  * **Lectura Segura de Sesión (`getToken`):** Utiliza la función oficial de NextAuth `getToken({ req, secret })` para validar criptográficamente la firma y vigencia del JWT.
  * **Caso Límite (Token vencido o manipulado):** Se trata como ausencia de sesión.
  * **Manejo Dual según Tipo de Ruta:**
    * **Rutas API (`/api/*`):**
      * Sin sesión: responde `401 Unauthorized` `{ success: false, error: "UNAUTHORIZED" }`.
      * Con rol sin permiso: responde `403 Forbidden` `{ success: false, error: "FORBIDDEN", requiredRoles: [...] }`.
    * **Rutas Web (`/admin/*`, `/client/*`, `/employee/*`):**
      * Sin sesión: redirige al login con parámetro de retorno (`/login?callbackUrl=...`).
      * Con rol sin permiso: redirige a la vista de acceso denegado (`/unauthorized?error=AccessDenied`).

---

## 4. Criterios de Aceptación Verificados

### Criterios de HU08-B LN (Lógica de Negocio):
- [x] **La matriz coincide con los permisos del SRS:** Verificada cobertura para `ADMIN`, `CLIENT`, `TICKET_SELLER` y `QR_VALIDATOR`.
- [x] **Caso de error: un rol desconocido o vacío siempre es denegado:** Comprobado que roles nulos, vacíos o no registrados (`GUEST`, `SUPERUSER`) retornan `false`.
- [x] **Caso límite: rutas anidadas y con parámetros respetan el permiso de su ruta padre:** Validado que `/admin/users/123/edit` respeta el permiso de `/admin` y `/employee/pos/orders/new` el de `/employee/pos`.
- [x] **Pruebas unitarias para los cuatro roles:** 9 pruebas unitarias aprobadas en `tests/unit/permissions.service.test.mjs`.

### Criterios de HU08-B API (Middleware de Rutas):
- [x] **Un usuario sin sesión es redirigido al login:** Redirige a `/login?callbackUrl=...` para páginas web y responde 401 en `/api/*`.
- [x] **Cada rol solo accede a sus rutas:** `ADMIN` accede a administración y herramientas; `TICKET_SELLER` a POS; `QR_VALIDATOR` a escáner; `CLIENT` a dashboard de cliente.
- [x] **Caso de error: un rol sin permiso no accede, con respuesta clara:** Responde 403 en endpoints API y redirige a `/unauthorized` en vistas web.
- [x] **Caso límite: un token vencido o manipulado se trata como sin sesión:** Peticiones con tokens inválidos son rechazadas y dirigidas al login.
- [x] **Pruebas unitarias de la API:** 10 pruebas unitarias aprobadas en `tests/unit/middleware.test.mjs`.

---

## 5. Corrección de Integración (FT-07 / HU08 — Hallazgos 1 y 2)

### A. Hallazgo 1: Endpoints Públicos Bloqueados (401 Unauthorized)
* **Problema:** Los endpoints públicos del flujo de compra y reservas (`/api/catalog`, `/api/availability`, `/api/pricing/calculate`, `/api/reservations/hold`, `/api/reservations/:id`, `/api/payments/create-intent`, `/api/payments/webhook`) no estaban registrados en `PUBLIC_ROUTE_PATTERNS`, por lo que el middleware los trataba como rutas protegidas y respondía `401 Unauthorized`.
* **Solución:** Se incluyeron los patrones de ruta correspondientes en `PUBLIC_ROUTE_PATTERNS` en `src/features/auth/permissions/route-permissions.ts`, permitiendo que clientes anónimos y pasarelas de pago (Stripe Webhook) puedan acceder sin requerir sesión previa.

### B. Hallazgo 2: Error en la Firma del Middleware en Next.js 16 (403 Forbidden)
* **Problema:** En Next.js 16, el middleware es invocado con `middleware(request, event)`. El código interpretaba el segundo argumento como `tokenOverride`. Como `event` (NextFetchEvent) no posee la propiedad `role`, el rol resultaba `null` y el middleware denegaba con `403 Forbidden` el acceso a rutas protegidas incluso a usuarios con sesión activa.
* **Solución:** Se descartó el objeto `NextFetchEvent` (detección segura por existencia de `.waitUntil`) en `src/middleware.ts`, asegurando que en tiempo de ejecución Next.js resuelva el token de sesión real mediante `getToken()`. Se conservó el soporte para inyección de mocks en entornos de pruebas unitarias.

### C. Soporte para Escáner QR (FT-07 / HU13):
* Se registró la regla `/api/qr(?:\/.*)?` exclusiva para el rol `QR_VALIDATOR` en `ROUTE_PERMISSION_RULES`.

---

## 6. Archivos Creados y Modificados

```text
├── docs/
│   └── PULL_REQUEST_HU08_MIDDLEWARE_PERMISSIONS.md # Documentación formal del PR actualizada
├── src/
│   ├── features/
│   │   └── auth/
│   │       ├── index.ts                           # Exportaciones públicas de permisos
│   │       └── permissions/
│   │           └── route-permissions.ts           # Matriz de permisos y rutas públicas (HU08 / FT-07)
│   └── middleware.ts                              # Middleware RBAC compatible con Next.js 16
└── tests/
    └── unit/
        ├── middleware.test.mjs                    # Pruebas unitarias actualizadas de API Middleware
        └── permissions.service.test.mjs           # Pruebas unitarias de matriz de roles y rutas públicas
```

---

## 7. Instrucciones de Ejecución y Pruebas

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar únicamente las pruebas de middleware y permisos
npx tsx --test tests/unit/permissions*.test.mjs tests/unit/middleware*.test.mjs

# Compilación y verificación de tipos en Next.js
npm run build
```

