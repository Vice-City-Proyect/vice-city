# Vice City — Backend & API Platform

![Next.js](https://img.shields.io/badge/Next.js-16.3.7%20App%20Router-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![Prisma](https://img.shields.io/badge/Prisma-6.19.3-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%20(Supabase)-336791?logo=postgresql)
![Supabase](https://img.shields.io/badge/Supabase-Database%20&%20Auth-3ECF8E?logo=supabase)
![Stripe](https://img.shields.io/badge/Stripe-Test%20Mode%2023.0.0-635BFF?logo=stripe)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0%20Swagger-85EA2D?logo=swagger)
![npm](https://img.shields.io/badge/npm-10+-CB3837?logo=npm)
![Build](https://img.shields.io/badge/Next.js%20Build-Passing-brightgreen)
![Tests](https://img.shields.io/badge/Tests-166%2F166%20Passing-brightgreen)
![Status](https://img.shields.io/badge/Branch-backend%20(Ready%20for%20develop)-orange)

---

## 📌 Tabla de Contenidos

* [🚀 Guía Rápida de Configuración Local para Desarrolladores](#-guía-rápida-de-configuración-local-para-desarrolladores)
1. [Descripción del Proyecto](#1-descripción-del-proyecto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Backend](#3-arquitectura-del-backend)
4. [Requisitos Previos](#4-requisitos-previos)
5. [Instalación Paso a Paso](#5-instalación-paso-a-paso)
6. [Variables de Entorno](#6-variables-de-entorno)
7. [Ejecución y Uso del Backend](#7-ejecución-y-uso-del-backend)
8. [Swagger / OpenAPI y Herramientas DX](#8-swagger--openapi-y-herramientas-dx)
9. [Catálogo de Endpoints REST](#9-catálogo-de-endpoints-rest)
10. [Módulos y Lógica de Negocio](#10-módulos-y-lógica-de-negocio)
11. [Base de Datos y Prisma ORM](#11-base-de-datos-y-prisma-orm)
12. [Pasarela de Pagos Stripe y Webhooks](#12-pasarela-de-pagos-stripe-y-webhooks)
13. [Pruebas Automatizadas y Calidad](#13-pruebas-automatizadas-y-calidad)
14. [Guía de Solución de Problemas (Troubleshooting)](#14-guía-de-solución-de-problemas-troubleshooting)
15. [Flujo de Trabajo y Contribución Git](#15-flujo-de-trabajo-y-contribución-git)

---

## 🚀 Guía Rápida de Configuración Local para Desarrolladores

Si te estás incorporando al equipo de desarrollo (frontend o backend) o necesitas levantar el backend desde cero en tu máquina local, sigue esta guía rápida paso a paso:

### Paso 1: Clonar el repositorio y cambiar a la rama `backend`
```bash
git clone https://github.com/Vice-City-Proyect/vice-city.git
cd vice-city
git checkout backend
```

### Paso 2: Crear los archivos de variables de entorno desde la plantilla
El proyecto utiliza tanto `.env.local` (consumido por Next.js en runtime) como `.env` (consumido por scripts de mantenimiento con `node --env-file=.env` y por Prisma CLI):
```bash
# En Windows PowerShell:
Copy-Item .env.example .env.local
Copy-Item .env.local .env

# En Linux / macOS / Bash:
cp .env.example .env.local && cp .env.local .env
```

### Paso 3: Configurar credenciales mínimas obligatorias en `.env.local` y `.env`
Edita `.env.local` y `.env` asignando los valores de tu entorno (ver detalle en la [sección de variables de entorno](#6-variables-de-entorno)):
1. **Base de Datos (Supabase + Prisma):**
   - `DATABASE_URL`: Conexión de Transaction Pooler (puerto `6543`, `pgbouncer=true`).
   - `DIRECT_URL`: Conexión directa Session Pooler (puerto `5432`) para Prisma CLI (`db pull`, migraciones).
2. **Cliente de Supabase:**
   - `NEXT_PUBLIC_SUPABASE_URL`: URL pública de tu instancia (`https://[PROJECT_REF].supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima pública sujeta a políticas RLS.
3. **Autenticación y Sesiones (NextAuth):**
   - `NEXTAUTH_SECRET`: Secreto criptográfico maestro para firmar JWT y cookies de sesión. Genera uno seguro con:
     ```bash
     openssl rand -base64 32
     ```
   - `NEXTAUTH_URL`: `http://localhost:3000` (URL canónica en local).
   - `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` (URL base para enlaces en emails).
4. **Pasarela de Pagos Stripe (Modo Test - FT-05):**
   - `STRIPE_SECRET_KEY`: `sk_test_...` (Stripe Dashboard > Developers > API keys).
   - `STRIPE_WEBHOOK_SECRET`: `whsec_...` (obtenido al ejecutar `stripe listen --forward-to localhost:3000/api/payments/webhook`).
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_test_...` (para Stripe Elements en el frontend).

### Paso 4: Instalar dependencias y generar el cliente de Prisma
```bash
npm install
npm run db:generate
```
*(Nota: `npm install` ejecuta automáticamente `prisma generate` como hook de `postinstall`).*

### Paso 5: Validar conexión y siembra inicial del administrador
```bash
# Probar la conectividad activa contra PostgreSQL en Supabase
npm run db:test

# Crear el superadministrador inicial (requiere ADMIN_SEED_PASSWORD en tu .env, mín. 12 caracteres)
npm run db:seed:admin
```

### Paso 6: Iniciar el servidor de desarrollo
```bash
npm run dev
```
El servidor backend estará listo y escuchando en: **`http://localhost:3000`**

### Paso 7: Ejecutar la suite de pruebas automatizadas
```bash
npm test
```
Verifica que las 166 pruebas pasen satisfactoriamente (100% de suites verdes sin dependencias de red externas).

---

## 1. Descripción del Proyecto

**Vice City** es un sistema web integral diseñado para la gestión operativa, comercial y de acceso de un complejo deportivo recreativo.

El repositorio contiene tanto la capa de cliente como el núcleo del backend implementado con el paradigma **Next.js App Router (Full-Stack Monorepo)**.

### ¿Qué problema resuelve el Backend?
* **Gestión de Identidad y Seguridad:** Registro, login seguro con credenciales encriptadas (`bcrypt`), sesiones JWT desacopladas con NextAuth v4, recuperación de contraseñas de un solo uso, inicio de sesión federado con Google OAuth y control de acceso basado en roles (RBAC) con middleware perimetral.
* **Control de Capacidad y Horarios Deportivos:** Cálculo determinista de cupos y aforo disponible por franja horaria (08:00 a 17:00), con validación de mantenimiento programado (lunes no festivos o martes posfestivo según la Ley Emiliani de Colombia) y zona horaria `America/Bogota`.
* **Motor de Reservas con Retención Atómica (HOLD):** Bloqueo temporal garantizado de 10 minutos por cupo para evitar sobreventas concurrentes, liberación automática al vencer y fijación inmutable del precio pactado (RN-007).
* **Motor Tarifario y Promociones:** Aplicación de reglas de negocio para tarifas dinámicas, 20% de descuento automático los miércoles (RN-013) y 20% por reserva exclusiva de piscina (50 cupos, RN-014) con exclusión estricta de fines de semana y festivos.
* **Monetización con Stripe Test:** Integración de checkout con tarjeta de crédito/débito, control estricto de idempotencia ante doble clic y recepción de webhooks criptográficamente autenticados (`stripe-signature`) para emitir tickets digitales con códigos QR únicos.

---

## 2. Stack Tecnológico

| Tecnología | Versión | Responsabilidad en el Backend |
| :--- | :--- | :--- |
| **Next.js** | `16.3.7` | Framework web, App Router, Route Handlers (`src/app/api/`) y Middleware global de seguridad |
| **TypeScript** | `^5.0.0` | Tipado estático estricto en controladores, servicios, repositorios y modelos de dominio |
| **React / React DOM** | `19.2.8` | Renderizado SSR y componentes de interfaz pública y administrativa |
| **Prisma ORM** | `^6.19.3` | Acceso a datos, mapeo objeto-relacional, generación de tipos estáticos y transacciones interactivas |
| **PostgreSQL / Supabase** | `17.x` | Base de datos relacional alojada en Supabase (Transaction Pooler en puerto 6543 y Session Pooler en 5432) |
| **Zod** | `^4.6.5` | Validación exhaustiva y estricta (`.strict()`) de contratos de entrada en las peticiones HTTP |
| **NextAuth.js** | `^4.24.15` | Emisión, validación y persistencia de sesiones seguras mediante JSON Web Tokens (JWT) |
| **bcryptjs** | `^3.0.3` | Hashing unidireccional y verificación criptográfica de contraseñas con salting |
| **Stripe Node SDK** | `^23.0.0` | Creación de `PaymentIntents` e integración de webhooks con verificación HMAC SHA-256 |
| **Swagger / OpenAPI** | `3.0.0` | Especificaciones OpenAPI estáticas en `docs/swagger/` y explorador interactivo `api-tester/` |
| **Node Test Runner / TSX** | `Node 20+ / TSX 4.23` | Suite de pruebas unitarias y de integración rápida (`tsx --test`) sin dependencias de red externas |
| **Tailwind CSS** | `^4.0.0` | Estilos utilitarios para vistas públicas de catálogo, checkout y componentes de ticketing |

---

## 3. Arquitectura del Backend

El backend sigue los principios de **Clean Architecture** combinados con **Vertical Slices** organizados por módulos funcionales (`features`):

```text
vice-city/
├── api-tester/                 # Aplicativo frontend local con Swagger UI (DX Tooling)
├── docs/
│   ├── swagger/                # Contratos OpenAPI 3.0 estáticos en formato JSON
│   └── ...                     # Documentación de historias de usuario y PRs
├── prisma/
│   └── schema.prisma           # Esquema de base de datos relacional PostgreSQL
├── scripts/                    # Scripts Node.js para seeders, pruebas de DB y utilitarios
├── src/
│   ├── app/
│   │   ├── (auth)/             # Vistas públicas de login y registro
│   │   ├── (public)/           # Vistas de catálogo y checkout con temporizador
│   │   ├── admin/              # Vistas protegidas de administración
│   │   ├── api/                # CAPA API: Next.js Route Handlers (HTTP Controllers)
│   │   │   ├── admin/          # Endpoints administrativos de usuarios y roles
│   │   │   ├── auth/           # Endpoints de autenticación, sesión y Google OAuth
│   │   │   ├── availability/   # Motor de cálculo de cupos y horarios
│   │   │   ├── catalog/        # Catálogo unificado de servicios
│   │   │   ├── categories/     # CRUD de categorías deportivas
│   │   │   ├── employees/      # CRUD y auditoría de empleados
│   │   │   ├── payments/       # Checkout de Stripe y webhook receptor
│   │   │   ├── pricing/        # Motor de cotización y promociones
│   │   │   ├── reservations/   # Endpoints de retención temporal (HOLD)
│   │   │   └── services/       # CRUD de servicios deportivos
│   │   └── layout.tsx
│   ├── features/               # CAPA DE NEGOCIO (Vertical Slices)
│   │   ├── auth/               # Servicios de login, registro, tokens y NextAuth
│   │   ├── employees/          # Lógica de gestión de empleados y roles operativos
│   │   ├── payments/           # Servicios de cobro Stripe, idempotencia y webhooks
│   │   ├── pricing/            # Calculadora de descuentos oficiales (RN-013 a RN-015)
│   │   ├── reservations/       # Motor de retención atómica (HOLD 10 min)
│   │   ├── services/           # Disponibilidad horaria, aforo y feriados
│   │   └── users/              # Roles, auditoría y vinculación de cuentas
│   ├── lib/
│   │   ├── auth.ts             # Configuración de proveedores NextAuth y callbacks JWT
│   │   └── prisma.ts           # Cliente singleton de Prisma ORM
│   ├── middleware.ts           # Middleware perimetral RBAC (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR)
│   └── types/                  # Definiciones globales de TypeScript
└── tests/
    └── unit/                   # 20 suites de pruebas unitarias (153 tests passing)
```

### Flujo de Ejecución de una Solicitud
1. **Perímetro de Red (`src/middleware.ts`):** Valida la presencia de la cookie de sesión NextAuth, descifra el token JWT y evalúa la matriz RBAC para rutas protegidas antes de permitir el acceso.
2. **Capa API (`src/app/api/.../route.ts`):** Extrae parámetros de URL o el cuerpo JSON, valida la estructura usando esquemas Zod con validación estricta (`.strict()`) y retorna respuestas HTTP formateadas de manera estándar.
3. **Capa de Negocio (`src/features/*/services/`):** Aplica las reglas del dominio (límites de aforo, reglas de calendario festivo, vencimiento de 10 minutos, cálculo de promociones y firmas criptográficas).
4. **Capa de Persistencia (`src/lib/prisma.ts`):** Ejecuta consultas optimizadas o transacciones atómicas interactivas (`prisma.$transaction`) sobre PostgreSQL para garantizar consistencia.
5. **Respuesta Estándar:** Retorna respuestas consistentes con códigos HTTP semánticos (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `410 Gone`, `422 Unprocessable Entity`).

---

## 4. Requisitos Previos

Asegúrate de contar con las siguientes herramientas instaladas antes de ejecutar el proyecto:

* **Node.js:** Versión `20.x` o superior LTS (recomendado `v20.18.0` o superior).
* **npm:** Versión `10.x` o superior (incluido con Node.js).
* **PostgreSQL / Supabase:** Instancia activa de base de datos PostgreSQL 17 (local o en la nube mediante Supabase).
* **Prisma CLI:** Versión `6.x` (`^6.19.3` fijada en el proyecto).
* **Stripe CLI (Opcional):** Requerido únicamente para reenviar webhooks en vivo desde Stripe hacia `localhost:3000/api/payments/webhook`.

---

## 5. Instalación Paso a Paso

> [!TIP]
> Si deseas una referencia rápida y directa con las credenciales mínimas obligatorias y el comando de siembra inicial, consulta la [Guía Rápida de Configuración Local para Desarrolladores](#-guía-rápida-de-configuración-local-para-desarrolladores) al principio de este documento.

Sigue estos pasos para levantar el entorno de desarrollo desde un clon limpio:

### 1. Clonar el repositorio
```bash
git clone https://github.com/Vice-City-Proyect/vice-city.git
cd vice-city
```

### 2. Cambiar a la rama backend
```bash
git checkout backend
```

### 3. Instalar dependencias
```bash
npm install
```
*(El comando `npm install` ejecutará automáticamente `prisma generate` como hook `postinstall`).*

### 4. Configurar variables de entorno
Crea tu archivo local copiando la plantilla:
```bash
# En Windows PowerShell:
Copy-Item .env.example .env.local
Copy-Item .env.local .env

# En Linux / macOS / Bash:
cp .env.example .env.local
cp .env.local .env
```
Edita `.env.local` y `.env` con tus credenciales reales (ver sección siguiente).

### 5. Generar el cliente de Prisma
```bash
npm run db:generate
```

### 6. Probar la conexión a la base de datos
```bash
npm run db:test
```

### 7. Iniciar el servidor de desarrollo
```bash
npm run dev
```
El servidor backend estará listo y escuchando en: **`http://localhost:3000`**

---

## 6. Variables de Entorno

El proyecto requiere variables de entorno para operar. **NUNCA** subas credenciales reales o secretos al control de versiones Git.

Configura las siguientes variables en `.env.local` y `.env`:

| Variable | Requerida | Valor por Defecto / Placeholder | Propósito |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Sí** | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true` | Cadena de conexión para consultas en runtime (puerto 6543 con connection pooling). |
| `DIRECT_URL` | **Sí** | `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres` | Cadena directa para migraciones e introspección de Prisma CLI (puerto 5432). |
| `NEXT_PUBLIC_SUPABASE_URL` | **Sí** | `https://your-project-ref.supabase.co` | URL pública de la instancia de Supabase (sin barra final `/`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Sí** | `sb_publishable_anon_key_here` | Clave anónima pública de Supabase para clientes web. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | `eyJhbGciOi...` | Clave administrativa con bypass de RLS (solo para scripts o tareas cron). |
| `NEXTAUTH_SECRET` | **Sí** | `openssl rand -base64 32` | Secreto maestro para firmar y cifrar tokens JWT y cookies de sesión. |
| `JWT_SECRET` | No | `tu-clave-secreta-jwt-de-respaldo` | Alias secundario de respaldo para firma de tokens en el middleware. |
| `NEXTAUTH_URL` | **Sí** | `http://localhost:3000` | URL base canónica de la aplicación para callbacks de NextAuth. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | URL base para enlaces generados en correos de verificación o reset. |
| `GOOGLE_CLIENT_ID` | No* | `your-google-client-id.apps.googleusercontent.com` | ID de cliente OAuth 2.0 (*requerido para login con Google). |
| `GOOGLE_CLIENT_SECRET` | No* | `your-google-client-secret` | Secreto OAuth 2.0 (*requerido para login con Google). |
| `STRIPE_SECRET_KEY` | **Sí** | `sk_test_your_stripe_secret_key` | Clave secreta privada para inicializar el SDK de Stripe en el servidor. |
| `STRIPE_WEBHOOK_SECRET` | **Sí** | `whsec_your_stripe_webhook_secret` | Secreto para verificar la firma de la cabecera `stripe-signature`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | `pk_test_your_stripe_publishable_key` | Clave pública de Stripe para inicializar Stripe Elements en el frontend. |
| `ADMIN_SEED_EMAIL` | No | `admin@vicecity.com` | Correo del superadministrador para `npm run db:seed:admin`. |
| `ADMIN_SEED_NAME` | No | `Administrador Principal` | Nombre del superadministrador para `npm run db:seed:admin`. |
| `ADMIN_SEED_PASSWORD` | Sí (para el seed) | — (sin valor por defecto) | Contraseña del superadministrador, mínimo 12 caracteres. Solo en tu `.env` local. |

> [!WARNING]
> No dupliques el nombre de la variable en el valor (ej. `DATABASE_URL="DATABASE_URL=..."`). Asegúrate de que no haya espacios alrededor del signo igual `=`.

---

## 7. Ejecución y Uso del Backend

### Comandos de Ejecución

```bash
# Modo desarrollo con recarga rápida (Turbopack)
npm run dev

# Compilación para producción (TypeScript + Optimizaciones de rutas)
npm run build

# Iniciar el servidor compilado de producción
npm run start
```

### Formato de Respuestas de la API
Todas las respuestas de los Route Handlers siguen una estructura JSON consistente y estandarizada:

#### Respuesta Exitosa (`200 OK` / `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "message": "Operación completada exitosamente"
}
```

#### Respuesta de Error (`400 Bad Request` / `409 Conflict` / `422 Unprocessable`):
```json
{
  "success": false,
  "error": "SLOT_FULL_CONFLICT",
  "message": "No hay cupos disponibles para la franja horaria seleccionada",
  "details": []
}
```

### Ejemplos de Solicitudes HTTP (cURL)

#### 1. Consultar disponibilidad deportiva (HU20):
```bash
curl -X GET "http://localhost:3000/api/availability?serviceId=2888b9fa-1f64-4381-a003-e652df78cdd2&date=2026-10-15"
```

#### 2. Crear reserva con retención de 10 min (HOLD) (HU21):
```bash
curl -X POST "http://localhost:3000/api/reservations/hold" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "2888b9fa-1f64-4381-a003-e652df78cdd2",
    "date": "2026-10-15",
    "startTime": "10:00",
    "quantity": 2
  }'
```

#### 3. Calcular tarifas con descuentos automáticos (HU22):
```bash
curl -X POST "http://localhost:3000/api/pricing/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "2888b9fa-1f64-4381-a003-e652df78cdd2",
    "date": "2026-10-14",
    "quantity": 2
  }'
```

---

## 8. Swagger / OpenAPI y Herramientas DX

El proyecto proporciona **21 especificaciones OpenAPI 3.0 oficiales** organizadas en `docs/swagger/` y dos formas complementarias de visualizarlas y probarlas:

### 1. Vice-City API Tester (Recomendado para el equipo de Frontend)
El repositorio incluye una aplicación local interactiva basada en React + Vite que embebe **Swagger UI** oficial (`swagger-ui-dist`) y un constructor de solicitudes HTTP en vivo.

```bash
# 1. En una terminal, mantén el backend de Next.js corriendo:
npm run dev

# 2. En una segunda terminal, ingresa e inicia el API Tester:
cd api-tester
npm install
npm run dev
```

Abre en tu navegador: **`http://127.0.0.1:5173`**

#### Capacidades del API Tester:
* **Pestaña Swagger UI:** Permite inspeccionar esquemas interactivos, parámetros, códigos de estado y respuestas con la interfaz oficial de OpenAPI.
* **Presets Integrados:** Selector rápido para cambiar entre:
  * *Especificación Completa Unificada (Combined Vice City)*.
  * *FT-04: Motor de Reservas, Disponibilidad y HOLD*.
  * *FT-05: Checkout de Stripe y Webhooks*.
  * *Autenticación, Roles y Gestión de Empleados*.
* **Pestaña Endpoints:** Ejecutor de peticiones en vivo con simulación de roles (`ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`) para probar endpoints protegidos sin necesidad de crear sesiones complejas manualmente.

### 2. Archivos Estáticos de Swagger (`docs/swagger/`)
Para importar en herramientas como [editor.swagger.io](https://editor.swagger.io/), Postman o extensiones de VS Code:

| Archivo | Módulo Cubierto | Endpoints |
| :--- | :--- | :--- |
| [`docs/swagger/auth-register.swagger.json`](./docs/swagger/auth-register.swagger.json) | Registro de Usuarios | `POST /api/auth/register` |
| [`docs/swagger/auth-login.swagger.json`](./docs/swagger/auth-login.swagger.json) | Login y Sesión | `POST /api/auth/login`, `GET /api/auth/session` |
| [`docs/swagger/auth-password-reset.swagger.json`](./docs/swagger/auth-password-reset.swagger.json) | Recuperación de Contraseña | `POST /api/auth/forgot-password`, `GET/POST /api/auth/reset-password` |
| [`docs/swagger/auth-google.swagger.json`](./docs/swagger/auth-google.swagger.json) | Login Social con Google | `GET /api/auth/google`, `POST /api/auth/google` (retirado: 410 `ENDPOINT_RETIRED`) |
| [`docs/swagger/auth-logout.swagger.json`](./docs/swagger/auth-logout.swagger.json) | Cierre de Sesión | `POST /api/auth/logout` |
| [`docs/swagger/admin-roles.swagger.json`](./docs/swagger/admin-roles.swagger.json) | Gestión Administrativa de Roles | `GET /api/admin/users`, `PATCH /api/admin/users/{id}/role` |
| [`docs/swagger/employees.swagger.json`](./docs/swagger/employees.swagger.json) | Gestión de Empleados | `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/{id}` |
| [`docs/swagger/hu20-availability.swagger.json`](./docs/swagger/hu20-availability.swagger.json) | Catálogo y Disponibilidad | `GET /api/catalog`, `GET /api/availability` |
| [`docs/swagger/hu21-reservation-hold.swagger.json`](./docs/swagger/hu21-reservation-hold.swagger.json) | Reserva y Retención HOLD 10 min | `POST /api/reservations/hold`, `GET /api/reservations/{id}` |
| [`docs/swagger/hu22-discounts.swagger.json`](./docs/swagger/hu22-discounts.swagger.json) | Cálculo de Tarifas y Descuentos | `POST /api/pricing/calculate` |
| [`docs/swagger/hu23-stripe-checkout.swagger.json`](./docs/swagger/hu23-stripe-checkout.swagger.json) | Checkout con Stripe Test | `POST /api/payments/create-intent` |
| [`docs/swagger/hu24-stripe-webhook.swagger.json`](./docs/swagger/hu24-stripe-webhook.swagger.json) | Webhook y Emisión de Tickets | `POST /api/payments/webhook` |
| [`docs/swagger/hu25-pos-sale.swagger.json`](./docs/swagger/hu25-pos-sale.swagger.json) | Venta Presencial POS (HU25) | `POST /api/pos/sale` |
| [`docs/swagger/hu26-pos-preview-ticket.swagger.json`](./docs/swagger/hu26-pos-preview-ticket.swagger.json) | Previsualización y Emisión del Ticket POS (HU26) | `POST /api/pos/preview` |
| [`docs/swagger/qr-scanner.swagger.json`](./docs/swagger/qr-scanner.swagger.json) | Escáner QR y Control de Acceso (HU13) | `GET /api/qr/{code}`, `POST /api/qr/{code}/entry` |
| [`docs/swagger/reservations.swagger.json`](./docs/swagger/reservations.swagger.json) | Reservas Web: creación y listado del usuario (VCP-93) | `POST /api/reservations`, `GET /api/reservations` |
| [`docs/swagger/dashboard-summary.swagger.json`](./docs/swagger/dashboard-summary.swagger.json) | Resúmenes de dashboard para admin y empleados (VCP-93) | `GET /api/reports/dashboard-summary`, `GET /api/employee/summary` |

---

## 9. Catálogo de Endpoints REST

Tabla consolidada de las 27 rutas API implementadas en el backend:

| Método | Endpoint | Módulo / Historia | Autenticación / Rol | Estado |
| :---: | :--- | :--- | :---: | :---: |
| `POST` | `/api/auth/register` | Registro de usuarios (HU01) | Público | ✅ Implementado y Documentado |
| `POST` | `/api/auth/login` | Inicio de sesión con credenciales (HU02) | Público | ✅ Implementado y Documentado |
| `GET` | `/api/auth/session` | Consulta de sesión activa actual (HU02) | Sesión Opcional | ✅ Implementado y Documentado |
| `POST` | `/api/auth/forgot-password` | Solicitud de token de recuperación (HU04) | Público | ✅ Implementado y Documentado |
| `GET` | `/api/auth/reset-password` | Validación de token de reset (HU04) | Público | ✅ Implementado y Documentado |
| `POST` | `/api/auth/reset-password` | Restablecimiento de contraseña con token (HU04) | Público | ✅ Implementado y Documentado |
| `GET` | `/api/auth/google` | Inicio de flujo Google OAuth (HU05) | Público | ✅ Implementado y Documentado |
| `POST` | `/api/auth/google` | **Retirado (VCP-84):** responde `410 ENDPOINT_RETIRED`. El login con Google es solo por NextAuth (`/api/auth/signin/google`), que exige `email_verified === true` | Público | ⛔ Retirado |
| `POST` | `/api/auth/logout` | Cierre de sesión y revocación JWT (HU06) | Público / Sesión | ✅ Implementado y Documentado |
| `GET` | `/api/admin/users` | Listado general de usuarios (HU07) | `ADMIN` | ✅ Implementado y Documentado |
| `PATCH` | `/api/admin/users/[id]/role` | Actualización de rol con auditoría (HU07) | `ADMIN` | ✅ Implementado y Documentado |
| `GET` | `/api/employees` | Listado de empleados operativos (HU19) | `ADMIN` | ✅ Implementado y Documentado |
| `POST` | `/api/employees` | Creación de nuevo empleado (HU19) | `ADMIN` | ✅ Implementado y Documentado |
| `GET` | `/api/employees/[id]` | Consulta de empleado por ID (HU19) | `ADMIN` | ✅ Implementado y Documentado |
| `PATCH` | `/api/employees/[id]` | Modificación de empleado (HU19) | `ADMIN` | ✅ Implementado y Documentado |
| `DELETE` | `/api/employees/[id]` | Desactivación lógica de empleado (HU19) | `ADMIN` | ✅ Implementado y Documentado |
| `GET` | `/api/catalog` | Catálogo de servicios deportivos (HU20) | Público | ✅ Implementado y Documentado |
| `GET` | `/api/availability` | Consulta de aforo y cupos por fecha (HU20) | Público / POS | ✅ Implementado y Documentado |
| `POST` | `/api/reservations/hold` | Creación de reserva con HOLD 10 min (HU21) | Público / Cliente | ✅ Implementado y Documentado |
| `GET` | `/api/reservations/[id]` | Consulta de estado y tiempo de HOLD (HU21) | Público / Cliente | ✅ Implementado y Documentado |
| `GET` | `/api/reservations` | Listado de reservas del usuario con filtros, fechas y paginación; el CLIENT ve solo las suyas (VCP-93) | `CLIENT`, `ADMIN` | ✅ Implementado y Documentado |
| `GET` | `/api/reports/dashboard-summary` | Reservas pendientes, usuarios activos y próximas reservas del dashboard admin (VCP-93) | `ADMIN` | ✅ Implementado y Documentado |
| `GET` | `/api/employee/summary` | Resumen operativo del día y reservas de hoy para empleados, sin datos de contacto (VCP-93) | `TICKET_SELLER`, `QR_VALIDATOR`, `ADMIN` | ✅ Implementado y Documentado |
| `POST` | `/api/pricing/calculate` | Cálculo de tarifas con promociones (HU22) | Público | ✅ Implementado y Documentado |
| `POST` | `/api/payments/create-intent` | Creación de PaymentIntent en Stripe (HU23) | Público / Cliente | ✅ Implementado y Documentado |
| `POST` | `/api/payments/webhook` | Webhook de confirmación y tickets QR (HU24) | Firma Stripe | ✅ Implementado y Documentado |
| `POST` | `/api/pos/preview` | Previsualización del ticket antes de confirmar la venta (HU26) | `TICKET_SELLER` / `ADMIN` | ✅ Implementado y Documentado |
| `POST` | `/api/pos/sale` | Venta presencial en el POS y emisión de ticket (HU25) | `TICKET_SELLER` / `ADMIN` | ✅ Implementado y Documentado |
| `GET` | `/api/qr/[code]` | Consulta y validación de un ticket por QR (HU13) | `QR_VALIDATOR` | ✅ Implementado y Documentado |
| `POST` | `/api/qr/[code]/entry` | Permitir ingreso: marca el ticket `used` y audita (HU13) | `QR_VALIDATOR` | ✅ Implementado y Documentado |

---

## 10. Módulos y Lógica de Negocio

### 1. Autenticación y Autorización RBAC (`src/features/auth`, `src/middleware.ts`)
* **Sesiones JWT:** NextAuth v4 emite tokens JWT seguros que incluyen el rol del usuario (`ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`).
* **Protección Perimetral:** El middleware intercepta rutas `/admin/*`, `/cliente/*`, `/empleado/*` y deniega accesos no autorizados con redirección o respuestas `401`/`403`.
* **Sesión activa en `/login` y `/register` (VCP-104):** con un token real y un rol válido, el middleware redirige a la pantalla del rol (`DASHBOARD_BY_ROLE` en `src/features/auth/utils/role-home.ts`). Sin token, con token vencido o manipulado, o con un rol no válido, se permite ver el formulario. La cabecera `x-mock-role` no activa esta redirección.
* **Tokens de Un Solo Uso:** Los tokens de recuperación de contraseña expiran a los 60 minutos y se invalidan atómicamente si el usuario solicita un nuevo token.

### 2. Catálogo y Disponibilidad Deportiva (`src/features/services`)
* **Horario Operativo:** 9 franjas horarias exactas de 60 minutos (08:00 a 17:00).
* **Mantenimiento Semanal:** Los lunes el complejo permanece cerrado por mantenimiento. Si el lunes es festivo oficial en Colombia (según el cálculo algorítmico de la Ley Emiliani en `colombian-holidays.util.ts`), el mantenimiento se traslada automáticamente al día martes (RN-003).
* **Cálculo de Aforo:** Resta reservas activas y HOLDs vigentes sobre la capacidad máxima del servicio.

### 3. Motor de Reservas y HOLD de 10 Minutos (`src/features/reservations`)
* **Retención Atómica:** Al solicitar una reserva, se crea un registro en estado `PENDING` con fecha de vencimiento fijada exactamente a 10 minutos desde su creación.
* **Liberación Automática:** Los HOLDs con más de 10 minutos sin confirmación de pago se consideran vencidos y sus cupos vuelven a estar disponibles inmediatamente para otros usuarios.
* **Congelación de Tarifa:** El valor total pactado en la reserva se almacena de forma inmutable (RN-007) para prevenir alteraciones ante cambios posteriores en el catálogo.

### 4. Tarifas Dinámicas y Descuentos (`src/features/pricing`)
* **Descuento Miércoles (RN-013):** 20% de descuento automático en cualquier servicio reservado para un día miércoles.
* **Descuento Reserva Exclusiva de Piscina (RN-014):** 20% de descuento al reservar la totalidad del aforo de la piscina (50 cupos) de lunes a jueves.
* **No Acumulación y Restricciones (RN-015):** Los descuentos no aplican en fines de semana (sábados y domingos) ni en días festivos oficiales de Colombia. No se pueden acumular promociones sobre la misma reserva.

### 5. Pagos con Stripe y Emisión de Tickets (`src/features/payments`, `src/features/tickets`)
* **Validación Previa:** Antes de llamar al SDK de Stripe, se verifica que la reserva exista, esté en estado `PENDING` y que su ventana de 10 minutos no haya expirado.
* **Idempotencia:** Se previene cobro doble si el usuario hace clic repetido mediante el registro del identificador de intento de pago.
* **Confirmación Atómica:** Al recibir el webhook `payment_intent.succeeded` con firma criptográfica válida, se actualiza la reserva a `CONFIRMED`, el pago a `SUCCEEDED` y se genera un registro en la tabla `tickets` con código alfanumérico único para renderizar el código QR de ingreso.

### 6. Escáner QR y Control de Acceso (`src/features/qr`, `src/app/api/qr`) — HU13
* **Acceso exclusivo `QR_VALIDATOR`:** el validador se identifica por la **sesión JWT** de NextAuth (`features/qr/auth/qr-validator.guard.ts`). Sin sesión → `401`; cualquier otro rol, incluido `ADMIN` → `403`. No se aceptan cabeceras `x-user-role` / `x-user-id`. La ruta `/api/qr` está registrada en la matriz de `route-permissions.ts`.
* **Consulta (`GET /api/qr/{code}`):** devuelve cliente, fecha y hora, servicio y estado, y evalúa si el acceso procede ahora. El QR es al portador: se valida la reserva, no a quien lo presenta. Una decisión negativa (fuera de franja, ya usado) responde `200` con `accessValidation.canEnter = false` y su `reasonCode`.
* **Reglas de vigencia (RN-003, RN-021, RN-022):** fecha del ticket = hoy; franja con **inicio inclusivo y fin exclusivo**; ingreso tardío permitido mientras el cliente esté dentro de su franja (se marca `isLateEntry` pasados 5 minutos); bloqueo en mantenimiento semanal (lunes, o martes si el lunes es festivo).
* **Zona horaria:** todo se evalúa en `America/Bogota` (UTC-5) comparando instantes completos; los horarios se guardan en UTC en la base.
* **Confirmación (`POST /api/qr/{code}/entry`):** `UPDATE ... WHERE status = 'valid'` dentro de una transacción marca el ticket `used`, escribe `audit_logs` (`TICKET_ENTRY_CONFIRMED`) y `access_logs`. Si dos escaneos llegan a la vez solo uno gana; el otro recibe `409 ALREADY_USED`. Los intentos denegados también quedan en `access_logs`.
* **Estados en la base:** `tickets.status` ∈ `valid | used | cancelled | expired` y `access_logs.result` ∈ `granted | denied` (CHECK constraints de Supabase, **en minúscula**). La API los expone en mayúscula (`USED`).

---

## 11. Base de Datos y Prisma ORM

### Modelos de Datos en `prisma/schema.prisma`
* `users`: Cuentas de usuario con correo, nombre, hash bcrypt de contraseña y estado.
* `roles`: Roles del sistema (`ADMIN`, `CLIENT`, `TICKET_SELLER`, `QR_VALIDATOR`).
* `categories`: Categorías deportivas (Canchas Sintéticas, Piscinas, Polideportivos).
* `services`: Servicios deportivos con precio base en COP, duración y capacidad de aforo.
* `service_schedules`: Horarios semanales recurrentes por día de la semana.
* `bookings`: Reservas deportivas con estados (`PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`), timestamp de inicio/fin y `expires_at`.
* `payments`: Registros de transacciones monetarias (`STRIPE`, `CASH`, `CARD`) con moneda COP y referencias externas.
* `tickets`: Entradas digitales generadas con código único, estado `valid` y relación a la reserva.
* `access_logs`: Registro de validación de entradas por los empleados validadores en torniquetes.
* `verification_tokens`: Tokens hasheados con expiración para verificación de email y recuperación de credenciales.
* `linked_accounts`: Cuentas vinculadas de proveedores OAuth (Google).
* `audit_logs`: Auditoría transaccional con registro de cambios administrativos y de roles.

### Comandos de Utilidad para Base de Datos
```bash
# Introspeccionar tablas existentes de Supabase hacia schema.prisma
npm run db:pull

# Generar el cliente fuertemente tipado de Prisma
npm run db:generate

# Abrir el explorador visual web de Prisma Studio
npm run db:studio

# Ejecutar el script de prueba de conexión directa
npm run db:test
```

---

## 12. Pasarela de Pagos Stripe y Webhooks

### Flujo Operativo en Modo Prueba
1. El cliente inicia checkout en `/checkout/[bookingId]`.
2. El endpoint `/api/payments/create-intent` valida el HOLD de 10 minutos y retorna el `clientSecret`.
3. El frontend recolecta los datos de tarjeta mediante Stripe Elements.
4. Stripe procesa la transacción y notifica de forma asíncrona al endpoint `/api/payments/webhook`.
5. El webhook valida la cabecera `stripe-signature` usando `STRIPE_WEBHOOK_SECRET`.
6. Si la firma es válida, procesa el evento `payment_intent.succeeded`, confirma la reserva y emite el ticket digital con código QR.

### Pruebas Locales con Stripe CLI
Para recibir eventos reales en tu máquina de desarrollo:

```bash
# 1. Autenticar Stripe CLI
stripe login

# 2. Iniciar el reenvío de eventos hacia tu puerto local de Next.js
stripe listen --forward-to localhost:3000/api/payments/webhook

# 3. Copia el secreto mostrado (whsec_...) en tu .env.local como STRIPE_WEBHOOK_SECRET

# 4. En otra terminal, simula un pago exitoso
stripe trigger payment_intent.succeeded
```

---

## 13. Pruebas Automatizadas y Calidad

El proyecto utiliza **Node.js Test Runner nativo con TSX** para ejecutar pruebas de manera veloz, aislada y determinista.

### Comandos de Pruebas
```bash
# Ejecutar la suite completa de pruebas unitarias (24 suites, 184 tests)
npm test

# Ejecutar únicamente pruebas de disponibilidad y aforo (HU20)
npm run test:availability

# Ejecutar pruebas del motor de reservas y retención HOLD (HU21)
npm run test:hold

# Ejecutar pruebas de tarifas y descuentos dinámicos (HU22)
npm run test:discounts

# Ejecutar pruebas de pagos con Stripe (HU23)
npm run test:stripe

# Ejecutar pruebas de webhooks y confirmación de tickets (HU24)
npm run test:webhook

# Ejecutar ambas suites de pagos (Stripe + Webhooks)
npm run test:payments

# Ejecutar pruebas del escáner QR y su guard de acceso (HU13, 18 tests)
npm run test:qr

# Prueba de punta a punta del escáner QR contra el servidor y la base REALES (HU13).
# Requiere `npm run dev` corriendo en otra terminal. Crea sus propios datos de prueba
# (etiqueta TEST-HU13-E2E-xxxxxx), inicia sesión de verdad, imprime cada petición y
# respuesta, verifica lo escrito en la base y borra sus datos al terminar (--keep los conserva).
npm run test:qr:e2e
```

### Resultados de Calidad Verificados

```text
✔ tests 184
✔ suites 24
✔ pass 184
✔ fail 0
✔ cancelled 0
✔ skipped 0
✔ duration: ~9s
```

> Las pruebas unitarias del escáner QR usan una base simulada que **hace cumplir los CHECK constraints reales de Supabase** (p. ej. `tickets.status` en minúscula), de modo que un valor inválido falla en las pruebas igual que fallaría en la base real. La HU13 además se validó de punta a punta contra el servidor y la base reales con sesión de un usuario `QR_VALIDATOR` (`npm run test:qr:e2e`, 22 comprobaciones).

* **Next.js Production Build (`npm run build`):** ✅ Exitoso con código 0 (39 rutas compiladas y optimizadas en producción).
* **API Tester Vite Build (`npm --prefix api-tester run build`):** ✅ Exitoso con código 0.

---

## 14. Guía de Solución de Problemas (Troubleshooting)

| Síntoma / Error | Causa Raíz | Solución Verificada |
| :--- | :--- | :--- |
| `Environment variable not found: DIRECT_URL` | Prisma CLI busca un archivo `.env` en la raíz y solo existe `.env.local`. | Ejecuta `cp .env.local .env` (o `Copy-Item .env.local .env` en PowerShell). |
| `getaddrinfo ENOTFOUND base` | La variable `DATABASE_URL` contiene comillas dobles duplicadas o texto como `DATABASE_URL="DATABASE_URL=..."`. | Corrige `.env.local` asegurándote de que comience directamente con `DATABASE_URL="postgresql://..."`. |
| `P1001: Can't reach database server` | Host inaccesible o puerto incorrecto. | Usa el puerto `6543` (Transaction Pooler) para `DATABASE_URL` y el puerto `5432` (Session Pooler) para `DIRECT_URL`. |
| `Failed to parse syntax of config file at prisma.config.ts` | Conflicto con archivo residual de Prisma 8. | Elimina el archivo `prisma.config.ts` (el proyecto utiliza Prisma 6.x estable). |
| `stripe-signature header missing / Invalid signature` | El webhook no recibió la firma oficial o `STRIPE_WEBHOOK_SECRET` no coincide. | Verifica que Stripe CLI esté reenviando con el secreto activo configurado en `.env.local`. |
| `Port 3000 is already in use` | Otra instancia de Next.js u otro proceso está ocupando el puerto. | Detén el proceso anterior o inicia en otro puerto (`npm run dev -- -p 3001`). |
| `SLOT_FULL_CONFLICT (409)` | Se intenta reservar una franja horaria cuyos cupos ya fueron agotados o están en HOLD activo. | Selecciona otra franja horaria o espera 10 minutos a que expire el HOLD previo si no se pagó. |
| `HOLD_EXPIRED (410)` | El usuario intentó pagar una reserva cuyo tiempo límite de 10 minutos ya caducó. | El cliente debe iniciar un nuevo proceso de reserva desde el catálogo. |
| `/api/qr/...` responde `401` o `403` | El escáner QR exige una **sesión real** con rol `QR_VALIDATOR`; no acepta cabeceras `x-user-role`. `ADMIN` también recibe `403`. | Inicia sesión con un usuario de rol `qr_validator` (`POST /api/auth/callback/credentials`) y envía la cookie de sesión. |
| Una ruta nueva responde `403` a todos los roles | El middleware niega por defecto toda ruta que no esté en `route-permissions.ts` (ni pública ni con regla de rol). | Registra la ruta en `PUBLIC_ROUTE_PATTERNS` o en `ROUTE_PERMISSION_RULES` con sus roles. |
| Los formularios se envían como `GET /login?` y no hacen nada | Entrar al servidor de desarrollo por `127.0.0.1` bloquea la hidratación de React (Next.js lo trata como origen cruzado). | Abre la app con `http://localhost:3000`. |

---

## 15. Flujo de Trabajo y Contribución Git

El ciclo de desarrollo en Vice City sigue el flujo oficial de la organización:

```text
Jira Task  ──>  Feature Branch  ──>  Desarrollo  ──>  Pull Request  ──>  Code Review  ──>  develop  ──>  main
```

### Reglas para Colaborar:
1. **Nomenclatura de Ramas:**
   * Backend: `feature/<HU-ID>-B/<descripcion>/<responsable>`
   * Frontend: `feature/<HU-ID>-F/<descripcion>/<responsable>`
2. **Convención de Commits:** Utilizar formato convencional (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
3. **Verificación Previa a PR:**
   * Correr `npm test` y verificar que los tests pasen.
   * Correr `npm run build` y asegurar compilación limpia sin errores de TypeScript.
   * Documentar nuevos endpoints en `docs/swagger/` y actualizar el catálogo en este README.
4. **Integración:** Las ramas de features se integran hacia `backend`, y la rama consolidada `backend` se promueve periódicamente hacia `develop` mediante Pull Request con revisión técnica.

---

# 🎟️ FT-06 / HU25: Venta Presencial en el POS

Esta funcionalidad implementa el módulo de taquilla presencial en `/employee/pos` para que los empleados vendedores (`TICKET_SELLER` o `ADMIN`) registren ventas en efectivo o tarjeta y emitan tickets con código QR al instante (RN-001, RN-003, RN-004, RN-010, RN-012 y RN-017).

### Ubicación del Código (Vertical Slice)
* `src/features/pos/services/pos-sale.service.ts`: Motor de venta en taquilla, autorización de rol `TICKET_SELLER` (403), consulta de disponibilidad unificada, cálculo de precio para franjas iniciadas (RN-010), transacción atómica de reserva confirmada, pago y emisión de ticket.
* `src/features/pos/schemas/pos-sale.schema.ts`: Esquema de validación Zod con `.strict()`.
* `src/features/pos/errors/pos.errors.ts`: Errores de dominio (`ForbiddenPosAccessError` 403, `PosCapacityExceededError` 409, `PosMaintenanceDayError` 422, `PosOperatingHoursError` 400).
* `src/features/pos/types/pos.types.ts`: Tipos TypeScript para parámetros de venta en taquilla y comprobante.
* `src/features/pos/components/PosSaleForm.tsx`: Formulario de taquilla presencial con selector de servicios, franjas y métodos de pago (Efectivo / Tarjeta).
* `src/features/pos/components/PosReceiptCard.tsx`: Comprobante de venta y visualización del ticket QR generado para el cliente.
* `src/app/api/pos/sale/route.ts`: Endpoint POST `/api/pos/sale` para procesar ventas de taquilla.
* `src/app/employee/pos/page.tsx`: Vista web del POS en taquilla para empleados.
* `docs/swagger/hu25-pos-sale.swagger.json`: Especificación OpenAPI 3.0 / Swagger.
* `tests/unit/pos.sale.test.mjs`: Pruebas unitarias de venta completa, aforo, mantenimiento, roles (403) y franja iniciada.

### Ejecución de Pruebas Unitarias
```bash
npm test
```

### Compilación y Validación de Tipos
```bash
npm run build
```

---

# 🎟️ FT-06 / HU26: Previsualización y Emisión del Ticket Digital POS

Esta funcionalidad implementa la previsualización del ticket digital antes de confirmar la venta en el POS y su emisión con código QR único al portador verificado en base de datos al confirmar (RN-017, RN-019 y RN-020).

### Ubicación del Código (Vertical Slice)
* `src/features/pos/services/pos-sale.service.ts`: Cálculo previo de tarifas sin mutaciones (`previewSale`), validación de desfase de aforo concurrente (`PosAvailabilityChangedError`), idempotencia ante doble clic (`idempotencyKey`) y emisión de tickets con QR único al portador.
* `src/features/pos/schemas/pos-preview.schema.ts`: Esquema de validación Zod con `.strict()` para previsualización.
* `src/features/pos/errors/pos.errors.ts`: Error `PosAvailabilityChangedError` (409 Conflict).
* `src/features/pos/types/pos.types.ts`: Tipos `PosPreviewParams` y `PosPreviewResult`.
* `src/features/pos/components/PosTicketPreviewModal.tsx`: Modal de confirmación previa y visualización de borrador del ticket en Tailwind v4.
* `src/features/pos/components/PosSaleForm.tsx`: Flujo integrado de Previsualización -> Modal -> Emisión y Comprobante.
* `src/app/api/pos/preview/route.ts`: Endpoint POST `/api/pos/preview` para obtener previsualización de ventas en taquilla.
* `docs/swagger/hu26-pos-preview-ticket.swagger.json`: Especificación OpenAPI 3.0 / Swagger de la previsualización.
* `tests/unit/pos.preview.test.mjs`: Pruebas unitarias de previsualización 1:1, emisión de ticket con QR único, cambio de aforo (409) e idempotencia ante doble confirmación.

### Ejecución de Pruebas Unitarias
```bash
npm test
```

### Compilación y Validación de Tipos
```bash
npm run build
```

