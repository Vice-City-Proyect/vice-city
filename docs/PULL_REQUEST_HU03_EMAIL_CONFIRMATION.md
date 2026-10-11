# 📄 Documentación de Pull Request: HU03-B Lógica de Negocio de Confirmación de Correo

## 1. Información General
* **Jira Tarea:** `HU03-B` — Lógica de negocio de confirmación de correo
* **Tipo:** Subtask / Feature Backend
* **Rama:** `feature/HU03-B-LN/logica-confirmacion-correo/daniela-zapata`
* **Rama Base:** `backend`
* **Desarrollador:** Daniela Zapata

---

## 2. Descripción del Cambio Realizado
Se implementó la capa de lógica de negocio para la confirmación de correo electrónico en la plataforma Vice City, aplicando principios de arquitectura hexagonal / dominio desacoplado, almacenamiento mediante Prisma ORM (sin SQL crudo) y manejo estricto de errores de dominio.

### Componentes y Servicios Implementados:
1. **Desacoplamiento del Envío de Correos (`src/features/auth/services/email.service.ts`):**
   * Definición de la interfaz `IEmailSender` con el contrato `sendEmail(options: SendEmailOptions): Promise<void>`.
   * Implementación de `ConsoleEmailSender` para depuración en desarrollo.
   * Implementación de `MockEmailSender` para pruebas unitarias sin dependencias externas.
   * *Decisión de diseño:* Permite al equipo integrar cualquier proveedor futuro (Resend, SendGrid, Amazon SES, Nodemailer) sin alterar la lógica de negocio.

2. **Errores de Dominio Específicos (`src/features/auth/errors/email-confirmation.errors.ts`):**
   * `TokenExpiredError`: Cuando el token ha superado su ventana de validez (24 horas).
   * `InvalidTokenError`: Cuando el token no existe, ya fue consumido o está alterado.
   * `UserAlreadyVerifiedError`: Cuando se intenta verificar un usuario previamente confirmado.
   * `UserNotFoundError`: Cuando el identificador de usuario no existe en la base de datos.

3. **Servicio de Confirmación de Correo (`src/features/auth/services/email-confirmation.service.ts`):**
   * `sendVerificationEmail(userId)`: Genera token criptográficamente seguro (256-bit hexadecimal vía `crypto.randomBytes(32)`), define expiración a 24 horas, persiste en `metadata` del usuario mediante Prisma ORM y envía el mensaje.
   * `confirmEmail(token)`: Busca el usuario por token no expirado ni consumido, marca `email_verified: true`, registra `email_verified_at` y marca `used: true` en el token.
   * `resendVerificationEmail(email)`: Caso límite resuelto — invalida y sobrescribe de forma atómica el token anterior generando uno nuevo con nueva ventana de 24 horas.

4. **Persistencia mediante ORM Prisma:**
   * Uso del campo nativo `metadata: Json` en la tabla `users` para persistir el estado de verificación (`email_verified`, `email_verified_at`, `verification_token`) sin requerir migraciones estructurales y garantizando total compatibilidad con el esquema de base de datos Supabase.

---

## 3. Definición con el Product Owner (PO): Política de Usuario No Verificado

Como parte de los requerimientos de la historia `HU03-B`, se define la siguiente matriz de permisos para usuarios con correo no verificado:

| Acción en el Sistema | ¿Permitido sin verificar? | Razón / Regla de Negocio |
| :--- | :---: | :--- |
| **Iniciar Sesión (Login)** | ✅ Sí | Permite al usuario acceder a su cuenta y solicitar reenvío de confirmación. |
| **Explorar Servicios y Canchas** | ✅ Sí | Fomenta la navegación y conocimiento del complejo deportivo sin barreras de entrada. |
| **Consultar Precios y Horarios** | ✅ Sí | Información pública de disponibilidad para incentivar la reserva. |
| **Ver Perfil Básico** | ✅ Sí | Muestra banner informativo indicando *"Debes confirmar tu correo para realizar reservas"*. |
| **Reenviar Correo de Confirmación** | ✅ Sí | Acción necesaria para recuperar o recibir nuevamente el enlace de validación. |
| **Crear Reservas (Online)** | ❌ No | **Bloqueado.** Previene reservas fantasma o reservas con correos falsos/maliciosos. |
| **Realizar Pagos (Checkout)** | ❌ No | **Bloqueado.** Evita transacciones financieras vinculadas a cuentas no autenticadas. |
| **Emisión y Lectura de Tickets / QR** | ❌ No | **Bloqueado.** Un ticket digital únicamente se expide a clientes validados. |

---

## 4. Criterios de Aceptación Verificados

- [x] **Genera el token con expiración y envía el correo:** Token de 256 bits (`crypto.randomBytes(32)`), expiración configurada a 24 horas, despachado vía `IEmailSender`.
- [x] **Confirmar con un token válido marca al usuario como verificado:** El usuario queda marcado con `email_verified: true` y marca de tiempo en `email_verified_at`.
- [x] **Caso de error: un token vencido o ya usado devuelve un error de negocio claro:** Lanza `TokenExpiredError` e `InvalidTokenError` con mensajes descriptivos.
- [x] **Caso límite: reenviar el correo invalida el token anterior:** `resendVerificationEmail` sustituye el token anterior, impidiendo que el enlace previo sea utilizado.
- [x] **Pruebas unitarias de la lógica sin depender del endpoint:** Suite completa de 6 pruebas unitarias implementada con el test runner nativo de Node.js + TSX.
- [x] **Uso estricto de ORM:** Todas las operaciones utilizan `prisma.users.findFirst` y `prisma.users.update` sin sentencias SQL directas.

---

## 5. Instrucciones de Ejecución y Pruebas

### Ejecutar Pruebas Unitarias:
```bash
npm test
# o alternativamente:
npm run test:unit
```

**Resultado esperado:**
```text
▶ HU03-B: Lógica de Negocio - Confirmación de Correo Electrónico
  ✔ Criterio 1: Genera el token seguro con expiración y envía el correo
  ✔ Criterio 2: Confirmar con un token válido marca al usuario como verificado
  ✔ Criterio 3: Caso de error - Un token vencido devuelve error claro (TokenExpiredError)
  ✔ Criterio 3 (b): Caso de error - Un token ya usado o inválido devuelve error claro (InvalidTokenError)
  ✔ Criterio 4: Caso límite - Reenviar el correo invalida automáticamente el token anterior
  ✔ Caso de negocio: Rechaza si el usuario ya se encuentra verificado
✔ HU03-B: Lógica de Negocio - Confirmación de Correo Electrónico
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### Ejecutar Build del Proyecto:
```bash
npm run build
```
*Comprueba que TypeScript compila al 100% sin advertencias ni errores en el runtime de Next.js.*

---

## 6. Checklist de Code Review
- [x] **Sin dependencias innecesarias:** Solo se añadió `tsx` para el runner de pruebas unitarias.
- [x] **Sin SQL directo:** Integración 100% mediante Prisma ORM.
- [x] **Código testeado:** 6 de 6 pruebas unitarias aprobadas.
- [x] **Build verificado:** `npm run build` exitoso (código 0).
- [x] **Documentación completa:** Actualización en `README.md` y `docs/PULL_REQUEST_HU03_EMAIL_CONFIRMATION.md`.
