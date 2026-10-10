# Vice City

Aplicación web para la gestión de reservas de un complejo deportivo.

El proyecto utiliza **Next.js**, por lo que frontend y backend estarán dentro del mismo repositorio.

---

# 📁 Arquitectura

```text
vice-city/
│
├── src/
│   ├── app/
│   ├── features/
│   ├── components/
│   ├── services/
│   ├── lib/
│   ├── types/
│   └── middleware.ts
│
├── public/
├── tests/
├── .env.example
├── package.json
└── README.md
```

---

# 🧩 `src/app/`

Contiene las **rutas y páginas de Next.js**.

Aquí se crean las páginas que verá el usuario y los endpoints de la API.

```text
app/
├── (public)/
├── (auth)/
├── client/
├── employee/
├── admin/
└── api/
```

### Frontend

Las páginas y rutas visuales estarán aquí:

```text
app/client/
app/employee/
app/admin/
```

### Backend

Los endpoints estarán aquí:

```text
app/api/
```

Ejemplo:

```text
app/api/reservations/
app/api/payments/
app/api/qr/
```

**Importante:** los `route.ts` deben encargarse principalmente de recibir la petición, validar lo necesario y llamar a la lógica correspondiente. No deben convertirse en archivos con toda la lógica del sistema.

---

# 🧩 `src/features/`

Aquí se organiza el proyecto por **funcionalidades**.

```text
features/
├── auth/
├── users/
├── services/
├── reservations/
├── payments/
├── tickets/
├── qr/
├── pos/
├── employees/
├── administration/
└── reports/
```

Cada feature contiene lo necesario específicamente para esa funcionalidad.

Por ejemplo:

```text
features/reservations/
├── components/
├── hooks/
├── schemas/
├── services/
└── types/
```

### ¿Qué va aquí?

Todo lo específico de la funcionalidad.

Ejemplo:

`ReservationForm.tsx` pertenece a:

```text
features/reservations/components/
```

No debe colocarse directamente en `components/` si solamente sirve para reservas.

---

# 🎨 `src/components/`

Componentes **reutilizables en diferentes partes del sistema**.

```text
components/
├── ui/
├── layout/
└── common/
```

Ejemplos:

```text
Button
Input
Modal
Navbar
Sidebar
Loading
```

Si un componente solamente pertenece a una feature, va dentro de esa feature.

---

# ⚙️ `src/services/`

Aquí estará la **lógica de negocio** del sistema.

Ejemplos:

```text
services/
├── reservation.service.ts
├── payment.service.ts
├── employee.service.ts
└── ...
```

Aquí se manejarán reglas como:

* Disponibilidad.
* Capacidad.
* Precios.
* Descuentos.
* Validaciones de negocio.
* Creación y gestión de reservas.

La idea es evitar colocar toda esta lógica directamente dentro de `app/api`.

---

# 🛠️ `src/lib/`

Funciones y configuraciones técnicas que puedan ser utilizadas por diferentes partes del proyecto.

Por ejemplo:

```text
lib/
├── auth/
├── validations/
└── ...
```

---

# 📦 `src/types/`

Tipos de TypeScript que sean **compartidos por diferentes funcionalidades**.

Si un tipo solamente pertenece a una feature, debe estar dentro de esa feature.

---

# 🔀 ¿Dónde trabaja Frontend y Backend?

Como utilizamos Next.js, **no existen dos proyectos separados**.

Ambos trabajan dentro del mismo repositorio:

```text
vice-city/
└── src/
    │
    ├── app/              ← Rutas y páginas + API
    │
    ├── features/         ← Funcionalidades
    │
    ├── components/       ← Componentes reutilizables
    │
    ├── services/         ← Lógica de negocio
    │
    ├── lib/              ← Utilidades técnicas
    │
    └── types/            ← Tipos compartidos
```

### Frontend principalmente trabaja en:

```text
app/
features/
components/
```

### Backend principalmente trabaja en:

