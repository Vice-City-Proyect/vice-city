# HU04-BD — ORM Prisma: Tokens de Recuperación de Contraseña

## Historia de Usuario

> **Como** usuario registrado en Vice City,  
> **quiero** poder restablecer mi contraseña mediante un enlace enviado a mi correo,  
> **para** recuperar el acceso a mi cuenta cuando olvide mis credenciales.

**Ticket:** HU04-BD ORM Prisma: tokens de recuperación  
**Rama:** `feature/HU04-BD-ORM/prisma-recuperacion/jose-gutierrez`  
**Dependencias:** VCP-20, HU01-BD, HU03-BD (tabla `verification_tokens`)  
**Estado:** ✅ Completada

---

## Objetivo

Implementar la capa de acceso a datos (ORM) para el flujo de recuperación de contraseña.  
Reutiliza la tabla `verification_tokens` de HU03-BD mediante un campo discriminador `type`,  
evitando la creación de una tabla extra y manteniendo consistencia en la estrategia de tokens.

---

## Arquitectura de la solución

### Reutilización de tabla (decisión técnica)

La tabla `verification_tokens` ya existía desde HU03-BD. Se extendió con un campo `type`:

| Campo | Tipo | Descripción |
|---|---|---|
| `type` | `TEXT NOT NULL DEFAULT 'email_verification'` | Discrimina el flujo del token |

Los valores posibles de `type` son:
- `'email_verification'` → flujo de HU03-BD (verificación de correo)
- `'password_reset'` → flujo de HU04-BD (recuperación de contraseña)

### Archivos creados / modificados

| Archivo | Acción | Descripción |
|---|---|---|
| `src/features/users/password-reset.repository.ts` | ✨ Nuevo | Repositorio principal de HU04-BD |
| `src/features/users/types.ts` | ✏️ Modificado | Tipos `TokenType`, `CreatePasswordResetTokenParams`, `CreatePasswordResetTokenResult`, `ResetPasswordResult` |
| `src/features/users/index.ts` | ✏️ Modificado | Exports de las nuevas funciones y tipos |
| `scripts/migrate-password-reset.mjs` | ✨ Nuevo | Script de migración SQL (campo `type`) |
| `scripts/test-password-reset.mjs` | ✨ Nuevo | Script de aceptación — 7 pruebas, 4 criterios |
| `prisma/schema.prisma` | ✏️ Modificado | Campo `type` reflejado en el modelo `verification_tokens` |

---

## Funciones implementadas

### `createPasswordResetToken(params)`

Crea un token de recuperación y lo persiste en la BD.

- Genera 32 bytes seguros (criptográficamente aleatorios) si no se provee `plainToken`.
- Guarda únicamente el **hash SHA-256** — el token plano nunca toca la base de datos.
- Expiry: **1 hora** por defecto (más corto que los 24h de verificación de correo).
- Invalida todos los tokens de recuperación previos activos del mismo usuario antes de crear uno nuevo.

```typescript
const result = await createPasswordResetToken({ userId: "uuid-del-usuario" });
// result.plainToken → incluir en el correo
// result.tokenRecord → registro en BD
```

### `getPasswordResetToken(tokenOrHash)`

Consulta un token de recuperación por texto plano o hash directo.

- Filtra **únicamente** `type = 'password_reset'` para no confundir flujos.
- Devuelve `null` de forma controlada si el token no existe o la entrada es inválida.
- Incluye la relación `users` en el resultado.

```typescript
const token = await getPasswordResetToken(plainTokenDelEnlace);
if (!token) {
  // token no existe o entrada inválida
}
```

### `invalidatePasswordResetTokens(userId)`

Invalida todos los tokens de recuperación activos (`used = false`) de un usuario.

- Útil cuando el usuario cancela el flujo o solicita un nuevo enlace.
- Solo afecta tokens `type = 'password_reset'`; no toca tokens de verificación de correo.
- Devuelve la cantidad de tokens invalidados (0 si no había activos).

```typescript
const count = await invalidatePasswordResetTokens(userId);
```

