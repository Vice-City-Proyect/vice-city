# 📄 Documentación de Pull Request: Configuración de Base de Datos y Prisma ORM

## 1. Descripción del cambio realizado
Se configuró la integración con la base de datos PostgreSQL alojada en **Supabase** y el ORM **Prisma** (v6 estable) para la rama `backend`.

### Cambios principales:
* **Prisma ORM v6:** Instalación de `prisma` y `@prisma/client` en su versión 6 estable, previniendo errores de compatibilidad con versiones preliminares (Prisma 8 RC).
* **Introspección de Modelos (`prisma/schema.prisma`):** Sincronización y mapeo de las 9 tablas existentes en Supabase (`roles`, `users`, `categories`, `services`, `service_schedules`, `bookings`, `payments`, `tickets`, `access_logs`) junto con sus relaciones y tipos enum.
* **Singleton de Prisma (`src/lib/prisma.ts`):** Creación de la instancia global de `PrismaClient` optimizada para el entorno serverless y hot-reloading de Next.js, evitando agotamiento de conexiones.
* **Scripts de Base de Datos (`package.json`):**
  * `npm run db:pull`: Sincroniza esquemas desde Supabase.
  * `npm run db:generate`: Genera tipos de TypeScript de Prisma.
  * `npm run db:studio`: Abre el explorador visual de base de datos.
  * `npm run db:test`: Ejecuta pruebas automáticas de consulta y conectividad.
* **Middleware Base (`src/middleware.ts`):** Exportación de middleware válido que resuelve el fallo de compilación en `next build`.
* **Guía en README:** Documentación paso a paso de setup local y resolución de problemas para todo el equipo.

---

## 2. Configuraciones necesarias

Cada desarrollador debe asegurarse de contar con su archivo `.env.local` (o `.env`) en la raíz del proyecto con las siguientes variables:

```env
# 1. Transaction Pooler (puerto 6543) - Para consultas y runtime de Next.js
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# 2. Session Pooler (puerto 5432) - Para introspección y migraciones de Prisma
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Credenciales públicas de Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

> **Nota:** Solicitar las credenciales reales del complejo deportivo a través del canal privado del equipo.

---

## 3. Uso o funcionamiento de la funcionalidad

### A. Ejecutar prueba rápida de conexión:
```bash
npm run db:test
```
Verifica la conexión a PostgreSQL y realiza una consulta a la tabla `roles` mostrando el resultado tabular.

### B. Usar el cliente en cualquier servicio o endpoint:
```typescript
import { prisma } from "@/lib/prisma";

// Ejemplo de consulta:
const services = await prisma.services.findMany({
  where: { is_active: true },
  include: { categories: true },
});
```

### C. Explorar datos visualmente:
```bash
npm run db:studio
```

---

## 4. Criterios de Aceptación y Checklist para Code Review (Sección 5.2)

- [x] **Correcto funcionamiento del código:** `npm run db:test` y `npm run build` pasan sin errores.
- [x] **Legibilidad y estándares:** Código tipado con TypeScript, singleton limpio y documentado.
- [x] **Seguridad:** Archivos `.env*` protegidos en `.gitignore` para no exponer credenciales sensibles.
- [x] **Manejo de casos inesperados:** Configuración de poolers diferenciados (puerto 6543 para serverless y 5432 para migraciones/DDL).
- [x] **Documentación completa:** Actualización en `README.md` y guía de pruebas para los desarrolladores.
