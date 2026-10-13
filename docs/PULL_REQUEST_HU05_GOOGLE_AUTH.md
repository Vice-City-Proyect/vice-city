# 📄 Documentación de Pull Request: HU05-B Lógica de Negocio de Inicio de Sesión con Google

## 1. Información General
* **Jira Tarea:** `HU05-B` — Lógica de negocio de inicio de sesión con Google
* **Tipo:** Subtask / Feature Backend
* **Rama:** `feature/HU05-B-LN/logica-google/daniela-zapata`
* **Rama Base:** `backend` (con dependencias de `HU05-BD` / `HU01-B`)
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado
Se implementó la capa de lógica de negocio para la autenticación federada con Google OAuth en Vice City, permitiendo tanto el registro automático de nuevos usuarios como la vinculación transparente de cuentas preexistentes, garantizando el principio de no duplicidad, verificación de correo y uso exclusivo del ORM Prisma (sin SQL directo).

### Componentes y Servicios Implementados:
1. **Errores de Dominio Específicos (`src/features/auth/errors/google-auth.errors.ts`):**
   * `GoogleEmailNotProvidedError`: Cuando el payload de Google no contiene correo (ej. permisos restringidos o cuentas corporativas sin email expuesto).
   * `UserInactiveError`: Cuando la cuenta asociada existe pero se encuentra inactiva o bloqueada en el sistema.
   * `GoogleAuthError`: Error base de dominio para fallos en la autenticación federada.

2. **Servicio de Autenticación con Google (`src/features/auth/services/google-auth.service.ts`):**
   * `handleGoogleAuth(profile)`:
     * **Validación inicial:** Requiere que el perfil de Google contenga un correo electrónico válido; de lo contrario lanza `GoogleEmailNotProvidedError` (Criterio 3).
     * **Normalización insensible a mayúsculas (Caso límite):** Convierte el correo a minúsculas y consulta mediante Prisma ORM con `mode: "insensitive"`. Esto asegura que `Usuario@Gmail.com` y `usuario@gmail.com` correspondan a la misma entidad sin duplicar cuentas (Criterio 4).
     * **Flujo Usuario Existente (Criterio 2):** Si el correo ya existe, no se crea un segundo usuario. Se actualiza el campo `metadata` agregando `google_id`, `linked_providers: ["google"]`, y se marca el correo como verificado (`email_verified: true`, `email_verified_at`).
     * **Flujo Usuario Nuevo (Criterio 1):** Si el correo no existe, se consulta el rol `CLIENT` (o `customer`) en la base de datos vía ORM y se crea el nuevo usuario con `password_hash: null`, `email_verified: true` y metadatos del proveedor de Google.
     * **Desacoplamiento para Pruebas:** Permite inyección de dependencias para ejecutar la suite de pruebas unitarias sin dependencias de red o base de datos externa.

3. **Módulo de Autenticación (`src/features/auth/index.ts`):**
   * Exporta de forma limpia y tipada `GoogleAuthService`, `googleAuthService` y sus errores.

---

## 3. Criterios de Aceptación Verificados

- [x] **Un usuario nuevo se crea con rol CLIENT y correo verificado:** Creación con rol `CLIENT`, metadatos de Google y `email_verified: true`.
- [x] **Un usuario existente se vincula sin duplicarse:** Vinculación atómica en `metadata` (`linked_providers`), conservando el mismo ID y sin registros duplicados.
- [x] **Caso de error: Google sin correo disponible devuelve un error de negocio claro:** Lanza `GoogleEmailNotProvidedError` con código `GOOGLE_EMAIL_NOT_PROVIDED`.
- [x] **Caso límite: un correo con distinta capitalización se reconoce como el mismo usuario:** Normalización a minúsculas y búsqueda insensible en PostgreSQL (`mode: "insensitive"`).
- [x] **Pruebas unitarias de la lógica:** Suite de 5 pruebas unitarias automatizadas ejecutadas con `npm test` (100% aprobadas).
- [x] **Uso estricto de la capa ORM:** Consultas y mutaciones mediante `prisma.users.findFirst`, `prisma.users.create` y `prisma.users.update` sin sentencias SQL directas.

---

## 4. Instrucciones de Ejecución y Pruebas

### Ejecutar Pruebas Unitarias:
```bash
npm test
# o:
npm run test:unit
```

**Resultado esperado:**
```text
▶ HU05-B: Lógica de Negocio - Inicio de Sesión con Google
  ✔ Criterio 1: Un usuario nuevo se crea con rol CLIENT y correo verificado (22.6713ms)
  ✔ Criterio 2: Un usuario existente se vincula a Google sin duplicarse (1.3146ms)
  ✔ Criterio 3: Caso de error - Google sin correo disponible devuelve un error de negocio claro (GoogleEmailNotProvidedError) (2.0642ms)
  ✔ Criterio 4: Caso límite - Un correo con distinta capitalización se reconoce como el mismo usuario (0.997ms)
  ✔ Validación de seguridad: Rechaza vinculación si la cuenta está inactiva (UserInactiveError) (1.138ms)
✔ HU05-B: Lógica de Negocio - Inicio de Sesión con Google (31.0027ms)
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

### Ejecutar Build del Proyecto:
```bash
npm run build
```
*Comprueba que TypeScript compila al 100% sin advertencias ni errores en el runtime de Next.js.*

---

## 5. Checklist de Code Review
- [x] **Arquitectura:** Ubicado correctamente dentro de `src/features/auth/`.
- [x] **Seguridad:** Tratamiento seguro de OAuth, validación de cuentas inactivas y prevención de duplicidad por capitalización.
- [x] **Sin dependencias innecesarias:** No se agregaron paquetes extras; se utiliza el stack existente del proyecto.
- [x] **Código testeado:** 5 de 5 pruebas unitarias exitosas.
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU05_GOOGLE_AUTH.md`.