```text
app/api/
services/
lib/
types/
```

Pero **frontend y backend pueden necesitar modificar archivos de otras carpetas** cuando una funcionalidad lo requiera.

---

# 🌿 Ramas

Cada tarea debe tener su propia rama, revisar *metodo de trabajo* para crear tus ramas, no olvidar la 
*documentacion, para crear los pullrequest* y que cada HU tiene un indicativo cuando es de backend y cuando es de f si la hu es de backend termine en *B* en el jira y frontend el indicativo es *F* usarlo
y la estructura de cada commit que tambien esta detalla de en *metodo de trabajo*


No se trabaja directamente sobre `main` ni `develop`.

---

# 🔄 Flujo de trabajo

```text
Jira Task
    ↓
Crear rama
    ↓
Desarrollar
    ↓
Pull Request
    ↓
Revisión
    ↓
Merge
    ↓
develop
```

---

# 📌 Regla principal

Antes de crear código, identificar **a qué funcionalidad pertenece** y colocarlo en el lugar correspondiente.

La estructura debe mantenerse organizada para que cualquier integrante pueda encontrar fácilmente el código de una funcionalidad y trabajar sobre ella sin mezclar responsabilidades.

---

# 🚀 Guía de Configuración Local y Base de Datos (Rama `backend`)

Esta sección detalla el paso a paso para configurar el entorno local, conectar a Supabase e interactuar con la base de datos PostgreSQL mediante Prisma ORM.

---

### 1. Variables de Entorno (`.env.local`)

Crea un archivo `.env.local` en la raíz del proyecto tomando como referencia `.env.example`.

```env
# ==========================================
# BASE DE DATOS (Supabase + Prisma) - DEV 1
# ==========================================
# 1. Transaction Pooler (puerto 6543) - Para consultas y runtime de Next.js
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# 2. Session Pooler (puerto 5432) - Para introspección y migraciones de Prisma
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# ==========================================
# CREDENCIALES DE SUPABASE - DEV 1
# ==========================================
# URL pública del proyecto (SIN barra diagonal final '/')
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"

# Llave anónima pública de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# Llave Service Role (NUNCA exponer en cliente, solo backend en servidor)
# SUPABASE_SERVICE_ROLE_KEY="..."
```

> [!WARNING]
> **Errores comunes a evitar en `.env.local`:**
> * **No duplicar el nombre de la variable en el valor:** Evitar `DATABASE_URL="DATABASE_URL="postgresql://...""`. Debe ser únicamente `DATABASE_URL="postgresql://..."`. De lo contrario, fallará con error `getaddrinfo ENOTFOUND base`.
> * **Comentar siempre las líneas informativas:** Toda línea que no sea `CLAVE=VALOR` debe comenzar con `#`. Si se deja texto plano suelto, el lector de variables fallará.
> * **Sin barra diagonal al final de la URL:** `NEXT_PUBLIC_SUPABASE_URL` no debe terminar en `/` para evitar rutas rotas como `//rest/v1/...`.

---

### 2. Instalación de Dependencias

Ejecuta en la terminal para instalar los paquetes base de Next.js y React:

```bash
npm install
```

---

### 3. Configuración de Prisma ORM (Versión 6 Estable)

> [!IMPORTANT]
> **¿Por qué Prisma 6 y no Prisma 8?**  
> Actualmente `npm install prisma` o `npx prisma` sin versión instala **Prisma 8 (Release Candidate)**, la cual tiene una CLI experimental rediseñada donde los comandos `prisma db pull` y `prisma generate` no están disponibles en la raíz.  
> Por estabilidad del equipo, utilizamos **Prisma 6.x**.

#### A. Instalar Prisma 6:
```bash
npm install -D prisma@6
npm install @prisma/client@6
```

