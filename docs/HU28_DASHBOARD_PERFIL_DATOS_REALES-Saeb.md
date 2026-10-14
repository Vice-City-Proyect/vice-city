# Documentación Técnica: HU28 — Conexión de Datos Reales al Dashboard de Información Personal

**Módulo / Historia de Usuario:** HU28 / VCP-xx — *Dashboard de información personal: datos quemados y sin actualizar*  
**Rama:** `fix/HU28/dashboard-datos-reales`  
**Estado:** Implementado y Verificado (0 Errores de Tipos, 100% Pruebas Unitarias Aprobadas)  

---

## 1. Resumen Ejecutivo

Este documento detalla todas las modificaciones y adiciones técnicas realizadas para resolver la deuda técnica en el dashboard y vista de perfil del cliente (`/cliente/perfil`, `/cliente` y `/cliente/layout.tsx`), donde se utilizaban datos estáticos quemados (`MOCK_CLIENT_SESSION` y `MOCK_USERS`).

La solución introduce:
1. Un endpoint backend autenticado (`/api/users/me`) con soporte para consulta (`GET`) y actualización de perfil (`PATCH`), respaldado por PostgreSQL y Prisma ORM.
2. Reglas perimetrales y autorización por roles para permitir el acceso a usuarios autenticados sin bloqueos 403 en el middleware.
3. Validación de esquemas con Zod para entradas de datos (`profile.schema.ts`).
4. Reemplazo íntegro de maquetas por estados asíncronos en el cliente React: estados de carga (`loading`), manejo de errores (`error`), actualización en vivo con eventos globales (`user-profile-updated`) y persistencia total entre recargas (F5).
5. Aislamiento estricto multi-usuario y soporte robusto para campos opcionales nulos (como teléfono).

---

## 2. Archivos Creados y Modificados

### A. Nuevos Archivos

#### 1. `src/features/users/schemas/profile.schema.ts`
* **Propósito:** Esquema de validación con Zod para el cuerpo de solicitudes de actualización de perfil.
* **Detalles técnicos:**
  * Valida `name` o `full_name`: string de 2 a 100 caracteres, no vacío.
  * Valida `phone`: opcional, string o `null` (permite limpiar el teléfono registrado).
  * Regla de validación: exige al menos un campo (`full_name` o `phone`) para evitar solicitudes vacías.

#### 2. `src/app/api/users/me/route.ts`
* **Propósito:** Route handler oficial de Next.js para la gestión del perfil del usuario autenticado.
* **Detalles técnicos:**
  * **`GET /api/users/me`:**
    * Extrae la sesión activa vía `getServerSession(authOptions)`.
    * Retorna `401 Unauthorized` si no existe sesión válida.
    * Realiza una consulta directa a la base de datos PostgreSQL mediante Prisma (`prisma.users.findFirst`), buscando por `id` o `email` de la sesión.
    * Responde con `{ success: true, data: { id, full_name, name, email, phone, document_id, role, status, created_at } }`.
  * **`PATCH /api/users/me`:**
    * Valida sesión activa (`401` si no existe).
    * Valida el payload con `updateProfileSchema.safeParse(body)` (`400` si hay error de validación o JSON malformado).
    * Actualiza el registro en la base de datos (`prisma.users.update`) con el nuevo nombre y teléfono sanitizados.
    * Responde con `{ success: true, message: "...", data: updatedUser }`.
  * **Inyección de Dependencias / Testabilidad:** Soporta `sessionOverride` y `prismaOverride` para permitir pruebas unitarias aisladas sin dependencias de red o runtime externo.

#### 3. `tests/unit/users.me.test.mjs`
* **Propósito:** Suite de pruebas unitarias automatizadas con Node.js Test Runner para el endpoint `/api/users/me`.
* **Casos cubiertos (7/7 aprobados):**
  1. `GET` sin sesión devuelve 401 Unauthorized.
  2. `GET` con sesión retorna los datos del usuario autenticado.
  3. Aislamiento multi-usuario: dos usuarios distintos ven únicamente sus propios datos y se gestiona correctamente el campo `phone` cuando es `null`.
  4. `PATCH` sin sesión devuelve 401 Unauthorized.
  5. `PATCH` con nombre inválido o vacío devuelve 400 Validation Error.
  6. `PATCH` actualiza nombre y teléfono persistiendo en el almacén de datos y reflejándose en consultas posteriores.
  7. `PATCH` permite limpiar el teléfono estableciéndolo en `null`.

---

### B. Archivos Modificados

#### 4. `src/features/auth/permissions/route-permissions.ts`
* **Cambio:** Se añadió la regla de autorización para la ruta `/api/users/me`:
  ```typescript
  // 8. Perfil y datos del usuario autenticado (todos los roles autorizados)
  {
    pattern: /^\/api\/users\/me(?:\/.*)?$/,
    allowedRoles: ["ADMIN", "CLIENT", "TICKET_SELLER", "QR_VALIDATOR"],
    description: "Consulta y actualización del perfil del usuario autenticado",
  }
  ```
* **Impacto:** Evita que el middleware perimetral rechace con `403 Forbidden` a usuarios válidos que consultan o editan su propio perfil.

