# 📄 Documentación de Pull Request: Autenticación y Sesiones JWT con NextAuth (HU02-B)

## 1. Información General
* **Historia de Usuario:** HU02-B - Lógica de Negocio: Autenticación y JWT
* **Módulo:** Backend / Seguridad y Sesiones (`src/lib/auth.ts`, `src/types/next-auth.d.ts`)
* **Rama:** `feature/HU02-B/autenticacion-jwt/daniela-zapata`
* **Desarrolladora:** Daniela Zapata

---

## 2. Objetivo de la Tarea
Implementar la estrategia de autenticación basada en sesiones y tokens JWT utilizando **NextAuth.js**, configurando el provider de credenciales (`CredentialsProvider`) para validar correo y contraseña contra la base de datos PostgreSQL en Supabase, comparando el hash encriptado con `bcryptjs`, y adjuntando obligatoriamente el identificador (`id`), correo (`email`) y rol (`role`) del usuario tanto al token JWT como al objeto de sesión, garantizando que el rol pertenezca estrictamente a uno de los cuatro roles definidos por el SRS.

---

## 3. Criterios de Aceptación Cumplidos

- [x] **Genera un token JWT válido al autenticar correctamente:**
  * Se implementó `CredentialsProvider` en `src/lib/auth.ts` con estrategia `session: { strategy: "jwt" }`.
  * La autenticación emite un token JWT que persiste la sesión del usuario por 8 horas.
- [x] **La sesión incluye `id`, `email` y `role` con uno de los cuatro roles del SRS:**
  * Se extendieron los tipos de TypeScript en `src/types/next-auth.d.ts`.
  * Los callbacks `jwt` y `session` inyectan de forma garantizada `token.id`, `token.role`, `session.user.id` y `session.user.role`.
  * Los roles soportados son estrictamente: `ADMIN`, `CLIENT`, `TICKET_SELLER` y `QR_VALIDATOR`.
- [x] **Rechaza credenciales incorrectas con error claro:**
  * Si la contraseña en texto plano no coincide con el hash encriptado de la base de datos (`comparePassword`), se rechaza con error claro: *"Credenciales incorrectas: correo o contraseña no válidos"*.
  * Si el usuario no existe en la base de datos, se rechaza con el mismo mensaje claro de seguridad.
- [x] **Caso de error - Usuario sin rol válido no puede iniciar sesión:**
  * Si el usuario tiene un rol desconocido, nulo o fuera del enum del SRS, el sistema bloquea el inicio de sesión con error explícito: *"El usuario no posee un rol válido del sistema para iniciar sesión"*.
- [x] **Caso límite - Correo o contraseña vacíos, o con espacios, se rechazan con mensaje claro:**
  * Se valida que tanto `email` como `password` contengan texto real con `.trim()`.
  * Correos o contraseñas vacíos o que solo contengan espacios arrojan mensajes claros: *"El correo electrónico es obligatorio y no puede estar vacío"* / *"La contraseña es obligatoria y no puede estar vacía"*.
  * Correos ingresados con espacios o mayúsculas se normalizan de forma segura (`email.trim().toLowerCase()`).
- [x] **Pruebas unitarias completas:**
  * Suite automatizada en `tests/unit/auth.jwt.test.mjs` con **6 pruebas pasando al 100%** cubriendo todos los casos de éxito, error y límites.
- [x] **Documentación actualizada:**
  * Sección 8 agregada a `README.md`.

---

## 4. Archivos Creados y Modificados

```text
vice-city/
├── src/
│   ├── lib/
│   │   ├── auth.ts                         # Configuración central de NextAuth, CredentialsProvider y callbacks
│   │   └── password.ts                     # Funciones de hash y comparación con bcryptjs
│   ├── types/
│   │   └── next-auth.d.ts                  # Declaraciones de tipos para extender Session y JWT con roles SRS
│   └── app/
│       └── api/
│           └── auth/
│               └── [...nextauth]/
│                   └── route.ts            # Route Handler de Next.js para endpoints de autenticación
├── tests/
│   └── unit/
│       └── auth.jwt.test.mjs               # Suite de 6 pruebas unitarias de autenticación y JWT
├── README.md                               # Documentación actualizada con la sección 8
└── package.json                            # Dependencias añadidas (next-auth, bcryptjs, tsx) y scripts de test
```

---

## 5. Guía de Ejecución y Pruebas (Paso a Paso)

Para auditar y validar esta entrega:

### A. Ejecutar Pruebas Unitarias de Autenticación
```bash
npm test
```

**Resultado obtenido:**
```text
▶ HU02-B: Lógica de Negocio - Autenticación y JWT (NextAuth)
  ✔ Criterio 1 y 2: Autenticación exitosa genera usuario y sesión con id, email y rol SRS válido (CLIENT)
  ✔ Criterio 2: Admite los cuatro roles permitidos por el SRS (ADMIN, CLIENT, TICKET_SELLER, QR_VALIDATOR)
  ✔ Criterio 3: Rechaza credenciales incorrectas con error claro (contraseña inválida)
  ✔ Criterio 3 (b): Rechaza con error claro cuando el usuario no existe
  ✔ Criterio 4: Caso de error - Un usuario sin rol válido del SRS no puede iniciar sesión
  ✔ Criterio 5: Caso límite - Correo o contraseña vacíos, o con solo espacios, se rechazan con mensaje claro
✔ HU02-B: Lógica de Negocio - Autenticación y JWT (NextAuth)
ℹ tests 6 | pass 6 | fail 0
```

### B. Validar Compilación General de la Aplicación
```bash
npm run build
```
Next.js y Turbopack compilan la ruta dinámica `/api/auth/[...nextauth]` con éxito total (`exit code 0`).
