# 📄 Documentación de Pull Request: Lógica de Negocio de Registro de Usuarios (HU-01)

## 1. Información General
* **Historia de Usuario:** HU-01 - Autenticación y Registro de Usuarios
* **Módulo:** Backend / Capa de Lógica de Negocio (`src/features/auth`)
* **Rama:** `fe-1b/HU-01/auth-business-daniella`
* **Desarrolladora:** Daniela Zapata

---

## 2. Objetivo de la Tarea
Implementar las reglas de negocio del registro de usuarios en la capa de servicio y dominio, garantizando la validación estricta de datos, encriptación segura de contraseñas, asignación de roles y detección de correos duplicados sin distinción de mayúsculas/minúsculas, usando exclusivamente el ORM (Prisma) y sin SQL directo.

---

## 3. Requerimientos y Criterios de Aceptación Cumplidos

- [x] **Creación de usuario con contraseña encriptada y rol CLIENT:**
  * Las contraseñas se encriptan con `bcryptjs` utilizando un factor de costo (*salt rounds*) de 10 antes de persistir en base de datos.
  * Se asigna automáticamente el `role_id` correspondiente al rol `CLIENT` consultado de la tabla `roles`.
  * La respuesta del servicio excluye el campo sensible `password_hash`.
- [x] **Caso de error - Correo ya registrado:**
  * Si el correo ya existe en la base de datos, el servicio lanza un error de dominio claro `UserAlreadyExistsError` con código `USER_ALREADY_EXISTS` y mensaje *"El correo electrónico ya se encuentra registrado"*.
- [x] **Caso límite - Detección insensible a mayúsculas/minúsculas:**
  * Los correos se normalizan a minúsculas (`email.trim().toLowerCase()`) mediante el esquema Zod y se consultan en el ORM con `mode: "insensitive"`.
  * Correos como `DANIELA@TEST.COM` y `daniela@test.com` son detectados inequívocamente como el mismo usuario.
- [x] **Validación de datos obligatorios:**
  * Implementado con **Zod v4** en `register.schema.ts` validando nombre completo (mínimo 2 caracteres), formato de email válido y contraseña segura (mínimo 8 caracteres).
- [x] **Pruebas unitarias sin depender de endpoints:**
  * Suite de pruebas unitarias automatizadas en `tests/unit/register.service.test.mjs` que valida el 100% de los criterios y casos borde de forma aislada.
- [x] **Uso estricto de la capa ORM:**
  * Se utiliza `PrismaClient` tipado (`db.users.create`, `db.users.findFirst`, `db.roles.findFirst`) sin consultas SQL crudas.

---

## 4. Estructura de Archivos Implementados

```text
vice-city/
├── src/
│   ├── features/
│   │   └── auth/
│   │       ├── errors/
│   │       │   └── auth.errors.ts           # Clases de error de negocio (UserAlreadyExistsError, RoleNotFoundError, AuthValidationError)
│   │       ├── schemas/
│   │       │   └── register.schema.ts       # Esquema de validación Zod con normalización de email
│   │       ├── services/
│   │       │   └── register.service.ts      # Servicio de registro con reglas de negocio y ORM
│   │       ├── types/
│   │       │   └── index.ts                 # Interfaces TypeScript (RegisterInput, RegisteredUser)
│   │       └── index.ts                     # Exportación pública del módulo
│   └── lib/
│       └── password.ts                      # Funciones de hash y comparación con bcryptjs
└── tests/
    └── unit/
        └── register.service.test.mjs        # Suite de pruebas unitarias automatizadas
```

---

## 5. Guía de Ejecución y Pruebas (Paso a Paso)

Para que el equipo o los revisores puedan auditar y ejecutar la funcionalidad:

### A. Ejecutar Pruebas Unitarias
```bash
npm test
```
*(O alternativamente: `npm run test:unit`)*

**Salida esperada en consola:**
```text
▶ HU-01: Lógica de Negocio - Registro de Usuarios
  ✔ Criterio 1: Debe registrar un usuario exitosamente con contraseña encriptada y rol CLIENT (489ms)
  ✔ Criterio 2: Caso de error - Correo ya registrado devuelve un error de negocio claro (2ms)
  ✔ Criterio 3: Caso límite - Correos que solo cambian en mayúsculas/minúsculas se detectan como duplicados (1ms)
  ✔ Criterio 4: Valida datos obligatorios faltantes o inválidos con AuthValidationError (2ms)
  ✔ Criterio 5: Caso de error cuando el rol CLIENT no se encuentra en el sistema (1ms)
✔ HU-01: Lógica de Negocio - Registro de Usuarios (499ms)
ℹ tests 5 | pass 5 | fail 0
```

### B. Validar Compilación y Tipos de TypeScript
```bash
npm run build
```
Verifica que Next.js compile en modo producción sin ninguna advertencia ni error de tipos en la aplicación.

---

## 6. Checklist de Entrega
- [x] Reglas de negocio implementadas en la capa de servicios.
- [x] Esquemas de validación Zod tipados.
- [x] Encriptación de contraseñas con bcryptjs.
- [x] Conflicto de middleware resuelto limpiamente.
- [x] Pruebas unitarias 100% pasando (5/5).
- [x] Compilación de Next.js (`npm run build`) exitosa.

