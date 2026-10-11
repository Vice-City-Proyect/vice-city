# 📄 Documentación de Pull Request: HU05-B API Flujo de Inicio de Sesión con Google

## 1. Información General
* **Jira Tarea:** `HU05-B API` — Endpoint de inicio de sesión con Google
* **Tipo:** Subtask / Feature Backend
* **Rama:** `feature/HU05-B-API/login-google/jandy-pena`
* **Rama Base:** `feature/HU05-B-LN/logica-google/daniela-zapata`
* **Desarrollador Responsable:** Jandy Peña (`BlurTrace`)
* **Dependencias:**
  * `HU05-B Lógica de negocio` (Daniela Zapata — `googleAuthService`)
  * `HU05-BD ORM` (José Gutiérrez — `linked_accounts` / `linkAccount`)
  * `HU02-B Lógica de negocio` (VCP-21 — NextAuth / JWT / Roles SRS)

---

## 2. Descripción del Cambio Realizado
Se implementó y expuso la capa **API / Route Handlers** para la autenticación federada con Google OAuth en Vice City, integrando el proveedor de Google en NextAuth v4, su ruta de callback, endpoints dedicados con validación defensiva estricta de contratos Zod (`.strict()`), manejo robusto de redirección y mensajes ante cancelaciones o fallos, y documentación completa en OpenAPI 3.0.3 (Swagger).

### Componentes y Rutas Implementadas:

1. **Configuración de Google OAuth en NextAuth (`src/lib/auth.ts`):**
   * Configuración de `GoogleProvider` con `clientId`, `clientSecret` y parámetros de autorización (`prompt: "consent"`, `access_type: "offline"`, `response_type: "code"`).
   * **Callback `signIn`:** Intercepta la autenticación de Google y delega estrictamente en `googleAuthService.handleGoogleAuth(profile)` y en `linkAccount()` para registrar la identidad en el ORM.
   * **Manejo de Errores de Negocio:** Redirige automáticamente a `/login?error=GoogleEmailNotProvided` o `/login?error=UserInactive` ante incidencias de perfil o cuenta inactiva.
   * **Callbacks `jwt` y `session`:** Transfieren y enriquecen la sesión del usuario con `id`, `email`, `name` y el `role` oficial del SRS (`ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`).

2. **Route Handler Principal de NextAuth (`src/app/api/auth/[...nextauth]/route.ts`):**
   * Expone las rutas estándar de NextAuth en el App Router de Next.js (`GET` y `POST`):
     * `/api/auth/signin/google`: Inicia el flujo OAuth hacia Google.
     * `/api/auth/callback/google`: Recibe el código de autorización o error (`access_denied`).
     * `/api/auth/session`: Emite la sesión activa basada en JWT.

3. **Endpoint Específico de Autenticación con Google (`src/app/api/auth/google/route.ts`):**
   * **`POST /api/auth/google`:**
     * Validación defensiva de encabezado `Content-Type: application/json` (400).
     * Parseo seguro de JSON y guardas de tipo para objetos JSON válidos (400).
     * Validación con Zod estricto (`googleProfileSchema.strict()`) que rechaza inyecciones de campos desconocidos.
     * Detección y manejo de banderas de error reportadas por el cliente/proveedor.
     * Delegación desacoplada a la lógica de negocio (`googleAuthService.handleGoogleAuth`) y vinculación ORM (`linkAccount`).
     * Respuesta estandarizada con sobre `{ success: true, message: ..., data: { user: { id, email, name, role }, isNewUser, isLinked } }`.
   * **`GET /api/auth/google`:**
     * Resuelve códigos de error recibidos por query param (`?error=access_denied`) y provee el mensaje en español y la URL de redirección hacia `/login`.

4. **Endpoint de Consulta de Sesión (`src/app/api/auth/session/route.ts`):**
   * `GET /api/auth/session`: Permite a clientes web y móviles consultar la sesión activa con `id`, `email` y `role`.

5. **Resolutor de Errores OAuth en Español (`src/features/auth/utils/google-error-handler.ts`):**
   * Traduce códigos de NextAuth y OAuth (`access_denied`, `AccessDenied`, `OAuthSignin`, `OAuthCallback`, `GoogleEmailNotProvided`, `UserInactive`) a mensajes claros, amigables y profesionales en español.

6. **Especificación OpenAPI 3.0.3 (`docs/swagger/auth-google.swagger.json`):**
   * Documenta todos los endpoints del flujo Google, respuestas exitosas (200), errores (400, 403, 500) y esquemas JSON.

---

## 3. Criterios de Aceptación Verificados