### `resetPassword(plainToken, newPasswordHash)`

**Operación atómica** que consume el token y actualiza la contraseña en una sola transacción.

- La función recibe el **hash bcrypt** de la nueva contraseña (nunca el texto plano).
- Protección de concurrencia: `updateMany` con `WHERE used = false AND expires_at > NOW()` garantiza que dos solicitudes simultáneas no puedan consumir el mismo token.

```typescript
const result = await resetPassword(tokenDelEnlace, bcryptHashDeNuevaContrasena);

switch (result.reason) {
  case "SUCCESS":    // contraseña restablecida
  case "NOT_FOUND":  // token inexistente
  case "ALREADY_USED": // token ya consumido
  case "EXPIRED":    // token fuera de ventana válida
  case "INVALID_INPUT": // entradas vacías o nulas
}
```

---

## Migración aplicada

**Script:** `scripts/migrate-password-reset.mjs`

```sql
-- Agrega el discriminador de tipo a la tabla de tokens
ALTER TABLE public.verification_tokens
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'email_verification';

-- Índice para filtrar por tipo
CREATE INDEX IF NOT EXISTS verification_tokens_type_idx
  ON public.verification_tokens(type);

-- Índice compuesto para recuperar tokens de un usuario por tipo
CREATE INDEX IF NOT EXISTS verification_tokens_user_type_idx
  ON public.verification_tokens(user_id, type);
```

La migración es **backward-compatible**: todos los tokens existentes de HU03-BD mantienen el valor por defecto `'email_verification'`.

---

## Criterios de Aceptación — Resultados

| Criterio | Test | Estado |
|---|---|---|
| CA01 — El modelo y la migración se ejecutan sin errores en Supabase | CA01 | ✅ PASS |
| CA02.1 — Crear token funciona | CA02.1 | ✅ PASS |
| CA02.2 — Consultar token con relación users funciona | CA02.2 | ✅ PASS |
| CA02.3 — Invalidar tokens activos funciona | CA02.3 | ✅ PASS |
| CA03.1 — Token inexistente devuelve null controlado | CA03.1 | ✅ PASS |
| CA03.2 — Token inexistente en resetPassword devuelve NOT_FOUND | CA03.2 | ✅ PASS |
| CA04 — Dos resets simultáneos con el mismo token: solo uno acepta | CA04 | ✅ PASS |

**7/7 pruebas pasando — exit code 0.**

---

## Comandos disponibles

```bash
# Ejecutar la migración (ya aplicada en Supabase)
npm run db:migrate:password-reset

# Ejecutar la suite de aceptación
npm run db:test:password-reset

# Verificar que los tests anteriores no se rompieron
npm run db:test:users
npm run db:test:login
npm run db:test:verification
```

---

## Principios de seguridad aplicados

1. **Tokens de vida corta (1h):** Minimiza la ventana de ataque frente a los 24h de verificación de correo.
2. **Solo hash en BD:** El token plano solo existe en memoria durante la llamada a `createPasswordResetToken`; se devuelve al llamador para incluirlo en el correo y nunca se persiste.
3. **Hashing SHA-256:** Mismo estándar que HU03-BD. Si la BD es comprometida, los hashes no sirven para consumir el token.
4. **Invalidación de tokens previos:** Al crear un nuevo token, todos los activos previos del mismo usuario y tipo quedan invalidados.
5. **Transacción atómica en `resetPassword`:** Protege contra condiciones de carrera bajo carga concurrente.
6. **Contraseña hasheada externamente:** La función recibe `newPasswordHash` (bcrypt). Nunca texto plano.

---

## Relación con otras HUs

```
HU01-BD ──► tabla users (id, email, password_hash, role_id)
HU03-BD ──► tabla verification_tokens + campo email_verified en users
                          │
                          │ reutiliza tabla con campo 'type'
                          ▼
HU04-BD ──► password_reset tokens en verification_tokens
```

---

## Autor

**Jose Gutierrez** — `feature/HU04-BD-ORM/prisma-recuperacion/jose-gutierrez`
