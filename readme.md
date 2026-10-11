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

# 🔑 HU04-B: Lógica de Negocio de Recuperación de Contraseña

Esta funcionalidad implementa las reglas de negocio para la recuperación y restablecimiento seguro de contraseñas de usuarios en Vice City.

### Ubicación del Código
* `src/features/auth/services/password-reset.service.ts`: Servicio principal con validaciones, generación de tokens criptográficos de un solo uso con expiración de 1 hora, invalidación de tokens previos y restablecimiento seguro con encriptación bcrypt.
* `src/features/auth/services/email.service.ts`: Abstracción desacoplada de correo (`IEmailSender`, `ConsoleEmailSender`, `MockEmailSender`).
* `src/features/auth/errors/password-reset.errors.ts`: Errores de dominio tipados (`PasswordResetTokenExpiredError`, `InvalidPasswordResetTokenError`, `UserNotFoundError`, `WeakPasswordError`).
* `src/features/auth/index.ts`: Barrel exports del módulo de autenticación.
* `tests/unit/password.reset.test.mjs`: Pruebas unitarias de la lógica sin dependencias de red o endpoints HTTP.

### Ejecución de Pruebas Unitarias
```bash
npm test
# o:
npm run test:unit
```

### Compilación y Validación de Tipos
```bash
npm run build
```

---

# 🌐 HU05-B: Lógica de Negocio de Inicio de Sesión con Google

Esta funcionalidad implementa las reglas de negocio para el acceso federado mediante Google OAuth en Vice City.

### Ubicación del Código
* `src/features/auth/services/google-auth.service.ts`: Servicio con la lógica de registro de nuevos clientes (`CLIENT`), vinculación transparente de cuentas existentes sin duplicados, tratamiento de correos verificados y normalización insensible a mayúsculas.
* `src/features/auth/errors/google-auth.errors.ts`: Errores de dominio tipados (`GoogleEmailNotProvidedError`, `UserInactiveError`, `GoogleAuthError`).
* `src/features/auth/index.ts`: Barrel exports del módulo de autenticación.
* `tests/unit/google.auth.test.mjs`: Pruebas unitarias de la lógica sin dependencias de red o endpoints HTTP.

### Ejecución de Pruebas Unitarias
```bash
npm test
# o:
npm run test:unit
```

### Compilación y Validación de Tipos
```bash
npm run build
```

### Guía de Configuración de Google Cloud Console (Desarrollo y Producción)
Para configurar las credenciales OAuth 2.0 y el callback en Google Cloud Console, consulta:
👉 [`docs/GOOGLE_OAUTH_SETUP_GUIDE.md`](./docs/GOOGLE_OAUTH_SETUP_GUIDE.md)

---

### 8. Autenticación y Sesiones JWT con NextAuth (HU02-B)

Esta sección describe la configuración de sesiones y tokens JWT implementada mediante **NextAuth.js**:

#### A. Variables requeridas en `.env.local`:
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-clave-secreta-super-segura-aqui"
```

#### B. Roles del SRS Soportados:
La sesión y el token JWT adjuntan obligatoriamente uno de los cuatro roles válidos del SRS:
* `ADMIN`
* `CLIENT`
* `TICKET_SELLER`
* `QR_VALIDATOR`

Cualquier usuario con rol ausente o fuera de este enum es rechazado con error de negocio.

#### C. Ejecución de Pruebas Unitarias de Autenticación:
```bash
npm test
```
Verifica validación de credenciales, comparación de hashes bcrypt, asignación de roles y rechazo ante campos vacíos o con espacios.

---

# 📧 HU03-B: Lógica de Negocio de Confirmación de Correo

Esta funcionalidad gestiona el ciclo de vida y validación de tokens seguros para la verificación de correos de usuarios registrados.

### Ubicación del Código
* `src/features/auth/services/email-confirmation.service.ts`: Servicio principal de lógica de negocio (generación de tokens criptográficos, expiración, validación, invalidación atómica al reenviar).
* `src/features/auth/services/email.service.ts`: Abstracción desacoplada de envío de correos (`IEmailSender`, `ConsoleEmailSender`, `MockEmailSender`).
* `src/features/auth/errors/email-confirmation.errors.ts`: Errores de dominio tipados (`TokenExpiredError`, `InvalidTokenError`, `UserAlreadyVerifiedError`, `UserNotFoundError`).
* `tests/unit/email.confirmation.test.mjs`: Pruebas unitarias de la lógica de negocio sin depender de endpoints HTTP.

### Ejecución de Pruebas Unitarias
Para ejecutar las pruebas de lógica de confirmación:
```bash
npm test
# o:
npm run test:unit
```

### Compilación y Validación de Tipos
```bash
npm run build
```

### Política de Usuario No Verificado (Propuesta para Product Owner)
* **Permitido:** Iniciar sesión, ver catálogo de servicios/canchas, consultar horarios y precios, y solicitar reenvío de correo.
* **Restringido:** Crear reservas activas, efectuar pagos y generar tickets/códigos QR de acceso.

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

---

# 🔐 Autenticación: Endpoints de Login y Sesión (HU02-B)

### 📡 `POST /api/auth/login`

Expone la ruta API en Next.js para el inicio de sesión de usuarios, validando las credenciales de entrada con esquema estricto (Zod), delegando la comprobación a la lógica de negocio (`authenticateUser`) y retornando los datos del usuario autenticado con su rol asignado según el SRS.

* **Método:** `POST`
* **Content-Type:** `application/json`
* **Contrato Swagger / OpenAPI:** [`docs/swagger/auth-login.swagger.json`](file:///docs/swagger/auth-login.swagger.json)

#### Estructura de la Solicitud (Body):
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123!"
}
```

