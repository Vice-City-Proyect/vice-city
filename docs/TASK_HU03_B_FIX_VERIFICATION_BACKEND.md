# Tarea: Corrección de Flujo de Verificación de Correo y Autenticación (Backend)

**Jira:** HU03-B / VCP-38  
**Rama:** `fix/HU03-B/email-verification-e2e`  

---

## Objetivo

Corregir los hallazgos de backend y full-stack backend identificados durante la auditoría E2E del módulo de confirmación de correo y autenticación:
1. **H-AUTH-01 / H-AUTH-06:** Normalización de URL canónica local en `.env` para evitar errores `ERR_SSL_PROTOCOL_ERROR`.
2. **H-AUTH-02:** Bloqueo de inicio de sesión con credenciales cuando el usuario no ha verificado su correo electrónico (`email_verified !== true`), respondiendo HTTP 403 `EMAIL_NOT_VERIFIED`.
3. **H-AUTH-05:** Eliminación del almacenamiento en texto plano del token de verificación dentro de `users.metadata`, asegurando persistencia segura mediante SHA-256 en la tabla `verification_tokens` (OWASP).

---

## Qué se implementó

1. **Clase de error de dominio `EmailNotVerifiedError`:**
   - Definida en `src/features/auth/errors/auth.errors.ts` con código `"EMAIL_NOT_VERIFIED"` y mensaje `"Debes confirmar tu correo electrónico antes de iniciar sesión."`.
   - Exportada a través de `src/features/auth/index.ts` y `src/features/auth/errors/email-confirmation.errors.ts`.

2. **Validación obligatoria de correo verificado en `authenticateUser` (`src/lib/auth.ts`):**
   - Comprueba `user.email_verified === true` después de verificar la contraseña encriptada con bcrypt.
   - Lanza `EmailNotVerifiedError` si `email_verified !== true`.

3. **Manejo en Endpoint de Login (`src/app/api/auth/login/route.ts`):**
   - Captura `EmailNotVerifiedError` o errores con código `"EMAIL_NOT_VERIFIED"`.
   - Retorna status `403 Forbidden` con cuerpo estructurado:
     ```json
     {
       "success": false,
       "error": "EMAIL_NOT_VERIFIED",
       "message": "Debes confirmar tu correo electrónico antes de iniciar sesión."
     }
     ```
   - No emite cookie de sesión NextAuth ante cuentas no verificadas.

4. **Depuración de seguridad en Metadata de Usuarios (`src/features/auth/services/email-confirmation.service.ts`):**
   - En `sendVerificationEmail` y `resendVerificationEmail`: cuando la tabla física `verification_tokens` está presente (entorno de producción / Supabase), persiste el hash SHA-256 (`token_hash`) en la tabla normalizada y nunca guarda el token en texto plano dentro de `users.metadata`.
   - En `confirmEmail`: al actualizar el usuario tras la verificación, almacena `token_hash` en `metadata.verification_token` en lugar del token en texto plano.
   - Mantiene compatibilidad con mocks de pruebas unitarias que no tienen la tabla normalizada.

5. **Contrato OpenAPI / Swagger (`docs/swagger/auth-login.swagger.json`):**
   - Documentada la respuesta `403` con código `EMAIL_NOT_VERIFIED` para `POST /api/auth/login`.

6. **Cobertura de Pruebas Unitarias:**
   - `tests/unit/auth.jwt.test.mjs`: Añadido test para `EmailNotVerifiedError` ante usuario no verificado y ajustados mocks de casos válidos con `email_verified: true`.
   - `tests/unit/login.route.test.mjs`: Añadido test verificando que `POST /api/auth/login` responde `403 EMAIL_NOT_VERIFIED` sin emitir cookie, y verificación del Swagger para la respuesta 403.

---

## Archivos modificados

- `src/features/auth/errors/auth.errors.ts`
- `src/features/auth/errors/email-confirmation.errors.ts`
- `src/features/auth/index.ts`
- `src/lib/auth.ts`
- `src/app/api/auth/login/route.ts`
- `src/features/auth/services/email-confirmation.service.ts`
- `docs/swagger/auth-login.swagger.json`
- `tests/unit/auth.jwt.test.mjs`
- `tests/unit/login.route.test.mjs`
- `docs/TASK_HU03_B_FIX_VERIFICATION_BACKEND.md` (este documento)

---

## Cambios en la API

- **Endpoint:** `POST /api/auth/login`
- **Nuevo caso de error:**
  - **Status:** `403 Forbidden`
  - **Body:**
    ```json
    {
      "success": false,
      "error": "EMAIL_NOT_VERIFIED",
      "message": "Debes confirmar tu correo electrónico antes de iniciar sesión."
    }
    ```

---

## Pruebas ejecutadas

- `npx tsc --noEmit`: 0 errores de tipado TypeScript.
- `npm test`: 386 pruebas unitarias ejecutadas, 386 aprobadas (100% de éxito).
- `npm run db:test:verification`: 4/4 criterios de persistencia y concurrencia aprobados contra PostgreSQL Supabase.

---

## Verificación

- [x] Criterios de aceptación de backend verificados
- [x] Todas las pruebas automatizadas pasaron (386/386)
- [x] Type checks pasaron (TypeScript limpio)
- [x] Sin dependencias nuevas innecesarias
- [x] Revisión completa del diff de Git realizada

