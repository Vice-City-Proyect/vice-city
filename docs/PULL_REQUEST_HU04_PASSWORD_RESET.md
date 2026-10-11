# 📄 Documentación de Pull Request: HU04-B Lógica de Negocio de Recuperación de Contraseña

## 1. Información General
* **Jira Tarea:** `HU04-B` — Lógica de negocio de recuperación de contraseña
* **Tipo:** Subtask / Feature Backend
* **Rama:** `feature/HU04-B-LN/logica-recuperacion/daniela-zapata`
* **Rama Base:** `backend` (con dependencia resuelta de `HU04-BD`)
* **Desarrolladora:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado
Se implementó la capa de lógica de negocio para la recuperación y restablecimiento seguro de contraseñas de usuarios en Vice City. Se siguieron principios de arquitectura hexagonal, desacoplamiento del servicio de correo mediante contratos (`IEmailSender`), encriptación con `bcryptjs`, integración con el ORM Prisma (sin SQL directo) y manejo explícito de errores de dominio.

### Componentes y Servicios Implementados:
1. **Desacoplamiento del Envío de Correos (`src/features/auth/services/email.service.ts`):**
   * Definición de la interfaz `IEmailSender` con el contrato `sendEmail(options: SendEmailOptions): Promise<void>`.
   * Implementaciones `ConsoleEmailSender` (desarrollo) y `MockEmailSender` (pruebas unitarias).
   * *Decisión de diseño:* Permite al equipo adoptar cualquier proveedor de correo electrónico en el futuro (Resend, SendGrid, Amazon SES) sin modificar la capa de negocio.

2. **Errores de Dominio Específicos (`src/features/auth/errors/password-reset.errors.ts`):**
   * `PasswordResetTokenExpiredError`: Cuando el enlace supera la ventana de validez de 1 hora.
   * `InvalidPasswordResetTokenError`: Cuando el token no existe, está alterado o ya fue consumido.
   * `UserNotFoundError`: Cuando se solicita restablecimiento para una dirección no registrada.
   * `WeakPasswordError`: Cuando la nueva contraseña no cumple con la política de seguridad (mínimo 8 caracteres).

3. **Servicio de Recuperación de Contraseña (`src/features/auth/services/password-reset.service.ts`):**
   * `requestPasswordReset(email, clientBaseUrl)`:
     * Verifica la existencia del usuario mediante ORM.
     * Invalida cualquier token previo de recuperación que estuviera activo para ese usuario (Caso límite).
     * Genera un token seguro de 256 bits (`crypto.randomBytes(32)`), con expiración de 1 hora y persistencia en BD vía ORM.
     * Despacha el correo de recuperación con el enlace seguro de restablecimiento.
   * `resetPassword(token, newPassword)`:
     * Valida que la contraseña cumpla con la longitud mínima requerida (mínimo 8 caracteres).
     * Encripta la nueva contraseña con `bcryptjs` (salt rounds = 10).
     * Ejecuta la transacción atómica en el ORM invalidando el token (`used: true`, `used_at: now`) y actualizando `password_hash`.
     * Mapea códigos de motivo a errores de negocio comprensibles (`PasswordResetTokenExpiredError`, `InvalidPasswordResetTokenError`).
   * `validateTokenStatus(token)`:
     * Permite a la interfaz gráfica consultar si el enlace es válido antes de que el usuario envíe el formulario.

4. **Integración con ORM Prisma (`src/features/users/password-reset.repository.ts`):**
   * Utiliza la capa de acceso a datos de `HU04-BD` sobre la tabla `verification_tokens` (discriminando con `type = 'password_reset'`).
   * No se utiliza SQL directo en ninguna parte del servicio.

---

## 3. Criterios de Aceptación Verificados

- [x] **Genera el token y envía el correo:** Genera token criptográfico de un solo uso con expiración de 1 hora y despacha el correo vía `IEmailSender`.
- [x] **Restablecer con un token válido guarda la nueva contraseña encriptada:** La contraseña se encripta con `bcryptjs` antes de persistirse y se valida con `bcrypt.compareSync`.
- [x] **Caso de error: un token vencido o ya usado devuelve un error de negocio claro:** Lanza `PasswordResetTokenExpiredError` (`TOKEN_EXPIRED`) o `InvalidPasswordResetTokenError` (`INVALID_TOKEN`).
- [x] **Caso límite: una nueva solicitud invalida el token anterior:** Al generar una nueva solicitud para el mismo usuario, el token previo queda invalidado de forma automática.
- [x] **Pruebas unitarias de la lógica sin depender del endpoint:** 6 de 6 pruebas unitarias aprobadas cubriendo todos los casos nominales, de error y de borde.
- [x] **Sin SQL directo:** Integración ORM mediante Prisma Client y repositorios de datos.

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
▶ HU04-B: Lógica de Negocio - Recuperación de Contraseña
  ✔ Criterio 1: Genera el token de un solo uso con expiración y envía el correo de recuperación
  ✔ Criterio 2: Restablecer con un token válido guarda la nueva contraseña encriptada (bcrypt)
  ✔ Criterio 3 (a): Caso de error - Un token vencido devuelve un error de negocio claro (PasswordResetTokenExpiredError)
  ✔ Criterio 3 (b): Caso de error - Un token ya usado o inválido devuelve InvalidPasswordResetTokenError
  ✔ Criterio 4: Caso límite - Una nueva solicitud invalida automáticamente el token anterior
  ✔ Validaciones de Negocio: Rechaza correo inexistente y contraseñas débiles
✔ HU04-B: Lógica de Negocio - Recuperación de Contraseña
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### Ejecutar Build del Proyecto:
```bash
npm run build
```
*Comprueba que TypeScript compila al 100% sin errores de tipos ni advertencias.*

---

## 5. Checklist de Code Review
- [x] **Arquitectura:** Lógica ubicada dentro de `src/features/auth/`.
- [x] **Seguridad:** Tokens de vida corta (1h), de un solo uso, hashing con bcrypt y protección contra enumeración de contraseñas débiles.
- [x] **Código testeado:** Cobertura de todos los criterios de aceptación en `tests/unit/password.reset.test.mjs`.
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU04_PASSWORD_RESET.md`.