#### Respuestas del Servidor:
* **`200 OK`**: Inicio de sesión exitoso.
  ```json
  {
    "success": true,
    "message": "Inicio de sesión exitoso",
    "data": {
      "id": "e5b8...-uuid",
      "email": "usuario@ejemplo.com",
      "name": "Nombre Usuario",
      "role": "CLIENT"
    }
  }
  ```
* **`400 Bad Request`**: Datos inválidos, campos obligatorios faltantes, cuerpo vacío o campos extra no reconocidos (`.strict()`).
  ```json
  {
    "success": false,
    "error": "VALIDATION_ERROR",
    "message": "Datos de inicio de sesión inválidos",
    "details": [
      { "field": "email", "message": "El formato del correo electrónico es inválido" }
    ]
  }
  ```
* **`401 Unauthorized`**: Credenciales incorrectas o usuario no autorizado.
  ```json
  {
    "success": false,
    "error": "INVALID_CREDENTIALS",
    "message": "Credenciales incorrectas: correo o contraseña no válidos"
  }
  ```
* **`500 Internal Server Error`**: Error no controlado en el servidor.

---

### 📡 `GET /api/auth/session`

Endpoint para consultar la sesión activa actual del usuario autenticado vía NextAuth.

* **Método:** `GET`
* **Contrato Swagger / OpenAPI:** [`docs/swagger/auth-login.swagger.json`](file:///docs/swagger/auth-login.swagger.json)

#### Respuestas del Servidor:
* **`200 OK` (Sin sesión activa):**
  ```json
  {
    "success": true,
    "authenticated": false,
    "data": null
  }
  ```
* **`200 OK` (Con sesión activa):**
  ```json
  {
    "success": true,
    "authenticated": true,
    "data": {
      "id": "e5b8...-uuid",
      "email": "usuario@ejemplo.com",
      "name": "Nombre Usuario",
      "role": "CLIENT"
    }
  }
  ```
* **`500 Internal Server Error`**: Error al consultar la sesión del usuario.

#### Ejecución de Pruebas Automatizadas:
```bash
npm test
```
Ejecuta la suite completa de pruebas unitarias (`tests/unit/*.test.mjs`), cubriendo los endpoints de la API (`login.route.test.mjs`, `register.route.test.mjs`) y la lógica de negocio y roles SRS (`auth.jwt.test.mjs`, `register.service.test.mjs`).

---

# 📖 Documentación Swagger / OpenAPI y Uso del API Tester

El proyecto cuenta con especificaciones OpenAPI 3.0 para todos los endpoints desarrollados y dos formas principales de consumirlos y explorarlos:

## 1. Explorador Visual Interactivo: Vice-City API Tester (Recomendado)

Se incluye un aplicativo web local que embebe la interfaz oficial de **Swagger UI** y proporciona un constructor de peticiones HTTP en tiempo real para el equipo de frontend.

### Cómo iniciarlo:
```bash
# 1. Asegúrate de tener el backend de Vice City corriendo (en una terminal):
npm run dev

# 2. En otra terminal, inicia el API Tester:
cd api-tester
npm run dev
```

Abre tu navegador en: **`http://127.0.0.1:5173`**

### Funcionalidades Swagger en el API Tester:
* **Pestaña "Swagger UI":** Renderiza la interfaz oficial de Swagger (`swagger-ui-dist`) con todos los modelos, schemas de solicitud y respuestas esperadas.
* **Selector de Presets:** Permite alternar entre la especificación unificada completa o contratos individuales (Autenticación, Recuperación de Contraseña, Roles, Empleados, Complejo Deportivo).
* **Importación:** Puedes cargar cualquier archivo `.json` / `.yaml` personalizado o consultar URLs externas.
* **Pestaña "Endpoints":** Permite ejecutar peticiones directamente contra `http://localhost:3000` con autenticación simulada (Mock Role `ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`), cookies o JWT.

Para más detalles, consulta: [`api-tester/README.md`](file:///api-tester/README.md).

---

## 2. Archivos de Contratos OpenAPI (`docs/swagger/`)

Los contratos estáticos en formato JSON OpenAPI 3.0 se encuentran organizados en la carpeta `docs/swagger/`:

| Contrato | Archivo | Endpoints Cubiertos |
| :--- | :--- | :--- |
| **Registro de Usuarios** | [`docs/swagger/auth-register.swagger.json`](file:///docs/swagger/auth-register.swagger.json) | `POST /api/auth/register` |
| **Login y Sesión** | [`docs/swagger/auth-login.swagger.json`](file:///docs/swagger/auth-login.swagger.json) | `POST /api/auth/login`, `GET /api/auth/session` |
| **Recuperación Contraseña** | [`docs/swagger/auth-password-reset.swagger.json`](file:///docs/swagger/auth-password-reset.swagger.json) | `POST /api/auth/forgot-password`, `GET /api/auth/reset-password`, `POST /api/auth/reset-password` |
| **Google OAuth** | [`docs/swagger/auth-google.swagger.json`](file:///docs/swagger/auth-google.swagger.json) | `POST /api/auth/google`, `GET /api/auth/google` |
| **Cierre de Sesión** | [`docs/swagger/auth-logout.swagger.json`](file:///docs/swagger/auth-logout.swagger.json) | `POST /api/auth/logout` |
| **Gestión de Roles** | [`docs/swagger/admin-roles.swagger.json`](file:///docs/swagger/admin-roles.swagger.json) | `GET /api/admin/users`, `PATCH /api/admin/users/{id}/role` |
| **Gestión de Empleados (HU19)** | [`docs/swagger/employees.swagger.json`](file:///docs/swagger/employees.swagger.json) | `GET /api/employees`, `POST /api/employees`, `GET /api/employees/{id}`, `PATCH /api/employees/{id}`, `DELETE /api/employees/{id}` |
| **Catálogo y Disponibilidad (HU20)** | [`docs/swagger/hu20-availability.swagger.json`](file:///docs/swagger/hu20-availability.swagger.json) | `GET /api/catalog`, `GET /api/availability` |
| **Reserva y HOLD 10 min (HU21)** | [`docs/swagger/hu21-reservation-hold.swagger.json`](file:///docs/swagger/hu21-reservation-hold.swagger.json) | `POST /api/reservations/hold`, `GET /api/reservations/{id}` |
| **Descuentos y Promociones (HU22)** | [`docs/swagger/hu22-discounts.swagger.json`](file:///docs/swagger/hu22-discounts.swagger.json) | `POST /api/pricing/calculate` |
| **Checkout con Stripe Test (HU23)** | [`docs/swagger/hu23-stripe-checkout.swagger.json`](file:///docs/swagger/hu23-stripe-checkout.swagger.json) | `POST /api/payments/create-intent` |
| **Webhook de Stripe (HU24)** | [`docs/swagger/hu24-stripe-webhook.swagger.json`](file:///docs/swagger/hu24-stripe-webhook.swagger.json) | `POST /api/payments/webhook` |

---

## 3. Visualización Externa (Swagger Editor o VS Code)

Si deseas visualizar los archivos `.swagger.json` fuera del API Tester:

1. **Swagger Editor Online:**
   * Abre [editor.swagger.io](https://editor.swagger.io/).
   * Ve a **File** ➔ **Import File** (o pega el contenido JSON).
2. **VS Code / Cursor (Extensión):**
   * Instala la extensión **OpenAPI (Swagger) Editor** o **Swagger Viewer**.
   * Abre cualquiera de los archivos en `docs/swagger/` y presiona `Shift + Alt + E` para previsualizar.

# 📅 FT-04 / HU20: Catálogo y Disponibilidad de Servicios

Esta funcionalidad implementa el catálogo público y el motor de disponibilidad y aforo por franja horaria para Vice City (RN-001 a RN-012).

### Ubicación del Código (Vertical Slice)
* `src/features/services/services/availability.service.ts`: Motor de cálculo de aforo por franja horaria, validación de horario operativo (8:00 AM — 5:00 PM), bloqueo de mantenimiento semanal y compras en curso (RN-010).
* `src/features/services/services/catalog.service.ts`: Consulta de categorías y servicios activos con precio y aforo.
* `src/features/services/utils/colombian-holidays.util.ts`: Detección algorítmica de festivos en Colombia (Ley Emiliani) y traslado de mantenimiento a martes (RN-003).
* `src/features/services/utils/date-bogota.util.ts`: Cálculos en zona horaria oficial `America/Bogota` (RN-002).
* `src/features/services/schemas/availability.schema.ts`: Esquemas de validación Zod con `.strict()`.
* `src/app/api/catalog/route.ts`: Endpoint público GET `/api/catalog`.
* `src/app/api/availability/route.ts`: Endpoint unificado GET `/api/availability` (Web y POS, RN-012).
* `src/app/(public)/catalog/page.tsx`: Vista pública responsiva con Tailwind v4.
* `docs/swagger/hu20-availability.swagger.json`: Especificación OpenAPI 3.0 / Swagger.
* `tests/unit/availability.test.mjs`: Pruebas unitarias de la lógica y casos de borde.

### Ejecución de Pruebas Unitarias
```bash
npm test
# o:
npm run test:unit
```

### Compilación y Validación de Tipos
```bash
npm run build
```

---

# ⏱️ FT-04 / HU21: Reserva con Retención (HOLD) de 10 Minutos

Esta funcionalidad implementa la creación atómica de reservas con retención temporal (HOLD) de 10 minutos (RN-006, RN-009, RN-011 y RN-012).

### Ubicación del Código (Vertical Slice)
* `src/features/reservations/services/reservation-hold.service.ts`: Motor de retención atómica con transacciones de Prisma, fijación de tarifa histórica, cálculo de expiración de 10 minutos y liberación automática de cupos vencidos.
* `src/features/reservations/schemas/reservation.schema.ts`: Esquema de validación Zod con `.strict()`.
* `src/features/reservations/errors/reservation.errors.ts`: Errores de dominio (`SlotFullConflictError` 409, `HoldExpiredError` 410, `InvalidDurationError` 400).
* `src/app/api/reservations/hold/route.ts`: Endpoint POST para generar el HOLD de 10 minutos.
* `src/app/api/reservations/[id]/route.ts`: Endpoint GET para consultar estado y segundos restantes del temporizador.
* `src/app/(public)/checkout/[bookingId]/page.tsx`: Pantalla de checkout con temporizador regresivo reactivo y resumen de reserva.
* `docs/swagger/hu21-reservation-hold.swagger.json`: Especificación OpenAPI 3.0 / Swagger.
* `tests/unit/reservations.hold.test.mjs`: Pruebas unitarias de la lógica y concurrencia.

### Ejecución de Pruebas Unitarias
```bash
npm test
# o:
npm run test:unit
```
### Compilación y Validación de Tipos
```bash
npm run build
```

---

# 🏷️ FT-04 / HU22: Descuentos y Promociones

Esta funcionalidad implementa el cálculo automático de precios y aplicación de promociones y descuentos oficiales de Vice City (RN-013, RN-014 y RN-015).

### Ubicación del Código (Vertical Slice)
* `src/features/pricing/services/discount-calculator.service.ts`: Motor de cálculo de precios, evaluación de descuento del 20% los miércoles (RN-013), descuento del 20% por reserva completa de piscina con bloqueo de 50 cupos (RN-014), restricción en viernes, fines de semana y festivos, y regla de no acumulación (RN-015).
* `src/features/pricing/schemas/pricing.schema.ts`: Esquema de validación Zod con `.strict()`.
* `src/features/pricing/errors/discount.errors.ts`: Errores de dominio (`FullPoolDayRestrictedError` 422, `PricingError`).
* `src/features/pricing/types/discount.types.ts`: Tipos TypeScript para parámetros y desglose de tarifas.
* `src/features/pricing/components/DiscountBadge.tsx`: Chip UI de Tailwind v4 que resalta el tipo de descuento aplicado.
* `src/features/pricing/components/PricingBreakdown.tsx`: Desglose monetario en pesos colombianos (COP).
* `src/app/api/pricing/calculate/route.ts`: Endpoint POST `/api/pricing/calculate` para cálculo dinámico de precios.
* `docs/swagger/hu22-discounts.swagger.json`: Especificación OpenAPI 3.0 / Swagger.
* `tests/unit/discounts.test.mjs`: Pruebas unitarias de las reglas RN-013, RN-014 y RN-015.

### Ejecución de Pruebas Unitarias
```bash
npm test
```

### Compilación y Validación de Tipos
```bash
npm run build
```

---

# 💳 FT-05 / HU23: Checkout con Tarjeta (Stripe Test)

Esta funcionalidad implementa la creación de Payment Intents y el checkout seguro con tarjeta de crédito o débito mediante Stripe en modo de prueba (RN-016).

### Ubicación del Código (Vertical Slice)
* `src/features/payments/services/stripe-payment.service.ts`: Motor de pago con Stripe, validación de retención de 10 min (HOLD), cobro de tarifas congeladas e idempotencia contra doble clic.
* `src/features/payments/schemas/create-payment-intent.schema.ts`: Esquema de validación Zod con `.strict()`.
* `src/features/payments/errors/payment.errors.ts`: Errores de dominio (`HoldExpiredPaymentError` 410, `BookingAlreadyPaidError` 409, `BookingNotFoundError` 404, `StripePaymentError` 502).
* `src/features/payments/types/payment.types.ts`: Tipos TypeScript para pagos y resultados de checkout.
* `src/features/payments/components/StripeCheckoutForm.tsx`: Formulario de pago con tarjeta con guía visual de Stripe Test en Tailwind v4.
* `src/features/payments/components/PaymentStatusAlert.tsx`: Alertas de estado de pago.
* `src/app/api/payments/create-intent/route.ts`: Endpoint POST `/api/payments/create-intent` para iniciar el checkout.
* `src/app/(public)/checkout/[bookingId]/page.tsx`: Integración del formulario de tarjeta con el temporizador de HOLD.
* `docs/swagger/hu23-stripe-checkout.swagger.json`: Especificación OpenAPI 3.0 / Swagger.
* `tests/unit/payments.stripe.test.mjs`: Pruebas unitarias de montos, HOLD vencido e idempotencia.

### Ejecución de Pruebas Unitarias
```bash
npm test
```

### Compilación y Validación de Tipos
```bash
npm run build
```

---

# 🎟️ FT-05 / HU24: Webhook de Stripe y Confirmación del Ticket

Esta funcionalidad implementa el webhook oficial de Stripe para confirmar reservas y generar tickets con código QR tras recibir pagos verificados (RN-016, RN-018 y RN-019).

### Ubicación del Código (Vertical Slice)
* `src/features/payments/services/stripe-webhook.service.ts`: Procesamiento de eventos `payment_intent.succeeded`, validación de firma criptográfica, confirmación atómica de reservas, generación de tickets y control de HOLDs desfasados.
* `src/features/payments/errors/webhook.errors.ts`: Errores de dominio (`InvalidWebhookSignatureError` 400, `WebhookBookingNotFoundError` 404, `WebhookProcessingError` 500).
* `src/features/payments/types/webhook.types.ts`: Tipos TypeScript para resultados de procesamiento de webhook.
* `src/features/tickets/components/TicketQRCodeCard.tsx`: Componente de visualización del ticket digital con código QR de acceso deportivo en Tailwind v4.
* `src/app/api/payments/webhook/route.ts`: Endpoint POST `/api/payments/webhook` para recepción segura de eventos de Stripe.
* `docs/swagger/hu24-stripe-webhook.swagger.json`: Especificación OpenAPI 3.0 / Swagger.
* `tests/unit/payments.webhook.test.mjs`: Pruebas unitarias de confirmación, validación de firma, idempotencia y rescate de HOLDs vencidos.

### Ejecución de Pruebas Unitarias
```bash
npm test
```

### Compilación y Validación de Tipos
```bash
npm run build
```

---

## ⚙️ Configuración de Stripe Test y Pruebas Locales de Webhook

Para operar el checkout y la recepción de webhooks en entorno de desarrollo local, configura en `.env.local`:

```env
# ==========================================
# STRIPE TEST CREDENTIALS (FT-05)
# ==========================================
STRIPE_SECRET_KEY="sk_test_your_mock_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_mock_webhook_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_mock_publishable_key"
```

> [!NOTE]
> En entorno de desarrollo o pruebas unitarias, el servicio utiliza mocks seguros desacoplados del SDK sin realizar llamadas HTTP externas a Stripe.

### Pruebas de Webhook en Desarrollo con Stripe CLI:
Para reenviar eventos reales desde el Dashboard de Stripe hacia tu entorno local:

```bash
# 1. Iniciar sesión en Stripe CLI:
stripe login

# 2. Reenviar eventos al endpoint local de Next.js:
stripe listen --forward-to localhost:3000/api/payments/webhook

# 3. Disparar un evento de prueba simulado:
stripe trigger payment_intent.succeeded
```