#### B. Si existe `prisma.config.ts`, eliminarlo:
Prisma 8 genera un archivo `prisma.config.ts` que entra en conflicto con Prisma 6. Si existe, bórralo:
```bash
# En Windows PowerShell:
Remove-Item -Path "prisma.config.ts" -Force -ErrorAction SilentlyContinue
# En bash / macOS / Linux:
rm -f prisma.config.ts
```

#### C. Crear / Configurar `prisma/schema.prisma`:
Asegúrate de que en el archivo `prisma/schema.prisma` se configure tanto `url` (pooler) como `directUrl` (conexión directa para DDL e introspección):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

### 4. Sincronización con la Base de Datos

> [!NOTE]
> La CLI de Prisma busca por defecto un archivo `.env`. Si solo tienes `.env.local`, genera una copia ejecutando:
> ```bash
> # En Windows PowerShell:
> Copy-Item .env.local .env
> # En bash / macOS / Linux:
> cp .env.local .env
> ```

Una vez configuradas las variables de entorno y el esquema:

1. **Descargar las tablas existentes en Supabase (Introspección):**
   ```bash
   npm run db:pull
   # o: npx prisma db pull
   ```
   *(Este comando leerá las tablas creadas en Supabase — `roles`, `users`, `bookings`, etc. — y generará los modelos correspondientes en `prisma/schema.prisma`)*.

2. **Generar los tipos de TypeScript del cliente de Prisma:**
   ```bash
   npm run db:generate
   # o: npx prisma generate
   ```

---

### 5. Cliente de Prisma para Next.js (Singleton)

El archivo `src/lib/prisma.ts` ya está creado para reutilizar una única instancia de `PrismaClient` y evitar saturar el pool de conexiones durante el desarrollo:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

### 6. 🧪 ¿Cómo Testear la Conexión y los Cambios?

Para verificar que la base de datos, Prisma y los tipos funcionan correctamente, dispones de varios métodos:

#### Método 1: Script de prueba rápida en terminal (Recomendado)
Ejecuta el script de prueba preconfigurado:
```bash
npm run db:test
```
* **¿Qué hace?** Conecta con PostgreSQL mediante Prisma, ejecuta un query raw de versión y consulta la tabla `roles` mostrando una tabla con los registros en la terminal.
* **Resultado esperado:**
  ```text
  ⏳ Probando conexión a la base de datos con Prisma Client...
  ✅ Conexión exitosa a PostgreSQL: { current_database: 'postgres', current_user: 'postgres', version: 'PostgreSQL 17...' }
  ✅ Consulta ORM exitosa: Se encontraron 3 roles:
  ┌─────────┬────────────────────────────────────────┬────────────┬───────────────────────────────────────────────────┐
  │ (index) │ id                                     │ name       │ description                                       │
  ├─────────┼────────────────────────────────────────┼────────────┼───────────────────────────────────────────────────┤
  │ 0       │ '2888b9fa-1f64-4381-a003-e652df78cdd2' │ 'admin'    │ 'Administrador con acceso total'                  │
  │ 1       │ '07e5ce40-d4bb-41f5-ab3b-fcb856b96f5f' │ 'staff'    │ 'Personal que valida accesos y gestiona reservas' │
  │ 2       │ 'b7a9d4b8-55df-441e-a621-276b7501938b' │ 'customer' │ 'Cliente final'                                   │
  └─────────┴────────────────────────────────────────┴────────────┴───────────────────────────────────────────────────┘
  ```

#### Método 2: Explorador visual con Prisma Studio
Para inspeccionar o manipular datos visualmente desde el navegador:
```bash
npm run db:studio
# o: npx prisma studio
```
* Abre automáticamente en tu navegador `http://localhost:5555`.
* Permite navegar por todas las tablas (`services`, `bookings`, `tickets`, `users`, etc.), filtrar, editar y crear registros de prueba.

#### Método 3: Prueba en un Endpoint de Next.js (Route Handler)
Puedes crear una ruta API en `src/app/api/test-db/route.ts` para verificar la conexión vía HTTP:
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const roles = await prisma.roles.findMany();
    return NextResponse.json({ ok: true, count: roles.length, roles });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