#### 5. `src/app/cliente/perfil/page.tsx`
* **Cambios:**
  * **Eliminación de Mocks:** Removidas las dependencias de `MOCK_CLIENT_SESSION` y `MOCK_USERS`.
  * **Carga Asíncrona (`fetchProfile`):** Carga inicial de `/api/users/me` en `useEffect`.
  * **Estado de Carga:** Renderiza spinner interactivo (`Loader2`) y mensaje mientras se obtienen los datos.
  * **Estado de Error:** Si la petición falla o no hay sesión, muestra un panel de alerta (`AlertCircle`) con opción de "Reintentar", sin volcar datos falsos.
  * **Edición y Persistencia (`handlePersonalSubmit`):**
    * Envía petición `PATCH /api/users/me` con `name` y `phone`.
    * Deshabilita el botón durante el guardado e indica estado `Guardando...`.
    * Al recibir confirmación, actualiza inmediatamente el estado local del componente y muestra retroalimentación visual (`Cambios guardados`).
    * Dispara el evento global `window.dispatchEvent(new CustomEvent('user-profile-updated', ...))` para actualizar encabezados y shells en tiempo real sin recarga forzada.
  * **Seguridad de Datos:** El campo de correo electrónico se muestra en modo solo lectura (`disabled`/`readOnly`), evitando modificaciones accidentales al identificador de la cuenta.
  * **Manejo Seguro de Nulos:** Se usan operadores seguros (`profile?.phone || '—'`) para prevenir caídas de interfaz.
  * **Cierre de Sesión:** El botón "Cerrar sesión" ahora invoca la función oficial `signOut({ callbackUrl: '/login' })` de NextAuth.
  * **Limpieza de UI:** Se eliminó la nota fija que indicaba que los datos eran solo una demostración visual.

#### 6. `src/app/cliente/layout.tsx`
* **Cambios:**
  * Removido `MOCK_CLIENT_SESSION`.
  * Se implementó lectura dinámica del perfil llamando a `/api/users/me`.
  * Se agregó un listener al evento de ventana `'user-profile-updated'`, garantizando que cuando el usuario guarde un nuevo nombre en `/cliente/perfil`, el nombre mostrado en el header de [AppShell](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/AppShell.tsx) se actualice al instante sin requerir F5.

#### 7. `src/app/cliente/page.tsx`
* **Cambios:**
  * Removido `MOCK_CLIENT_SESSION`.
  * Integración con `getServerSession(authOptions)` en el Server Component.
  * Saludo personalizado dinámico: `Hola, {userName}` donde `userName` proviene del token de sesión real del usuario autenticado.
  * Pase del `clientId` real obtenido de la sesión al componente `ClientNextReservation`.

---

## 3. Matriz de Cumplimiento de Criterios de Aceptación

| Criterio de Aceptación | Estado | Implementación / Evidencia |
| :--- | :---: | :--- |
| **No hardcoded data:** Toda la información proviene del backend | **CUMPLIDO** | Se eliminó `MOCK_CLIENT_SESSION` y `MOCK_USERS`. Se conectó `/api/users/me` y `getServerSession`. |
| **Multi-user isolation:** Dos usuarios distintos ven estrictamente sus propios datos | **CUMPLIDO** | La consulta SQL/Prisma filtra por `session.user.id` / `email`. Verificado en prueba unitaria #3. |
| **Live update & persistence:** Edición se refleja en UI al instante y persiste tras F5 | **CUMPLIDO** | `PATCH /api/users/me` actualiza en BD PostgreSQL, actualiza el estado local y emite evento global de UI. Persistencia garantizada en base de datos. |
| **Error state:** Carga y errores limpios sin datos dummy de fallback | **CUMPLIDO** | Estados de carga con spinner y pantalla de error con reintento implementados en `perfil/page.tsx`. |
| **Edge cases:** Campos opcionales vacíos o nulos no rompen la UI | **CUMPLIDO** | Fallback seguro `user.phone || '—'` y actualización de teléfono a `null` validada. |

---

## 4. Resultados de Calidad y Pruebas

### A. Verificación de Tipos TypeScript
```bash
$ npx tsc --noEmit
# Salida: Código de salida 0 (0 errores de compilación)
```

### B. Pruebas Unitarias Automatizadas
```bash
$ npx tsx --test tests/unit/users.me.test.mjs
▶ HU28 — Endpoint /api/users/me (Datos reales de perfil)
  ✔ 1. GET /api/users/me sin sesión devuelve 401 Unauthorized (4.9373ms)
  ✔ 2. GET /api/users/me con sesión retorna los datos del usuario autenticado (1.4202ms)
  ✔ 3. Multi-usuario: Usuario B ve estrictamente sus propios datos y maneja teléfono null (0.5296ms)
  ✔ 4. PATCH /api/users/me sin sesión devuelve 401 Unauthorized (0.5479ms)
  ✔ 5. PATCH /api/users/me rechaza validación con nombre vacío (2.5592ms)
  ✔ 6. PATCH /api/users/me actualiza nombre y teléfono persistiendo en la BD (1.1563ms)
  ✔ 7. PATCH /api/users/me permite limpiar el teléfono estableciéndolo en null (0.6253ms)
✔ HU28 — Endpoint /api/users/me (Datos reales de perfil) (12.6799ms)
ℹ tests 7
ℹ suites 1
ℹ pass 7
ℹ fail 0
```

### C. Restricción de Dependencias
* **`package.json` & `package-lock.json`:** Sin cambios (0 dependencias añadidas o modificadas).
