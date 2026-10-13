# 📄 Documentación de Pull Request: Fix — Corrección del Login y Emisión de Sesión (HU02-B)

## 1. Información General
* **Tipo:** Bug Fix / Corrección de Autenticación
* **Historia de Usuario Relacionada:** `HU02-B` (Login de Usuarios y Sesiones)
* **Rama Origen:** `fix/HU02-B/auth-login-session-cookie`
* **Rama Destino (Base):** `backend` (o `develop`)
* **Dependencias:** `next-auth@^4.24.15`, `src/middleware.ts` (HU08)

---

## 2. Diagnóstico del Problema (Causa Raíz)
Durante las pruebas funcionales del backend se detectó que los usuarios se registraban correctamente (`POST /api/auth/register`), pero tras realizar el login mediante `POST /api/auth/login`, no podían acceder a ninguna ruta protegida del sistema.

**Causa Raíz en el Código:**
1. `POST /api/auth/login` validaba correctamente las credenciales mediante `authenticateUser()` y retornaba `200 OK` con `{ success: true, data: { id, email, name, role } }`.
2. Sin embargo, el endpoint **no emitía ni adjuntaba ninguna cookie de sesión** (`Set-Cookie`) a la respuesta HTTP.
3. El middleware perimetral (`src/middleware.ts`) valida las solicitudes protegidas mediante `getToken({ req, secret })` de NextAuth v4. Al no existir la cookie `next-auth.session-token` (en HTTP) o `__Secure-next-auth.session-token` (en HTTPS), `getToken()` retornaba `null`, bloqueando el acceso con `401 Unauthorized` (en API) o redirigiendo al login.

---

## 3. Descripción de los Cambios Implementados

### A. Capa de Autenticación y Cifrado (`src/lib/auth.ts`):
* Se importó la función `encode` de `next-auth/jwt`.
* Se implementó `isSecureAuthContext(request?)`: determina si el entorno de ejecución requiere cookies seguras (`__Secure-` y `secure: true`) basado en HTTPS, `NEXTAUTH_URL` o entorno de producción.
* Se implementó `getSessionCookieConfig(options?)`: estandariza el nombre de la cookie y sus banderas de seguridad (`httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 28800` / 8 horas).
* Se implementó `createSessionToken(user, customSecret?, customMaxAge?)`: cifra y firma el token JWE nativo de NextAuth (`alg: "dir"`, `enc: "A256GCM"`) incluyendo `sub`, `id`, `email`, `name` y `role`.

### B. Route Handler de Login (`src/app/api/auth/login/route.ts`):
* Tras autenticar exitosamente al usuario en la capa de negocio, genera el token JWE mediante `createSessionToken(user)`.
* Adjunta la cookie de sesión a `response.cookies.set(...)` antes de responder con `200 OK`.
* Soporta `authenticateOverride` opcional para permitir pruebas unitarias y de integración desacopladas de la base de datos física.
* Mantiene inalterado el contrato de respuesta JSON (`200 OK`, `400 Bad Request`, `401 Unauthorized`) compatible con OpenAPI / Swagger.
* Garantiza que si las credenciales o el cuerpo son inválidos, **no se emite ninguna cookie**.

### C. Suite de Pruebas Unitarias (`tests/unit/login.route.test.mjs`):
* Verificación de emisión de `next-auth.session-token` en HTTP y `__Secure-next-auth.session-token` en HTTPS.
* Verificación de que `getToken()` descifra el token emitido y recupera `sub`, `id`, `email`, `name`, `role`.
* Verificación de que la sesión emitida autoriza el paso en el `middleware` hacia rutas permitidas por el rol.
* Verificación de que el `middleware` bloquea peticiones sin sesión (`401`), con token corrupto (`401`), y con rol insuficiente (`403 FORBIDDEN`).
* Verificación de que credenciales erróneas o datos faltantes no emiten cookie.

---

## 4. Archivos Modificados
1. `src/lib/auth.ts`
2. `src/app/api/auth/login/route.ts`
3. `tests/unit/login.route.test.mjs`
4. `docs/DIAGNOSTICO_ERRORES_AUTENTICACION_BACKEND.md`
5. `docs/PULL_REQUEST_FIX_HU02_B_LOGIN_SESION.md`

---

## 5. Resultados de Verificación
* **Tests Automatizados:** `172/172 passed` (`npm test`)
* **Chequeo de Tipos TypeScript:** `0 errors` (`npx tsc --noEmit`)
* **Linter ESLint:** `0 errors / 0 warnings` (`npm run lint`)
