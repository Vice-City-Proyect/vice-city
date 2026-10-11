# HU02-BD — ORM Prisma: Consulta de Usuarios para Login

Este documento técnico detalla la implementación de la función de acceso a datos requerida por el flujo de autenticación y login (ORM con Prisma) en el proyecto **Vice City**, correspondiente a la historia **HU02-BD** (alineada con VCP-20 y HU01-BD).

---

## 📋 Resumen de la Historia de Usuario

* **Historia / Subtask:** HU02-BD — ORM Prisma: consulta de usuarios para login
* **Rama Git:** `feature/HU02-BD-ORM/prisma-login/jose-gutierrez`
* **Objetivo:** Proveer las funciones de acceso a datos necesarias para el login en la capa ORM, permitiendo obtener el usuario por correo electrónico con su contraseña encriptada y su rol normalizado, gestionando casos de error y casos límite sin arrojar excepciones no controladas.
* **Dependencias:** VCP-20 (Base de datos Supabase) y HU01-BD (Capa ORM de usuarios).
* **Decisión Técnica:** Prisma Client como ORM acordado con el equipo backend.

---

## 🎯 Criterios de Aceptación

| Criterio de Aceptación | Estado | Detalle de la Solución |
|---|---|---|
| **Devuelve el usuario con su rol** (`ADMIN`, `CLIENT`, `TICKET_SELLER` o `QR_VALIDATOR`) | **CUMPLIDO** | La consulta retorna `id`, `email`, `password_hash`, `full_name`, `is_active` y `role` normalizado según el enum `role_name_enum`. |
| **Caso de error:** correo inexistente devuelve resultado vacío controlado | **CUMPLIDO** | Si el usuario no existe, o si la entrada es nula, vacía o inválida, retorna `null` de forma controlada sin lanzar excepciones no capturadas. |
| **Caso límite:** búsqueda sin distinguir mayúsculas o con espacios | **CUMPLIDO** | Se aplica `trim()` para limpiar espacios en blanco al inicio/final y `mode: "insensitive"` de Prisma (`ILIKE` en PostgreSQL). |

---

## 🏛️ Arquitectura y Archivos Modificados / Creados

Siguiendo la arquitectura modular del proyecto (`src/features/users/`):

```text
vice-city/
├── src/
│   └── features/
│       └── users/
│           ├── types.ts              # Agregado tipo UserForLogin (id, email, password_hash, role, etc.)
│           ├── user.repository.ts    # Implementadas findUserForLogin, normalizeRoleName y findUserForAuth
│           └── index.ts              # Exportación pública del módulo de usuarios
├── scripts/
│   └── test-login-query.mjs          # Suite de pruebas automatizadas de aceptación contra Supabase
├── package.json                      # Añadido script npm 'db:test:login'
└── README_HU02-BD_LOGIN.md           # Esta documentación técnica
```

---

## 🔧 Detalle Técnico de la Implementación

### 1. Tipo `UserForLogin` (`src/features/users/types.ts`)
Diseñado para proyectar únicamente los campos requeridos en la verificación de credenciales de login y generación de sesión/JWT:

```typescript
export type UserForLogin = {
  id: string;                      // Identificador único (UUID)
  email: string;                   // Correo electrónico registrado
  password_hash: string | null;    // Contraseña encriptada (hash bcrypt)
  role: role_name_enum | string;   // Rol normalizado (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR)
  full_name: string;               // Nombre completo
  is_active: boolean;              // Estado de la cuenta
};
```

### 2. Normalización de Roles: `normalizeRoleName` (`src/features/users/user.repository.ts`)
Garantiza compatibilidad bidireccional entre los valores almacenados en la tabla `roles` (`admin`, `customer`, `staff`) y los nombres formales del enum `role_name_enum`:

* `'admin'` ➔ `ADMIN`
* `'customer'` / `'client'` ➔ `CLIENT`
* `'ticket_seller'` / `'vendedor'` ➔ `TICKET_SELLER`
* `'qr_validator'` / `'validador_qr'` ➔ `QR_VALIDATOR`

### 3. Función de Consulta: `findUserForLogin(email: string)`
* **Limpieza y Validación Defensiva:**
  Verifica si el valor de `email` es válido. Si es `""`, solo espacios o nulo, retorna `null` de forma inmediata y segura.
* **Consulta Optimizada (`select`):**
  Solo consulta las columnas necesarias de `users` y el nombre del rol asociado en `roles`, reduciendo sobrecarga de red y memoria.
* **Tolerancia a mayúsculas y espacios:**
  Aplica `.trim()` y `mode: "insensitive"`.
* **Manejo de Errores Controlado:**
  Envuelto en bloque `try / catch` para asegurar que cualquier anomalía de red o driver retorne `null` controlado en lugar de tumbar la aplicación o generar respuestas 500 no capturadas.

---

## 🧪 Pruebas y Verificación contra Supabase

Se implementó el script de verificación automatizado en [`scripts/test-login-query.mjs`](file:///c:/Users/joseg/OneDrive/vice_cyty_back/vice-city/scripts/test-login-query.mjs).

Para ejecutar las pruebas:
```bash
npm run db:test:login
```

### Resultados de la Ejecución:
```text
🧪 Iniciando pruebas de aceptación para HU02-BD (Consulta de usuarios para login)...

1️⃣  Verificando consulta de usuario con rol...
   ✅ Usuario recuperado exitosamente de Supabase:
      ID: <id del usuario>
      Email: <correo de prueba>
      Password Hash (encriptada): <omitida>
      Rol normalizado: ADMIN
   ✅ Criterio 1 APROBADO: Retorna id, email, password_hash y rol (ADMIN).

2️⃣  Verificando caso de error con correo inexistente o entrada inválida...
   ✅ Correo inexistente retornó null controlado (sin lanzar excepciones).
   ✅ Entradas vacías/espacios retornaron null de forma defensiva.
   ✅ Criterio 2 APROBADO: Manejo controlado de usuarios inexistentes.

3️⃣  Verificando casos límite (mayúsculas y espacios)...
   ✅ Búsqueda con correo en mayúsculas y espacios encontró el usuario correctamente.
   ✅ Búsqueda con mayúsculas/minúsculas alternadas encontró el usuario correctamente.
   ✅ Criterio 3 APROBADO: Case-insensitive y trimming funcionan a la perfección.

4️⃣  Verificando normalización de roles del sistema...
   ✅ Roles normalizados correctamente según el enum del sistema.

🎉 TODOS LOS CRITERIOS DE ACEPTACIÓN DE HU02-BD PASARON EXITOSAMENTE.
```

---

## 💻 Scripts Relacionados

```bash
# Probar la consulta de login implementada en HU02-BD
npm run db:test:login

# Probar la creación y validación de usuarios de HU01-BD
npm run db:test:users

# Sembrar / verificar el usuario administrador raíz
npm run db:seed:admin
```
