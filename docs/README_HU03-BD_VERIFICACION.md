# HU03-BD — ORM Prisma: Verificación de Correo Electrónico

Este documento técnico detalla la implementación de la capa de acceso a datos para el proceso de verificación de correo electrónico (ORM con Prisma) en el proyecto **Vice City**, correspondiente a la historia **HU03-BD** (alineada con VCP-20 y HU01-BD).

---

## 📋 Resumen de la Historia de Usuario

* **Historia / Subtask:** HU03-BD — ORM Prisma: verificación de correo
* **Rama Git:** `feature/HU03-BD-ORM/prisma-verificacion/jose-gutierrez`
* **Objetivo:** Extender la capa de acceso a datos para dar soporte a la verificación de correo electrónico: agregar el campo de verificación en `users`, crear la tabla de tokens `verification_tokens` (almacenando el token en hash SHA-256, expiración y estado de uso), y proveer las funciones ORM para crear tokens, consultarlos, marcarlos como usados y marcar al usuario como verificado, garantizando manejo controlado de errores y seguridad ante concurrencia.
* **Dependencias:** VCP-20 (Base de datos Supabase) y HU01-BD (Capa ORM de usuarios).
* **Decisión Técnica:** Prisma Client como ORM con migración SQL en Supabase y transacciones atómicas para prevenir condiciones de carrera.

---

## 🎯 Criterios de Aceptación Verificados

| Criterio de Aceptación | Estado | Detalle de la Solución |
|---|---|---|
| **El modelo y la migración se ejecutan sin errores en Supabase** | **CUMPLIDO** | Se aplicó la migración SQL agregando `email_verified`, `email_verified_at` en `users` y la tabla `verification_tokens` con índice único en `token_hash`. Se sincronizó con `prisma db pull` y `prisma generate`. |
| **Crear, consultar y marcar como usado un token funciona** | **CUMPLIDO** | Implementadas funciones en `verification.repository.ts` probadas contra Supabase. |
| **Caso de error:** un token inexistente devuelve un resultado vacío controlado | **CUMPLIDO** | `getVerificationToken` retorna `null` y `confirmEmailWithToken` retorna `{ success: false, reason: "NOT_FOUND" }` sin lanzar excepciones no controladas. |
| **Caso límite:** dos confirmaciones simultáneas con el mismo token, solo una se acepta | **CUMPLIDO** | Mediante actualización atómica condicional (`updateMany` con `where: { token_hash, used: false }`) en transacción Prisma, exactamente 1 petición tiene éxito y la segunda es rechazada con `ALREADY_USED`. |

---

## 🏛️ Arquitectura y Archivos Implementados

Siguiendo la arquitectura modular del proyecto (`src/features/users/`):

```text
vice-city/
├── prisma/
│   └── schema.prisma                      # Modelos actualizados: users (email_verified) y verification_tokens
├── src/
│   └── features/
│       └── users/
│           ├── types.ts                   # Tipos de parámetros y resultados para tokens de verificación
│           ├── verification.repository.ts # Funciones de acceso a datos para tokens y verificación de correo
│           ├── user.repository.ts         # Repositorio de usuarios existente
│           └── index.ts                   # Exportación modular de todas las funciones y tipos
├── scripts/
│   ├── migrate-email-verification.mjs     # Script de migración SQL reproducible en Supabase
│   └── test-verification.mjs              # Suite de pruebas automatizadas contra Supabase
├── package.json                           # Comandos npm añadidos (db:migrate:verification, db:test:verification)
└── README_HU03-BD_VERIFICACION.md         # Esta documentación técnica
```

---

## 💾 Modelo de Base de Datos (Coordinación con VCP-20)

### 1. Campos añadidos a `public.users`:
```prisma
model users {
  // ... campos existentes ...
  email_verified      Boolean               @default(false)
  email_verified_at   DateTime?             @db.Timestamptz(6)
  verification_tokens verification_tokens[]
}
```

### 2. Nueva tabla `public.verification_tokens`:
```prisma
model verification_tokens {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id    String    @db.Uuid
  token_hash String    @unique(map: "verification_tokens_token_hash_unique")
  expires_at DateTime  @db.Timestamptz(6)
  used       Boolean   @default(false)
  used_at    DateTime? @db.Timestamptz(6)
  created_at DateTime  @default(now()) @db.Timestamptz(6)
  updated_at DateTime  @default(now()) @db.Timestamptz(6)
  users      users     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([expires_at])
  @@index([token_hash])
  @@index([user_id])
}
```

---

## 🔧 Funciones de Acceso a Datos (`src/features/users/verification.repository.ts`)

