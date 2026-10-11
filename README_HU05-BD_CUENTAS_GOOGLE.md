# HU05-BD — ORM Prisma: Cuentas Vinculadas de Google (OAuth)

## Historia de Usuario

> **Como** usuario registrado o nuevo usuario de Vice City,  
> **quiero** poder vincular mi cuenta de Google (o proveedores OAuth externos) a mi perfil en la plataforma,  
> **para** iniciar sesión rápidamente sin tener que ingresar o recordar contraseñas tradicionales.

**Ticket:** HU05-BD ORM Prisma: cuentas vinculadas de Google  
**Rama:** `feature/HU05-BD-ORM/prisma-cuentas-google/jose-gutierrez`  
**Dependencias:** VCP-20 (tablas base), HU01-BD ORM Prisma: usuarios  
**Estado:** ✅ Completada

---

## Objetivo

Implementar la **capa de acceso a datos (ORM con Prisma)** para gestionar identidades y cuentas externas (ej. Google Sign-In).  
Esta capa permite:
1. Buscar si una cuenta externa ya está asociada a un usuario en Vice City.
2. Asociar de forma segura y única una cuenta externa a un usuario existente.
3. Proteger la integridad de la base de datos contra duplicaciones, asignaciones indebidas y condiciones de carrera concurrentes.

---

## Decisiones Técnicas y Modelo de Datos

### Nueva Tabla: `linked_accounts`

Dado que la tabla `linked_accounts` no formaba parte de las 8 tablas base de VCP-20, se ejecutó una migración controlada en Supabase creando la tabla y sus restricciones:

```sql
CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT linked_accounts_provider_provider_account_id_key UNIQUE (provider, provider_account_id)
);
```

### Restricciones e Índices

- **Restricción UNIQUE `(provider, provider_account_id)`:** Asegura que una cuenta externa (por ejemplo, el ID único de Google) solo pueda estar enlazada a un único usuario del sistema.
- **Índice en `user_id`:** Para consultar eficientemente todas las cuentas vinculadas a un usuario.
- **Índice en `provider`:** Para filtrados y consultas agrupadas por proveedor de autenticación.
- **`ON DELETE CASCADE`:** Si un usuario es eliminado, sus cuentas vinculadas se borran limpiamente sin dejar registros huérfanos.

---

## Arquitectura de Archivos

```text
src/
└── features/
    └── users/
        ├── types.ts                     # Tipos LinkAccountParams, LinkAccountResult, LinkedAccountWithUser
        ├── linked-accounts.repository.ts # Repositorio ORM con findLinkedAccount, linkAccount, etc.
        └── index.ts                     # Exportaciones públicas de HU05-BD
scripts/
├── migrate-linked-accounts.mjs          # Script de migración SQL ejecutado en Supabase
└── test-linked-accounts.mjs             # Suite de aceptación automatizada (CA01 a CA04)
prisma/
└── schema.prisma                        # Modelo introspectado y sincronizado con Prisma Client
package.json                             # Scripts npm: db:migrate:linked-accounts, db:test:linked-accounts
```

---

## Funciones del Repositorio (`linked-accounts.repository.ts`)

### 1. `findLinkedAccount(provider, providerAccountId)`

Busca una cuenta vinculada por su proveedor e ID externo:
- Retorna el registro con la información del usuario (`include: { users: true }`).
- Si la cuenta no existe o los parámetros son inválidos, retorna `null` de forma controlada sin lanzar excepciones.

```typescript
const linked = await findLinkedAccount("google", "1182390123901293");
if (linked) {
  console.log(`Usuario autenticado vía Google: ${linked.users.email}`);
}
```

### 2. `linkAccount(params)`

Vincula una cuenta externa a un usuario con manejo exhaustivo de estados:
- **`SUCCESS`:** Cuenta vinculada exitosamente.
- **`ALREADY_LINKED_TO_SAME_USER`:** Operación idempotente (la cuenta ya estaba vinculada al mismo usuario).
- **`ALREADY_LINKED_TO_OTHER_USER`:** La cuenta ya pertenece a otro usuario registrado; la operación es rechazada limpiamente.
- **`USER_NOT_FOUND`:** El ID de usuario proporcionado no existe en la BD.
- **`INVALID_INPUT`:** Parámetros vacíos o malformados.
- **Manejo de Concurrencia:** Captura violaciones de unicidad de Prisma (`P2002`) cuando dos peticiones simultáneas intentan reclamar la misma cuenta externa, garantizando que solo una inserción sea persistida y la otra reciba un motivo de rechazo controlado.

```typescript
const result = await linkAccount({
  userId: "uuid-del-usuario",
  provider: "google",
  providerAccountId: "google-sub-id",
});

if (!result.success) {
  // Manejo controlado según result.reason
}
```

### 3. `getLinkedAccountsByUser(userId)`

Lista todas las cuentas externas asociadas al perfil de un usuario.

### 4. `unlinkAccount(userId, provider, providerAccountId)`

Desvincula una cuenta externa específica del usuario.

---

## Criterios de Aceptación Verificados

| Criterio | Test | Estado |
|---|---|---|
| **CA01** | El modelo y la migración se ejecutan sin errores en Supabase | CA01 | ✅ PASS |
| **CA02** | Buscar y vincular una cuenta funciona correctamente (con relación users) | CA02.1 / CA02.2 / CA02.3 | ✅ PASS |
| **CA03** | Caso de error: vincular una cuenta ya vinculada a otro usuario es rechazado | CA03 | ✅ PASS (`ALREADY_LINKED_TO_OTHER_USER`) |
| **CA04** | Caso límite: dos vinculaciones simultáneas de la misma cuenta, solo una se guarda | CA04 | ✅ PASS (Concurrencia atómica) |

---

## Comandos para Pruebas

```bash
# Ejecutar migración de cuentas vinculadas en Supabase
npm run db:migrate:linked-accounts

# Ejecutar la suite de pruebas de aceptación de HU05-BD
npm run db:test:linked-accounts

# Ejecutar pruebas de regresión de las historias previas
npm run db:test:users
npm run db:test:login
npm run db:test:verification
npm run db:test:password-reset
```

---

## Autor

**Jose Gutierrez** — `feature/HU05-BD-ORM/prisma-cuentas-google/jose-gutierrez`