- [x] **Iniciar sesión con Google devuelve la sesión con id, email y role:** Verificado tanto en `POST /api/auth/google` como en los callbacks `jwt`/`session` de NextAuth y en `GET /api/auth/session`.
- [x] **Caso de error: si el usuario cancela o Google falla, se redirige al login con un mensaje claro:** Mapeo centralizado en `resolveGoogleAuthErrorMessage()`, redirección en `signIn` callback hacia `/login?error=...` y resolución en `GET /api/auth/google?error=access_denied`.
- [x] **Caso límite: una cuenta de Google con un correo ya registrado se vincula y no se duplica:** Al recibir un correo ya registrado (incluso con distinta capitalización), se vincula a la cuenta existente, preserva el mismo ID de usuario y no crea duplicados en la base de datos.
- [x] **Contratos de API y Validación Zod Estricta:** Implementación defensiva en `src/app/api/auth/google/route.ts` que rechaza payloads malformados, tipos de contenido erróneos o campos adicionales (`.strict()`).
- [x] **Documentación Swagger / OpenAPI 3.0:** Archivo `docs/swagger/auth-google.swagger.json` generado conforme a los estándares de Vice City.

---

## 4. Archivos Creados y Modificados

```text
├── docs/
│   ├── PULL_REQUEST_HU05_GOOGLE_AUTH_API.md    # Documentación formal de este PR
│   └── swagger/
│       └── auth-google.swagger.json            # Contrato OpenAPI 3.0.3 del flujo Google
├── package.json                                # Dependencias next-auth, zod, bcryptjs y scripts
├── prisma/
│   └── schema.prisma                           # Modelo linked_accounts y relación con users
├── src/
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           ├── [...nextauth]/
│   │           │   └── route.ts                # Route Handler NextAuth para Google Provider y callbacks
│   │           ├── google/
│   │           │   └── route.ts                # Route Handler POST/GET /api/auth/google
│   │           └── session/
│   │               └── route.ts                # Route Handler GET /api/auth/session
│   ├── features/
│   │   ├── auth/
│   │   │   ├── index.ts                        # Exportaciones públicas de HU05-B
│   │   │   ├── schemas/
│   │   │   │   └── google-auth.schema.ts       # Esquema Zod estricto para perfiles de Google
│   │   │   └── utils/
│   │   │       └── google-error-handler.ts     # Mapeo de errores OAuth a mensajes en español
│   │   └── users/
│   │       ├── index.ts                        # Exportaciones del repositorio de cuentas vinculadas
│   │       ├── linked-accounts.repository.ts   # Repositorio ORM de cuentas vinculadas
│   │       └── types.ts                        # Tipos LinkAccountParams y LinkAccountResult
│   ├── lib/
│   │   ├── auth.ts                             # Configuración NextAuth, GoogleProvider y callbacks
│   │   └── password.ts                         # Utilidades de hashing con bcryptjs
│   └── types/
│       └── next-auth.d.ts                      # Tipos de sesión y JWT extendidos con id y role
└── tests/
    └── unit/
        ├── google-auth.api.test.mjs            # 11 pruebas unitarias para API, callbacks y contratos
        └── google.auth.test.mjs                # 5 pruebas de lógica de negocio (Daniela Zapata)
```

---

## 5. Instrucciones de Ejecución y Pruebas

### Ejecutar Pruebas Automatizadas:
```bash
npm test
# o:
npm run test:unit
```

### Ejecutar Build de Producción:
```bash
npm run build
```

---

## 6. Checklist de Entrega
- [x] Rama de trabajo: `feature/HU05-B-API/login-google/jandy-pena`.
- [x] Separación de capas estricta: La API delega en `googleAuthService` y `linked-accounts.repository`.
- [x] Compatibilidad con NextAuth v4 y sesiones JWT.
- [x] Manejo de errores amigable en español ante cancelaciones de Google.
- [x] Esquemas Zod estrictos (`.strict()`).
- [x] Documentación OpenAPI 3.0.3 en `docs/swagger/auth-google.swagger.json`.
- [x] Suite de pruebas automatizadas en `tests/unit/google-auth.api.test.mjs`.

---

## 7. Despliegue en Producción y Google Cloud Console

Para activar Google OAuth en entornos de producción y pruebas reales, consulta la guía completa:
👉 [`docs/GOOGLE_OAUTH_SETUP_GUIDE.md`](./GOOGLE_OAUTH_SETUP_GUIDE.md)

### Requisitos Esenciales de Producción:
1. **Google Cloud Console:**
   * **Orígenes autorizados de JavaScript:** `https://tu-dominio.com`
   * **URIs de redireccionamiento autorizados:** `https://tu-dominio.com/api/auth/callback/google`
2. **Variables de Entorno del Servidor (`.env`):**
   * `NEXTAUTH_URL="https://tu-dominio.com"`
   * `NEXTAUTH_SECRET="[clave_segura_de_32_bytes]"`
   * `GOOGLE_CLIENT_ID="[client_id].apps.googleusercontent.com"`
   * `GOOGLE_CLIENT_SECRET="[client_secret]"`