### 1. `hashVerificationToken(token: string): string`
* Convierte el token plano recibido a un hash criptográfico **SHA-256** unidireccional.
* Siguiendo recomendaciones de OWASP, los tokens en texto plano **nunca** se almacenan en base de datos.

### 2. `createVerificationToken(params: CreateVerificationTokenParams)`
* Genera un token criptográficamente seguro de 256 bits (`crypto.randomBytes(32).toString('hex')`) si no se suministra uno.
* Almacena su hash SHA-256 con ventana de expiración (24 horas por defecto).
* Invalida de forma proactiva tokens previos no utilizados del mismo usuario.
* Retorna `{ tokenRecord, plainToken }` (el token plano se utiliza para enviar el correo).

### 3. `getVerificationToken(tokenOrHash: string)`
* Busca el token en base de datos aceptando el token plano o el hash.
* Retorna el registro con su usuario asociado o `null` de forma controlada si no existe.

### 4. `markTokenAsUsed(tokenOrHash: string): Promise<boolean>`
* Actualización condicional atómica: solo actualiza si `used == false`.
* Retorna `true` si se marcó, `false` si ya estaba consumido o no existe.

### 5. `markUserAsVerified(userId: string): Promise<boolean>`
* Actualiza al usuario en `users` marcando `email_verified: true` y `email_verified_at: new Date()`.

### 6. `confirmEmailWithToken(plainToken: string): Promise<ConfirmEmailResult>`
* Coordina la confirmación dentro de una transacción interactiva de Prisma (`prisma.$transaction`).
* **Protección ante Concurrencia:** Utiliza `updateMany` con condición `where: { token_hash, used: false, expires_at: { gt: now } }`.
* Si dos peticiones llegan al mismo milisegundo con el mismo token:
  - La primera obtiene `count: 1` y confirma al usuario.
  - La segunda obtiene `count: 0`, detecta que ya fue usado y retorna `{ success: false, reason: "ALREADY_USED" }` limpiamente.

---

## 🧪 Pruebas Automatizadas contra Supabase

Para ejecutar la verificación completa:

```bash
npm run db:test:verification
```

### Salida de las Pruebas:
```text
🧪 Iniciando pruebas de aceptación para HU03-BD (Verificación de Correo en Supabase)...

1️⃣  Verificando estructura y modelo en Supabase...
   ✅ Usuario de prueba creado: c5c61ea6-7b32-4139-b031-2930712d12bd
   Estado inicial de email_verified: false
   ✅ Criterio 1 APROBADO: Modelo y migración verificados en Supabase.

2️⃣  Verificando creación, consulta y marcado de token...
   ✅ Token creado con ID: 4d8c6dff-c1d0-4e83-8c0e-327efd8a677b
   Hash guardado en BD: a8f3cb754ae7688b...
   Token en texto plano: d286166e6606428d...
   ✅ Token consultado exitosamente asociado a usuario: test-hu03-1791390849326@vicecity.com
   ✅ Token marcado como usado atómicamente (protegido contra re-uso).
   ✅ Usuario marcado como verificado (fecha: 2026-10-07T16:34:11.937Z)
   ✅ Criterio 2 APROBADO: Crear, consultar y marcar como usado funciona.

3️⃣  Verificando caso de error con token inexistente...
   ✅ getVerificationToken retornó null controlado para token inexistente.
   ✅ confirmEmailWithToken retornó resultado controlado sin excepciones.
   ✅ Criterio 3 APROBADO: Manejo seguro y controlado de tokens inexistentes.

4️⃣  Verificando caso límite: dos confirmaciones simultáneas con el mismo token...
   Tokens listos. Lanzando 2 confirmaciones concurrentes al mismo milisegundo...
   Resultado Petición 1: { success: false, reason: 'ALREADY_USED' }
   Resultado Petición 2: { success: true, reason: 'SUCCESS', userId: '4b14c052-4a5d-4315-8e4a-f8b930e1698d' }
   ✅ Exactamente 1 petición fue aceptada y 1 fue rechazada por ALREADY_USED.
   ✅ Criterio 4 APROBADO: Protección contra race conditions verificada.

🧹 Limpieza de registros de prueba completada.

🎉 TODOS LOS CRITERIOS DE ACEPTACIÓN DE HU03-BD PASARON EXITOSAMENTE.
```

---

## 💻 Scripts Disponibles

```bash
# Ejecutar migración de verificación de correo en Supabase
npm run db:migrate:verification

# Ejecutar pruebas de aceptación de verificación de correo (HU03-BD)
npm run db:test:verification

# Ejecutar pruebas de login (HU02-BD)
npm run db:test:login

# Ejecutar pruebas de usuarios (HU01-BD)
npm run db:test:users

# Sembrar / verificar usuario administrador raíz
npm run db:seed:admin
```

