# Vice City Sports Complex — Sistema de Gestión y Reservas

![Next.js](https://img.shields.io/badge/Next.js-16.3.7%20App%20Router-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-06B6D4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6.19.3-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%20(Supabase)-4169E1?logo=postgresql)
![Stripe](https://img.shields.io/badge/Stripe-Test%20Mode%2023.0.0-635BFF?logo=stripe)
![NextAuth](https://img.shields.io/badge/NextAuth.js-4.24.15-purple?logo=nextdotjs)
![Zod](https://img.shields.io/badge/Zod-4.6.5-3E67B1?logo=zod)
![jsQR](https://img.shields.io/badge/jsQR-1.4.0-E53E3E?logo=qr-code)
![Tests](https://img.shields.io/badge/Unit_Tests-686%2F686%20Passing-brightgreen?logo=node.js)
![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Private-red)

Sistema web integral para la administración, catálogo, reserva de escenarios deportivos, punto de venta (POS) y control de accesos por código QR del complejo deportivo **Vice City Sports Complex**.

El proyecto está construido como un monolito modular con **Next.js App Router**, unificando el frontend para clientes, empleados y administradores, junto con una capa de servicios de backend, APIs REST tipadas, PostgreSQL sobre Supabase y pasarela de pagos con Stripe.

---

## 📌 Tabla de Contenidos

1. [Objetivo y Problema que Resuelve](#1-objetivo-y-problema-que-resuelve)
2. [Funcionalidades Disponibles](#2-funcionalidades-disponibles)
3. [Estado Actual y Limitaciones Conocidas](#3-estado-actual-y-limitaciones-conocidas)
4. [Arquitectura y Estructura de Carpetas](#4-arquitectura-y-estructura-de-carpetas)
5. [Requisitos Previos](#5-requisitos-previos)
6. [Instalación desde Cero](#6-instalación-desde-cero)
7. [Variables de Entorno](#7-variables-de-entorno)
8. [Configuración de PostgreSQL y Supabase](#8-configuración-de-postgresql-y-supabase)
9. [Prisma Client y Migraciones](#9-prisma-client-y-migraciones)
10. [Ejecución en Desarrollo](#10-ejecución-en-desarrollo)
11. [Scripts Disponibles en `package.json`](#11-scripts-disponibles-en-packagejson)
12. [Pruebas Automatizadas, Linting y Build](#12-pruebas-automatizadas-linting-y-build)
13. [API REST y Swagger / OpenAPI](#13-api-rest-y-swagger--openapi)
14. [Autenticación, Confirmación de Correo y RBAC](#14-autenticación-confirmación-de-correo-y-rbac)
15. [Catálogo y Flujo de Reservas](#15-catálogo-y-flujo-de-reservas)
16. [Ciclo de Vida de Reservas y Mecanismo HOLD](#16-ciclo-de-vida-de-reservas-y-mecanismo-hold)
17. [Stripe Test Mode y Tarjetas de Prueba](#17-stripe-test-mode-y-tarjetas-de-prueba)
18. [Webhooks de Stripe y Reconciliación](#18-webhooks-de-stripe-y-reconciliación)
19. [Validación QR y Control de Cámara](#19-validación-qr-y-control-de-cámara)
20. [Solución de Problemas Frecuentes (Troubleshooting)](#20-solución-de-problemas-frecuentes-troubleshooting)
21. [Restricciones de Seguridad](#21-restricciones-de-seguridad)
22. [Despliegue y Configuración de Producción](#22-despliegue-y-configuración-de-producción)
23. [Flujo de Trabajo y Ramas Git](#23-flujo-de-trabajo-y-ramas-git)
24. [Licencia y Propiedad](#24-licencia-y-propiedad)

---

## 1. Objetivo y Problema que Resuelve

### El Problema
La gestión de complejos deportivos suele sufrir de:
* **Sobreventa y colisiones:** Dos usuarios o taquilleros reservan el mismo horario o cancha simultáneamente.
* **Bloqueos indefinidos:** Intentos de pago no completados dejan horarios ocupados de forma permanente, mermando las ventas.
* **Tiempos de espera y fraudes en acceso:** Boletos en papel falsificables o tiquetes reutilizados fuera de horario.
* **Falta de visibilidad de tarifas:** Inconsistencias al calcular descuentos automáticos por franjas valle o promociones.

### La Solución Vice City
Vice City implementa una arquitectura resiliente basada en:
* **Retención Temporal (HOLD) Atómica:** Reserva transaccional de 10 minutos (RN-011) en PostgreSQL con verificación estricta de cupos antes de enviar al usuario a la pasarela.
* **Conciliación Automatizada con Stripe Checkout:** El webhook verificado es la única fuente de verdad para emitir tickets digitales pagados en COP. Los pagos cancelados o expirados liberan el horario inmediatamente.
* **Acceso Digital por QR Blindado:** Generación de tiquetes con identificadores criptográficos únicos de 128 bits, validación en tiempo real por franja horaria (América/Bogotá), asignación de pulseras según zona y bloqueo de códigos reutilizados.
* **Operación Híbrida Web + POS:** Módulo de taquilla presencial para ventas en efectivo o datáfono físico y portal web para autogestión de clientes.

---

## 2. Funcionalidades Disponibles

### Módulo de Clientes (Portal Web)
* **Catálogo Responsive de Servicios:** Exploración de canchas sintéticas, piscinas olímpicas, saunas y gimnasio con visualización de disponibilidad horaria por fecha y tarjetas con imágenes optimizadas.
* **Cálculo Dinámico de Tarifas:** Aplicación automática de descuentos (RN-004) por horario o volumen.
* **Checkout en Línea con Stripe:** Formulario seguro con redirección a Stripe Checkout Session en pesos colombianos (COP).
* **Gestión de Reservas y Tiquetes:** Historial de reservas con estado en vivo y visualización de código QR escaneable para presentación física en portería.
* **Perfil de Usuario:** Actualización de datos personales y cambio seguro de contraseña (HU28).

### Módulo de Empleados
* **Punto de Venta Presencial (POS):** Venta directa en taquilla con selección rápida de servicio, cálculo de tarifas con descuentos, modalidades de pago (efectivo o tarjeta) y emisión inmediata de tiquete.
* **Validador de Tiquetes QR:**
  * Vista previa de cámara en tiempo real con recuadro guía.
  * **Motor Dual de Detección:** Aceleración por hardware con `BarcodeDetector` nativo y decodificación universal en canvas mediante `jsQR` (sin requerir flags de navegador en Chrome/Edge sobre Windows).
  * Validación contra reglas de negocio: franja horaria, tolerancia de ingreso tardío, regla de día de mantenimiento (lunes cerrado o martes si lunes es festivo).
  * Franqueo atómico y confirmación en torniquete con registro en `access_logs`.
  * Consulta manual alternativa insensible a mayúsculas/minúsculas.

### Módulo de Administración
* **Gestión Integral de Usuarios:** Listado paginado, búsqueda por nombre o correo, filtro por roles, asignación de rol del SRS y **botón directo para activar o desactivar usuarios**.
* **Gestión de Escenarios y Servicios:** CRUD de categorías, servicios, capacidad máxima por hora y precios base.
* **Auditoría de Reservas:** Monitoreo global de estados (`pending`, `confirmed`, `cancelled`, `expired`).
* **Métricas y Ganancias:** Dashboard con volumen de ventas, ingresos acumulados y distribución de ocupación.

---

## 3. Estado Actual y Limitaciones Conocidas

### Estado Actual
* **Core Funcional:** 100% operativo en entorno local y de desarrollo (`develop`).
* **Cobertura de Pruebas:** 686 pruebas unitarias e integración pasando con 0 errores (`npm test`).
* **Seguridad de Tipos:** Compilación limpia con TypeScript 5 (`npx tsc --noEmit`).

### Limitaciones Conocidas
1. **Stripe Test Mode:** La pasarela está configurada para operar en modo prueba. Para producción requiere llaves `pk_live_...` y `sk_live_...` provistas por la cuenta corporativa de Stripe.
2. **Contexto Seguro para Cámara Web:** La API `navigator.mediaDevices.getUserMedia` exige `localhost` o conexión segura `HTTPS` con certificado TLS válido. En redes locales vía IP plana (`http://192.168.x.x`), los navegadores restringen el uso de la cámara.
3. **Liberación Asíncrona de HOLDS:** Las reservas con HOLD vencido se liberan automáticamente mediante el webhook de expiración de Stripe o cuando un cron externo llama a `POST /api/reservations/expire-holds` con `Authorization: Bearer <CRON_SECRET>`.
4. **Modo Correo en Desarrollo:** Si no se definen variables de Resend o SMTP, el servicio utiliza `ConsoleEmailSender`, imprimiendo el enlace de confirmación y el token directamente en la consola del servidor.

---

## 4. Arquitectura y Estructura de Carpetas

El proyecto implementa una **Arquitectura por Funcionalidades (Feature-Sliced Modular Architecture)** dentro del framework Next.js:

```text
vice-city/
├── src/
│   ├── app/                               ← Next.js App Router (Páginas y API Routes)
│   │   ├── (public)/                      ← Catálogo público y checkout
│   │   ├── admin/                         ← Vistas del Administrador (usuarios, servicios, reportes)
│   │   ├── cliente/                       ← Vistas del Cliente (reservas, perfil)
│   │   ├── empleado/                      ← Vistas del Empleado (POS, lector QR)
│   │   ├── login/, register/, etc.        ← Vistas de autenticación
│   │   └── api/                           ← Controladores HTTP (Route Handlers)
│   │       ├── admin/                     ← APIs protegidas para administración
│   │       ├── auth/                      ← APIs de login, registro, confirmación, NextAuth
│   │       ├── availability/              ← Consulta reactiva de cupos
│   │       ├── catalog/, categories/      ← Catálogo y escenarios deportivos
│   │       ├── payments/                  ← Checkout Session, sync y Stripe Webhook
│   │       ├── pos/                       ← Previsualización y venta en taquilla
│   │       ├── qr/                        ← Validación y confirmación de ingreso QR
│   │       └── reservations/              ← Creación de HOLD y expiración por cron
│   │
│   ├── features/                          ← Módulos encapsulados de dominio
│   │   ├── auth/                          ← Lógica de sesiones, tokens, bcrypt, NextAuth
│   │   ├── catalog/                       ← Lógica del catálogo y disponibilidad
│   │   ├── employees/                     ← Lógica de gestión de empleados
│   │   ├── payments/                      ← SDK Stripe, webhook, plantillas de correo
│   │   ├── pos/                           ← Lógica de ventas en taquilla
│   │   ├── qr/                            ← Lógica de escaneo, reglas de acceso, pulseras
│   │   ├── reservations/                  ← Máquina de estados HOLD, transacciones
│   │   ├── tickets/                       ← Generación y componentes de tiquetes QR
│   │   └── users/                         ← Perfil, actualización y APIs de usuario
│   │
│   ├── components/                        ← Componentes UI reutilizables
│   │   ├── ui/                            ← Button, Card, Input, Modal, Badge, FormField
│   │   └── layout/                        ← Navbar, Sidebar, Footer
│   │
│   ├── lib/                               ← Infraestructura compartida (Prisma, Auth, Formatos)
│   ├── types/                             ← Tipos TypeScript globales
│   └── middleware.ts                      ← Control de acceso por roles (RBAC) y sesiones
│
├── prisma/
│   └── schema.prisma                      ← Esquema relacional de PostgreSQL para Prisma 6
│
├── scripts/                               ← Scripts de mantenimiento, seeds y diagnósticos
├── tests/                                 ← Pruebas unitarias e integración (686 tests)
├── docs/                                  ← Especificaciones OpenAPI/Swagger y guías de arquitectura
├── api-tester/                            ← Aplicación interactiva Swagger UI con Vite
├── package.json                           ← Dependencias exactas fijadas
└── .env.example                           ← Plantilla canónica de variables de entorno
```

---

## 5. Requisitos Previos

Para ejecutar Vice City en tu entorno local asegúrate de tener instalado:

* **Node.js:** Versión `20.x` o superior LTS (recomendado `20.18.0` o superior).
* **npm:** Versión `10.x` o superior (incluido con Node.js).
* **PostgreSQL / Supabase:** Instancia de PostgreSQL 17 (alojada en Supabase o local).
* **Git:** Para control de versiones.
* **Stripe CLI (Opcional):** Para interceptar y reenviar eventos de webhook en desarrollo.

> [!IMPORTANT]
> **Política de Dependencias Congeladas:**  
> Este proyecto tiene bloqueado `npm install` mediante un script de validación (`scripts/verify-npm-ci.mjs`). Debe utilizarse exclusivamente `npm ci`. Todas las dependencias en `package.json` están ancladas a versiones exactas.

---

## 6. Instalación desde Cero

Sigue este procedimiento para levantar la aplicación en una máquina limpia:

### 1. Clonar el repositorio
```bash
git clone https://github.com/Vice-City-Proyect/vice-city.git
cd vice-city
```

### 2. Cambiar a la rama de trabajo
```bash
git checkout fix/reservations-auth-qr-stripe-readme/jandy-pena
```

### 3. Instalar dependencias exactas (`npm ci`)
```bash
npm ci
```
*(El comando ejecutará automáticamente `prisma generate` como hook `postinstall`).*

### 4. Configurar variables de entorno
Copia la plantilla `.env.example` tanto para runtime de Next.js como para scripts de CLI:
```bash
# En Windows (PowerShell):
Copy-Item .env.example .env.local
Copy-Item .env.local .env

# En Linux / macOS / Bash:
cp .env.example .env.local && cp .env.local .env
```
Edita `.env.local` y `.env` con las credenciales de tu proyecto de Supabase y Stripe.

### 5. Generar cliente de Prisma
```bash
npm run db:generate
```

### 6. Verificar conexión a base de datos
```bash
npm run db:test
```
*Si la conexión es exitosa, la consola imprimirá la versión de PostgreSQL y la tabla de roles iniciales.*

### 7. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

---

## 7. Variables de Entorno

A continuación se detalla la matriz completa de variables configurables en `.env.local` y `.env`:

| Variable | Propósito | Requerida | Entorno | Dónde y Cómo Obtenerla |
| :--- | :--- | :---: | :---: | :--- |
| `DATABASE_URL` | Cadena de conexión PostgreSQL con Transaction Pooler (puerto `6543`) y `?pgbouncer=true`. | **Sí** | Servidor | Supabase Dashboard > Project Settings > Database > Connection String (Transaction Pooler). |
| `DIRECT_URL` | Cadena de conexión directa (Session Pooler, puerto `5432`) para introspección y migraciones. | **Sí** | Servidor / CLI | Supabase Dashboard > Project Settings > Database > Connection String (Session Pooler). |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública de la instancia de Supabase (sin barra diagonal final). | **Sí** | Cliente / Servidor | Supabase Dashboard > Project Settings > API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase protegida por Row Level Security (RLS). | **Sí** | Cliente / Servidor | Supabase Dashboard > Project Settings > API > Project API keys (`anon` / `public`). |
| `NEXTAUTH_SECRET` | Secreto maestro para firmar cookies de sesión y tokens JWT de NextAuth. | **Sí** | Servidor | Generar en terminal con: `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | URL canónica para redirecciones y callbacks de NextAuth. | **Sí** | Servidor | `http://localhost:3000` en desarrollo; dominio HTTPS en producción. |
| `NEXT_PUBLIC_APP_URL` | URL base utilizada para construir enlaces en correos y callbacks de Stripe. | **Sí** | Cliente / Servidor | `http://localhost:3000` en desarrollo; dominio HTTPS en producción. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe para inicializar el cliente en el navegador. | **Sí** (Pagos) | Cliente | Stripe Dashboard > Developers > API keys (`pk_test_...`). |
| `STRIPE_SECRET_KEY` | Clave privada de Stripe para crear Checkout Sessions y Payment Intents. | **Sí** (Pagos) | Servidor | Stripe Dashboard > Developers > API keys (`sk_test_...`). |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma para validar `stripe-signature` en el webhook. | **Sí** (Pagos) | Servidor | Obtenido de Stripe CLI (`whsec_...`) o del Dashboard en Webhooks. |
| `CRON_SECRET` | Token Bearer para autorizar la ejecución de `POST /api/reservations/expire-holds`. | Opcional | Servidor / Cron | Cadena aleatoria segura para proteger tareas programadas. |
| `GOOGLE_CLIENT_ID` | Client ID de Google Cloud Console para OAuth 2.0 federado. | Opcional | Servidor | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0. |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google Cloud Console para OAuth 2.0. | Opcional | Servidor | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0. |
| `RESEND_API_KEY` | Llave API de Resend para envío real de correos transaccionales. | Opcional | Servidor | [https://resend.com](https://resend.com) > API Keys. Si no se define, se usa la consola. |
| `EMAIL_FROM` | Dirección y remitente para correos salientes. | Opcional | Servidor | Ejemplo: `Vice City <onboarding@resend.dev>` o dominio verificado. |
| `ADMIN_SEED_PASSWORD` | Contraseña inicial requerida por el script de siembra del administrador. | Opcional (Seeds) | CLI Local | Contraseña segura definida por el desarrollador para `npm run db:seed:admin`. |

---

## 8. Configuración de PostgreSQL y Supabase

Vice City utiliza PostgreSQL 17 alojado en Supabase con soporte para Transaction Pooler y Session Pooler:

1. **Transaction Pooler (Puerto 6543):**
   * Configurado en `DATABASE_URL` con el parámetro `?pgbouncer=true`.
   * Maneja el pool de conexiones eficiente para peticiones concurrentes y funciones serverless de Next.js, evitando agotar las conexiones de PostgreSQL.
2. **Session Pooler (Puerto 5432):**
   * Configurado en `DIRECT_URL`.
   * Es mandatorio para comandos DDL, introspección (`prisma db pull`), Prisma Studio y migraciones.

> [!WARNING]
> En `.env.local` nunca dupliques el nombre de la variable (`DATABASE_URL="DATABASE_URL=..."`) y no agregues una barra diagonal al final de `NEXT_PUBLIC_SUPABASE_URL` para evitar rutas rotas como `//rest/v1/...`.

---

## 9. Prisma Client y Migraciones

### ¿Por qué Prisma 6.19.3 y no Prisma 8?
El proyecto utiliza **Prisma 6.19.3** fijada exactamente en `package.json`. Actualmente, `npx prisma` sin versión instala Prisma 8 Release Candidate, el cual introduce una CLI experimental que rompe la compatibilidad con `prisma db pull` y los archivos de configuración tradicionales.

### Comandos de Base de Datos
* **Generar cliente de Prisma:**
  ```bash
  npm run db:generate
  ```
* **Descargar esquema desde Supabase (Introspección):**
  ```bash
  npm run db:pull
  ```
* **Explorador visual (Prisma Studio):**
  ```bash
  npm run db:studio
  ```
  *Abre la interfaz visual en [http://localhost:5555](http://localhost:5555) para gestionar registros de `bookings`, `tickets`, `users`, `services` y `payments`.*

### Singleton de Prisma (`src/lib/prisma.ts`)
Para evitar múltiples instancias de `PrismaClient` durante recargas en caliente (*hot-reload*), el cliente se exporta como Singleton global:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 10. Ejecución en Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

### Rutas Principales de la Aplicación

| Módulo | Ruta URL | Descripción |
| :--- | :--- | :--- |
| **Público** | [`http://localhost:3000`](http://localhost:3000) | Landing page del complejo deportivo. |
| **Auth** | [`http://localhost:3000/login`](http://localhost:3000/login) | Inicio de sesión con credenciales o Google. |
| **Auth** | [`http://localhost:3000/register`](http://localhost:3000/register) | Registro de clientes con confirmación de correo. |
| **Cliente** | [`http://localhost:3000/cliente/reservar`](http://localhost:3000/cliente/reservar) | Catálogo de servicios y reserva de escenarios. |
| **Cliente** | [`http://localhost:3000/cliente/reservas`](http://localhost:3000/cliente/reservas) | Mis reservas y tiquetes con código QR. |
| **Cliente** | [`http://localhost:3000/cliente/perfil`](http://localhost:3000/cliente/perfil) | Datos personales y actualización de contraseña. |
| **Empleado** | [`http://localhost:3000/empleado/pos`](http://localhost:3000/empleado/pos) | Punto de venta en taquilla (efectivo/tarjeta). |
| **Empleado** | [`http://localhost:3000/empleado/qr`](http://localhost:3000/empleado/qr) | Validador de acceso con cámara QR y pulseras. |
| **Admin** | [`http://localhost:3000/admin/usuarios`](http://localhost:3000/admin/usuarios) | Gestión de usuarios, roles y activación/desactivación. |
| **Admin** | [`http://localhost:3000/admin/servicios`](http://localhost:3000/admin/servicios) | Mantenimiento de canchas, piscinas y tarifas. |
| **Admin** | [`http://localhost:3000/admin/ganancias`](http://localhost:3000/admin/ganancias) | Reportes financieros y volumen de ocupación. |

---

## 11. Scripts Disponibles en `package.json`

| Script | Comando | Descripción |
| :--- | :--- | :--- |
| `dev` | `next dev` | Inicia el servidor de desarrollo en `http://localhost:3000`. |
| `build` | `next build` | Compila la aplicación para producción verificando tipos y rutas. |
| `start` | `next start` | Inicia el servidor en modo producción compilado. |
| `lint` | `eslint` | Ejecuta el análisis estático de código con ESLint 9. |
| `db:generate` | `prisma generate` | Genera los tipos tipados del cliente `@prisma/client`. |
| `db:pull` | `prisma db pull` | Sincroniza el esquema local desde la base de datos de Supabase. |
| `db:studio` | `prisma studio` | Lanza Prisma Studio en `http://localhost:5555`. |
| `db:test` | `node --env-file=.env scripts/test-db.mjs` | Verifica conectividad a PostgreSQL y consulta la tabla de roles. |
| `db:seed:admin` | `node --env-file=.env scripts/seed-admin.mjs` | Siembra el usuario administrador inicial en la base de datos. |
| `test` | `tsx --test tests/unit/*.test.mjs` | Ejecuta la suite completa de 686 pruebas unitarias e integración. |
| `test:qr` | `tsx --test tests/unit/qr.scanner.test.mjs` | Ejecuta las pruebas del servicio de validación de tiquetes QR. |
| `test:payments` | `tsx --test tests/unit/payments.*.test.mjs` | Pruebas de integración de Stripe y webhooks. |
| `test:hold` | `tsx --test tests/unit/reservations.hold.test.mjs` | Pruebas del motor de reservas y expiración de HOLD. |
| `test:availability`| `tsx --test tests/unit/availability.test.mjs` | Pruebas de cálculo de disponibilidad y conflictos. |
| `preinstall` | `node scripts/verify-npm-ci.mjs` | Bloquea `npm install` garantizando el uso exclusivo de `npm ci`. |

---

## 12. Pruebas Automatizadas, Linting y Build

Vice City utiliza el ejecutor de pruebas nativo de Node.js asistido por `tsx` para una ejecución ultra veloz y sin dependencias pesadas:

### 1. Ejecutar toda la suite de pruebas (686 pruebas)
```bash
npm test
```
*Todas las pruebas deben finalizar con código de salida 0 y 0 fallos.*

### 2. Ejecutar suites por funcionalidad específica
```bash
# Pruebas del ciclo de vida de reservas y Stripe
npx tsx --test tests/unit/reservation-lifecycle-stripe.test.mjs

# Pruebas de cámara y escáner QR en frontend
npx tsx --test tests/unit/qr-camera-scanner.frontend.test.mjs

# Pruebas del backend de escáner QR y control de acceso
npm run test:qr

# Pruebas de recuperación de contraseña
npm run test:password-reset
```

### 3. Verificación de Tipos TypeScript
```bash
npx tsc --noEmit
```

### 4. Compilación de Producción
```bash
npm run build
```

---

## 13. API REST y Swagger / OpenAPI

### Contratos OpenAPI 3.0 Oficiales
El proyecto contiene **21 especificaciones OpenAPI 3.0** versionadas en formato JSON bajo el directorio [`docs/swagger/`](./docs/swagger/):
* `auth-register.swagger.json`
* `auth-login.swagger.json`
* `auth-confirm-email.swagger.json`
* `auth-password-reset.swagger.json`
* `auth-google.swagger.json`
* `hu20-availability.swagger.json`
* `hu21-reservation-hold.swagger.json`
* `hu22-discounts.swagger.json`
* `hu23-stripe-checkout.swagger.json`
* `hu24-stripe-webhook.swagger.json`
* `hu25-pos-sale.swagger.json`
* `hu26-pos-preview-ticket.swagger.json`
* `dashboard-summary.swagger.json`, etc.

### Visualizador Interactivo: Vice-City API Tester
Para interactuar con Swagger UI y probar peticiones en vivo:

```bash
# 1. En una terminal, mantén el backend corriendo:
npm run dev

# 2. En una segunda terminal, ingresa a la aplicación de pruebas:
cd api-tester
npm install
npm run dev
```
Abre en tu navegador: [http://localhost:5173](http://localhost:5173) para ver la interfaz interactiva oficial de **Swagger UI** conectada con los endpoints de Next.js.

---

## 14. Autenticación, Confirmación de Correo y RBAC

### Modelo de Sesión
* Implementado con **NextAuth.js v4** y estrategia de tokens **JWT**.
* El token almacena el `id`, `email`, `name` y el `role` canónico del SRS.

### Roles Soportados (SRS)
1. `ADMIN`: Control total del sistema, activación de usuarios, tarifas y reportes.
2. `CLIENT`: Cliente registrado con acceso a catálogo, reservas y perfil.
3. `TICKET_SELLER`: Taquillero con acceso al módulo de punto de venta (POS).
4. `QR_VALIDATOR`: Operador de control de acceso con permisos para validar y franquear tiquetes QR.

### Flujo de Verificación de Correo (HU03-B)
1. El usuario se registra en `/register` (`POST /api/auth/register`).
2. La cuenta se crea con `email_verified = false`.
3. Se genera un token criptográfico de 24 horas y se envía el enlace de confirmación.
4. Si el usuario intenta iniciar sesión sin verificar, el login es rechazado con código `403 EMAIL_NOT_VERIFIED` y la interfaz ofrece el botón para **reenviar el correo de confirmación**.
5. Al hacer clic en el enlace, `/verify-email` marca la cuenta como verificada y permite el inicio de sesión.

---

## 15. Catálogo y Flujo de Reservas

```text
[ Cliente en Catálogo ]
         │
         ▼
[ Selecciona Escenario y Horario ]
         │
         ▼
[ GET /api/availability ] ────────► Consulta cupos libres
         │
         ▼
[ POST /api/reservations/hold ] ──► Crea Reserva en 'pending' (HOLD de 10 min)
         │
         ▼
[ POST /api/payments/checkout ] ──► Crea Checkout Session en Stripe
         │
         ▼
[ Pasarela Stripe Checkout ] ─────► Tarjeta de crédito/débito
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
[ Pago Exitoso ]           [ Pago Cancelado / Fallido ]
    │                             │
    ▼                             ▼
[ Webhook checkout.session.completed ] [ Webhook checkout.session.expired ]
    │                             │
    ▼                             ▼
* Estado: 'confirmed'         * Estado: 'expired'
* Emite Ticket QR             * Libera Horario
* Correo con QR               * Retorna al Catálogo
```

---

## 16. Ciclo de Vida de Reservas y Mecanismo HOLD

### Reglas de Negocio del HOLD (RN-011)
* **Duración:** 10 minutos exactos desde la creación (`expires_at = now() + 10 min`).
* Durante este período, el cupo queda bloqueado atómicamente en PostgreSQL, impidiendo que otro usuario seleccione la misma cancha u horario.

### Transiciones Válidas de Estado
1. `pending`: Reserva temporal creada. Si se agotan los 10 minutos sin confirmación de pago, se considera vencida.
2. `confirmed`: Pago procesado y verificado. Se emite el ticket digital con código seguro.
3. `cancelled`: Cancelada administrativamente o por el usuario.
4. `expired`: No se completó el pago antes de `expires_at`. El horario se desbloquea inmediatamente para el catálogo.

### Expiración Programada
El endpoint protegido `POST /api/reservations/expire-holds` libera de forma atómica todas las reservas vencidas:
```bash
curl -X POST "http://localhost:3000/api/reservations/expire-holds" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

---

## 17. Stripe Test Mode y Tarjetas de Prueba

Stripe opera en modo prueba utilizando las claves `pk_test_...` y `sk_test_...`.

### Tarjetas Oficiales de Prueba para Validar Compras

Para completar la compra verificada en la pasarela de pagos de Stripe, utiliza los siguientes datos oficiales:

#### A. Tarjeta de Pago Exitoso (Aprobación Inmediata)
* **Número de Tarjeta:** `4242 4242 4242 4242`
* **Fecha de Expiración:** Cualquier fecha futura (ej. `12/28` o `06/29`)
* **CVC / CVV:** Cualquier número de 3 dígitos (ej. `123`)
* **Nombre del Titular:** Cualquier nombre (ej. `Juan Pérez`)
* **Código Postal:** Cualquier código postal válido (ej. `12345` o `080001`)
* **Resultado:** La reserva pasa a estado `confirmed`, se genera el tiquete digital de acceso y se despacha el correo de confirmación con el código QR.

#### B. Tarjetas de Prueba para Rechazos y Casos de Error
* **Fondos Insuficientes:** `4000 0000 0000 0002` (Simula error por saldo insuficiente).
* **Tarjeta Declinada (Rechazo Genérico):** `4000 0000 0000 0005` (Simula denegación bancaria).
* **Autenticación 3D Secure Requerida:** `4000 0000 0000 0302` (Abre el modal simulado de verificación SMS del banco emisor).

> [!NOTE]
> Documentación oficial de tarjetas de prueba: [Stripe Testing Documentation](https://stripe.com/docs/testing).

---

## 18. Webhooks de Stripe y Reconciliación

El webhook es la **fuente de verdad** para el cobro. No se confía exclusivamente en la redirección visual del navegador.

* **Endpoint:** `POST /api/payments/webhook`
* **Verificación de Firma:** Valida el encabezado `stripe-signature` mediante `stripe.webhooks.constructEvent` con `STRIPE_WEBHOOK_SECRET`.
* **Idempotencia:** Evita procesar eventos duplicados o desordenados verificando el estado actual de la reserva en base de datos.
* **Conversión de Moneda:** En pesos colombianos (COP), Stripe opera con factor 100 (`toStripeMinorUnits`). Una reserva de `$40.000 COP` se transmite a Stripe como `4000000` centavos.

### Configuración Local con Stripe CLI
Para reenviar los webhooks de Stripe directamente a tu máquina local:

```bash
# 1. Iniciar sesión en Stripe CLI:
stripe login

# 2. Reenviar eventos hacia el endpoint local de Vice City:
stripe listen --forward-to localhost:3000/api/payments/webhook
```
La terminal imprimirá un secreto como: `whsec_abcdef123456...`. Copia este valor en `STRIPE_WEBHOOK_SECRET` dentro de `.env.local`.

---

## 19. Validación QR y Control de Cámara

El módulo de control de acceso se encuentra en [`/empleado/qr`](http://localhost:3000/empleado/qr) (HU13):

### Motor Dual de Escaneo Automático
* **Nativo (`BarcodeDetector`):** Se activa en plataformas con soporte de hardware directo (Chrome en Android, Safari en macOS).
* **Universal (`jsQR` v1.4.0):** Decodifica por software los cuadros de video dibujados en un lienzo (*canvas* fuera de pantalla). **Permite escanear códigos QR en Chrome y Edge sobre Windows sin requerir flags experimentales.**

### Reglas de Negocio en la Validación
1. **Franja Horaria:** El cliente solo puede ingresar durante su horario reservado en hora colombiana (América/Bogotá).
2. **Ingreso Tardío:** Si el cliente llega tarde pero aún se encuentra dentro de su franja, se autoriza el ingreso informando que la hora de salida original se mantiene inalterada.
3. **Mantenimiento Semanal:** Los lunes el complejo permanece cerrado por mantenimiento. Si el lunes es festivo, el cierre se traslada al martes. En días de mantenimiento el ingreso es denegado (código 422).
4. **Código Único y Prevención de Reuso:** Una vez utilizado, el tiquete pasa a `status: used` en una transacción atómica, denegando lecturas posteriores.
5. **Código de Pulseras por Color:**
   * **Azul:** Piscinas y complejos acuáticos.
   * **Morado:** Zonas húmedas (Sauna y Turco).
   * **Rojo:** Gimnasio y musculación.
   * **Verde:** Canchas deportivas (fútbol, tenis, squash).

---

## 20. Solución de Problemas Frecuentes (Troubleshooting)

| Síntoma / Error | Causa Confirmada | Solución Reproducible |
| :--- | :--- | :--- |
| `npm error code EPERM` / `Blocked by verify-npm-ci` | Se intentó ejecutar `npm install` o `npm i`. | Utiliza obligatoriamente `npm ci` para respetar la política de dependencias congeladas. |
| `P1001: Can't reach database server` | Puerto o host incorrecto de Supabase, o red corporativa bloqueando el puerto. | Verifica que `DATABASE_URL` use el puerto `6543` (con `?pgbouncer=true`) y `DIRECT_URL` el puerto `5432`. |
| `Environment variable not found: DIRECT_URL` | Prisma CLI leyó `.env` y el archivo no existe o está incompleto. | Ejecuta `Copy-Item .env.local .env` en PowerShell o `cp .env.local .env` en Linux/macOS. |
| `getaddrinfo ENOTFOUND base` | Formato inválido en `.env.local` (ej. `DATABASE_URL="DATABASE_URL=..."`). | Corrige el archivo `.env.local` asegurándote de que no contenga comillas repetidas ni prefijos duplicados. |
| `403 EMAIL_NOT_VERIFIED` al iniciar sesión | La cuenta fue registrada pero el usuario no ha hecho clic en el enlace del correo. | Haz clic en "Reenviar correo de confirmación" en el formulario de login o consulta el enlace en la consola. |
| La cámara no se activa en `/empleado/qr` | Permiso denegado por el navegador o intento de acceso por HTTP en una IP remota. | Concede los permisos de cámara en el navegador y asegúrate de acceder por `http://localhost:3000` o `HTTPS`. |
| El QR no se ve en el correo (aparece texto alt) | Gmail/Outlook bloquean imágenes en formato Base64 Data URI. | El sistema genera el código como una URL pública HTTPS (`https://api.qrserver.com/...`), renderizable por cualquier cliente de correo. |
| `400 Bad Request` en el Webhook de Stripe | El secreto `STRIPE_WEBHOOK_SECRET` no coincide o la petición fue enviada sin firma. | Verifica el secreto provisto por `stripe listen` y asegúrate de usar Stripe CLI para pruebas locales. |

---

## 21. Restricciones de Seguridad

1. **Protección de Datos Sensibles:** Contraseñas cifradas con `bcryptjs` (salt rounds 10). Las claves secretas de Stripe y Supabase nunca se exponen al cliente.
2. **Tokens con Hash Criptográfico:** Los tokens de confirmación de correo y restablecimiento de contraseña se almacenan como hash SHA-256 (`token_hash`), evitando que una filtración de base de datos comprometa los tokens activos.
3. **Control de Acceso RBAC por Middleware:** [`src/middleware.ts`](file:///c:/Users/elkin/Downloads/vice-city/src/middleware.ts) intercepta peticiones a `/admin/*`, `/empleado/*` y `/cliente/*`, verificando la cookie JWT y bloqueando accesos no autorizados con código `403` o redirección a `/unauthorized`.
4. **Cabeceras Mock Desactivadas:** La variable `ENABLE_MOCK_AUTH_HEADERS` permanece deshabilitada por defecto y está terminantemente prohibida en entornos de producción.

---

## 22. Despliegue y Configuración de Producción

Para desplegar Vice City en plataformas en la nube (Vercel, AWS o Docker):

1. **Variables de Entorno:** Configura en el panel del proveedor todas las variables obligatorias de la sección 7. Asegúrate de configurar `NEXT_PUBLIC_APP_URL` y `NEXTAUTH_URL` con tu dominio canónico `https://vicecity.club`.
2. **Llaves de Stripe en Modo Live:** Sustituye `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_...`) y `STRIPE_SECRET_KEY` (`sk_live_...`), y registra el endpoint del webhook en el Dashboard de Stripe (`https://tu-dominio.com/api/payments/webhook`).
3. **Proveedor de Correo Real:** Configura `RESEND_API_KEY` con un dominio verificado o credenciales SMTP para garantizar la entrega de correos de confirmación y tiquetes.
4. **Expiración Automatizada de HOLDS:** Configura un servicio de cron (ej. Vercel Cron, GitHub Actions o AWS EventBridge) para llamar cada 5 minutos a `POST /api/reservations/expire-holds` con el encabezado `Authorization: Bearer <CRON_SECRET>`.

---

## 23. Flujo de Trabajo y Ramas Git

El desarrollo en Vice City sigue el flujo estricto del proyecto:

```text
Jira Task  ──►  Crear Rama  ──►  Desarrollo & Tests  ──►  Pull Request  ──►  Code Review  ──►  develop  ──►  main
```

### Convenciones de Ramas y Commits
* **Ramas:** `feat/nombre-tarea`, `fix/nombre-tarea`.
* **Commits Semánticos:**
  * `feat(modulo): descripcion de la nueva caracteristica`
  * `fix(modulo): correccion de error o comportamiento`
  * `test(modulo): adicion o modificacion de pruebas`
  * `docs(modulo): actualizacion de documentacion`
* **Prohibición de Push Directo:** Las ramas `develop` y `main` están protegidas; todos los cambios deben integrarse mediante Pull Requests revisados y aprobados.

---

## 24. Licencia y Propiedad

Este proyecto es software privado y propietario. Todos los derechos reservados a **Vice City Sports Complex**. Queda prohibida la reproducción, distribución o uso no autorizado del código fuente sin consentimiento previo.
