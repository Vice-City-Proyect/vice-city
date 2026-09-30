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

Cada tarea debe tener su propia rama, revisar *metodo de trabajo* para crear tus ramas.



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