```
Inicia el servidor (`npm run dev`) y visita `http://localhost:3000/api/test-db` en el navegador.

#### Método 4: Comprobación de compilación del proyecto
Verifica que TypeScript y Next.js compilen sin errores con los tipos generados de Prisma:
```bash
npm run build
```

---

### 7. Guía Rápida de Solución de Problemas (Troubleshooting)

| Error en consola | Causa | Solución |
| :--- | :--- | :--- |
| `Environment variable not found: DIRECT_URL` | Prisma CLI busca `.env` y solo existe `.env.local`. | Ejecuta `Copy-Item .env.local .env` (o `cp .env.local .env`) o usa `npm run db:pull`. |
| `No command registered for pull` | Se ejecutó Prisma 8 RC en vez de Prisma 6. | Instala `prisma@6` (`npm install -D prisma@6`) y borra `prisma.config.ts`. |
| `Failed to parse syntax of config file at prisma.config.ts` | El archivo de configuración de Prisma 8 interfiere con Prisma 6. | Elimina `prisma.config.ts`. |
| `getaddrinfo ENOTFOUND base` | La variable `DATABASE_URL` tiene formato inválido en `.env.local`. | Revisa [.env.local](file:///.env.local) y elimina comillas dobles repetidas o `DATABASE_URL="DATABASE_URL=..."`. |
| `P1001: Can't reach database server` | Puerto o host incorrecto, o red bloqueada. | Asegúrate de usar el Transaction Pooler en el puerto `6543` para runtime y el Session Pooler en `5432` para `DIRECT_URL`. |
| `Middleware is missing expected function export` | `src/middleware.ts` está vacío. | Asegúrate de exportar una función `export function middleware(request: NextRequest)` válida. |

---

# 🔐 Autenticación: Endpoint de Registro (HU01-B)

### 📡 `POST /api/auth/register`

Expone la ruta API en Next.js para recibir y procesar el registro de nuevos usuarios en el sistema, validando la entrada y delegando a la capa de lógica de negocio.

* **Método:** `POST`
* **Content-Type:** `application/json`
* **Contrato Swagger / OpenAPI:** [`docs/swagger/auth-register.swagger.json`](file:///docs/swagger/auth-register.swagger.json)

#### Estructura de la Solicitud (Body):
```json
{
  "fullName": "Jandy Peña",
  "email": "jandy@ejemplo.com",
  "password": "Password123!"
}
```

#### Respuestas del Servidor:
* **`201 Created`**: Usuario registrado exitosamente.
  ```json
  {
    "success": true,
    "message": "Usuario registrado exitosamente",
    "data": {
      "id": "e5b8...-uuid",
      "email": "jandy@ejemplo.com",
      "fullName": "Jandy Peña",
      "role": "customer",
      "createdAt": "2026-10-05T12:00:00.000Z"
    }
  }
  ```
* **`400 Bad Request`**: Datos inválidos, campos obligatorios faltantes, cuerpo vacío o campos extra no reconocidos (`.strict()`).
  ```json
  {
    "success": false,
    "error": "VALIDATION_ERROR",
    "message": "Datos de registro inválidos",
    "details": [
      { "field": "email", "message": "El formato del correo electrónico es inválido" }
    ]
  }
  ```
* **`409 Conflict`**: Correo electrónico ya registrado en el sistema.
  ```json
  {
    "success": false,
    "error": "USER_ALREADY_EXISTS",
    "message": "El correo electrónico ya se encuentra registrado"
  }
  ```
* **`500 Internal Server Error`**: Error no controlado en el servidor.

#### Ejecución de Pruebas Automatizadas:
```bash
npm test
```
Ejecuta la suite completa de pruebas unitarias tanto de la capa API (`register.route.test.mjs`) como de la capa de negocio (`register.service.test.mjs`).
