# HU01-BD — ORM Prisma: Usuarios & Siembra de Administrador

Este documento describe la implementación de la capa de acceso a datos de usuarios (ORM con Prisma) y el proceso de siembra (*seed*) del usuario administrador raíz para el proyecto **Vice City**, correspondiente a la historia **HU01-BD** (alineada con la base de datos VCP-20).

---

## 📋 Resumen de la Tarea

* **Historia / Subtask:** HU01-BD — ORM Prisma: usuarios
* **Objetivo:** Implementar la capa de acceso a datos de usuarios con Prisma ORM, respetando la arquitectura modular de Next.js (`src/features/users/`), garantizando que las reglas de unicidad e integridad sean forzadas por la base de datos PostgreSQL en Supabase.
* **Dependencias:** VCP-20 (Tablas y esquemas de base de datos en Supabase).
* **Decisión Técnica:** Uso de Prisma como ORM acordado con el equipo backend.

---

## 🏛️ Arquitectura y Archivos Implementados

Siguiendo las reglas de arquitectura del proyecto (`AGENTS.md` y `.agents/skills/vice-city-architecture`):

```text
vice-city/
├── src/
│   └── features/
│       └── users/
│           ├── types.ts              # Tipos TypeScript para entrada (CreateUserData) y salida (UserWithRole)
│           ├── user.repository.ts    # Funciones de acceso a datos (createUser, findUserByEmail, isUniqueConstraintError)
│           └── index.ts              # Punto de entrada público (barrel export) del módulo users
├── scripts/
│   ├── test-users.mjs                # Script de prueba automatizada de criterios de aceptación contra Supabase
│   └── seed-admin.mjs                # Script de siembra del usuario administrador y trigger de inmutabilidad
├── package.json                      # Comandos npm añadidos (db:test:users, db:seed:admin)
└── README_HU01-BD.md                 # Esta documentación técnica
```

---

## 🔍 Funcionalidades de la Capa de Datos (`src/features/users/`)

### 1. `createUser(data: CreateUserData): Promise<UserWithRole>`
* Inserta un usuario en la tabla `public.users`.
* Normaliza el email a minúsculas (`trim().toLowerCase()`) antes del registro como práctica de defensa en profundidad.
* La restricción de unicidad y protección contra condiciones de carrera concurrentes se delega al índice único `users_email_lower_uidx` (`UNIQUE(lower(email))`) de PostgreSQL.

### 2. `findUserByEmail(email: string): Promise<UserWithRole | null>`
* Realiza una búsqueda insensible a mayúsculas/minúsculas utilizando el modo `insensitive` de Prisma (`equals: email.trim(), mode: "insensitive"`), traduciéndose en una consulta `ILIKE` en PostgreSQL.
* Incluye la relación con la tabla `roles` (`include: { roles: true }`).

### 3. `isUniqueConstraintError(error: unknown): boolean`
* Helper utilitario que identifica si un error arrojado por Prisma corresponde a un código `P2002` (violación de restricción única), permitiendo a controladores o servicios superiores manejar correos duplicados sin acoplarse a detalles internos de Prisma.

---

## 🛡️ Siembra del Usuario Administrador Raíz (*Root Admin*)

Se configuró la siembra del usuario administrador maestro requerido para el control inicial de trabajadores, canchas y servicios.

### 1. Credenciales y Datos Asignados

| Campo | Valor | Notas |
|---|---|---|
| **ID en BD** | Generado en Supabase | Identificador UUID |
| **Email** | Configurado en el entorno seguro | Email principal del sistema |
| **Nombre** | `admin` | Nombre completo del usuario |
| **Contraseña** | Definida fuera del repositorio | Almacenada como hash **bcrypt** seguro |
| **Rol** | `admin` | Asignado al rol `admin` |
| **Activo** | `true` | Estado activo |
| **Metadatos** | `{"immutable": true, "system_root": true, ...}` | Marcador de cuenta del sistema |

### 2. Hash de Contraseña Seguro
La contraseña no se almacena en texto plano. Se procesa utilizando el algoritmo **bcrypt** estándar (cost factor 10) mediante la extensión nativa `pgcrypto` de PostgreSQL (`crypt(<contraseña-segura>, gen_salt('bf', 10))`), garantizando compatibilidad total con librerías de autenticación como `bcryptjs`, NextAuth o Supabase Auth.

### 3. Garantía de Inmutabilidad en Base de Datos
Para asegurar que este usuario **no pueda ser modificado ni eliminado bajo ninguna circunstancia**:

Se implementó un trigger en PostgreSQL (`trg_protect_admin_user`) que intercepta cualquier `UPDATE` o `DELETE` sobre `public.users`:

```sql
CREATE OR REPLACE FUNCTION public.protect_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.email = 'admin@vicecity.com' THEN
    RAISE EXCEPTION 'El usuario administrador principal (%) no puede ser modificado ni eliminado.', OLD.email;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_admin_user ON public.users;
CREATE TRIGGER trg_protect_admin_user
  BEFORE UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_user();
```

---

## 💻 Scripts Disponibles

En la raíz del proyecto se pueden ejecutar los siguientes comandos:

```bash
# Probar conexión general a Supabase y listar roles
npm run db:test

# Ejecutar la suite de pruebas de aceptación de usuarios contra Supabase
npm run db:test:users

# Sembrar o verificar el usuario administrador y su trigger de protección
npm run db:seed:admin
```
