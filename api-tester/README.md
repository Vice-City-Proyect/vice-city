# 🚀 Vice-City API Tester — Aplicativo Local para Probar Endpoints

## 📋 1. Objetivo y Propósito

**Vice-City API Tester** es una aplicación web local diseñada para el equipo de **frontend** del proyecto **Vice City**. Su objetivo principal es actuar como puente entre el desarrollo del backend (Next.js App Router, Prisma ORM, PostgreSQL) y la integración de interfaces de usuario en el frontend, permitiendo:

1. **Explorar la documentación OpenAPI / Swagger** de todos los endpoints implementados en el backend.
2. **Construir peticiones HTTP personalizadas** con parámetros de ruta, parámetros de consulta (*query*), cabeceras (*headers*) y cuerpo (*body* JSON).
3. **Ejecutar peticiones reales** contra el backend local y visualizar el código de estado, tiempo de respuesta en milisegundos, tamaño y cuerpo formateado.
4. **Gestionar la autenticación** de forma flexible durante el desarrollo (Modo Público, Mock Roles `ADMIN`/`CLIENT`/`TICKET_SELLER`/`QR_VALIDATOR`, cookies NextAuth o tokens Bearer).
5. **Diagnosticar problemas de red y CORS** de manera transparente cuando el backend no esté iniciado o las políticas de origen no coincidan.

---

## 🔒 2. Restricción Estricta de Entorno

> [!IMPORTANT]
> **Esta aplicación debe ejecutarse ÚNICAMENTE en el entorno local del desarrollador.**
> No debe desplegarse en Vercel, Netlify ni ningún otro servidor público. Está configurada para escuchar estrictamente en la interfaz de loopback: `http://127.0.0.1:5173`.

---

## ⚙️ 3. Guía de Puesta en Marcha

Para probar la integración completa entre el frontend y el backend, se recomienda trabajar con dos terminales:

### Terminal 1 — Iniciar el Backend de Vice City (Next.js)
```bash
# En la raíz del repositorio vice-city:
npm run dev
# Servidor escuchando en: http://localhost:3000
```

### Terminal 2 — Iniciar el Vice-City API Tester
```bash
# Acceder a la carpeta del tester:
cd api-tester

# Instalar dependencias (solo la primera vez):
npm install

# Iniciar servidor de desarrollo Vite:
npm run dev
# Servidor escuchando en: http://127.0.0.1:5173
```

Abre tu navegador en `http://127.0.0.1:5173`.

---

## 🧭 4. Funcionalidades Principales

### 1. Panel de Inicio (Dashboard)
* Métricas clave de endpoints disponibles en el contrato activo.
* Acceso directo a presets temáticos del proyecto (Autenticación, Recuperación, Roles, Complejo Deportivo).
* Flujo de trabajo guiado para desarrolladores frontend.

### 2. Estudio de Endpoints (3 Paneles Integrados)
* **Panel Izquierdo (Explorador):** Lista de endpoints agrupados por categorías (*Tags*). Filtro por método HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) y buscador en tiempo real.
* **Panel Central (Constructor):**
  * Interpolación dinámica de variables de ruta (`{id}`, `{token}`).
  * Edición de parámetros de consulta (*Query params*).
  * Cabeceras de petición con selector de tipos comunes.
  * Editor de cuerpo JSON con botón de formateo / indentación y **generación inteligente de ejemplos** basada en el esquema OpenAPI.
  * Pestaña de documentación con esquemas y respuestas documentadas en el contrato.
* **Panel Derecho (Visor de Respuestas):**
  * Indicador de estado HTTP con código y color estándar (2xx verde, 4xx amarillo, 5xx rojo).
  * Cronómetro de latencia en milisegundos (`ms`) y peso de respuesta.
  * Formateador JSON con botón de copiado rápido al portapapeles.
  * Tabla de cabeceras de respuesta.
  * **Diagnóstico de Errores Reales:** banners diferenciados para *Backend Fuera de Línea (ECONNREFUSED)*, *Error de CORS* o *Timeout agotado*.

### 3. Explorador Swagger / OpenAPI Oficial Embebido
* Integración nativa de Swagger UI (`swagger-ui-dist`) sin dependencias externas en tiempo de ejecución.
* Selector de presets oficiales de Vice City.
* Carga de archivos `.json` / `.yaml` locales mediante *file picker*.
* Descarga de contratos remotos mediante URL (`http://localhost:3000/api/docs`).

### 4. Gestor de Autenticación y Sesiones
* **Público (Sin Auth):** Para validar respuestas 401/403 o consumir endpoints públicos como registro y login.
* **Mock Role (Dev):** Inyecta cabeceras de prueba (`x-mock-role: ADMIN | CLIENT | TICKET_SELLER | QR_VALIDATOR`) y `x-mock-user-id` para probar endpoints protegidos antes o después del middleware.
* **NextAuth Session Cookie:** Permite interactuar con sesiones NextAuth mediante cookies HTTP y `withCredentials: true`.
* **Bearer Token:** Inyecta cabecera estándar `Authorization: Bearer <token>`.
* **Cabeceras Personalizadas Globales:** Inyección persistente de cabeceras en todas las solicitudes salientes.

### 5. Historial de Peticiones y Replay
* Guarda automáticamente las últimas 50 peticiones ejecutadas.
* Filtro por método y búsqueda por ruta.
* Botón **"Cargar en Constructor"**: restaura parámetros, cabeceras y cuerpo original en el Request Builder con un solo clic.
* Almacenamiento seguro en `localStorage` (sin persistir credenciales sensibles en texto plano).

### 6. Configuración Flexible
* URL base configurable (por defecto: `http://localhost:3000`).
* Timeout ajustable (por defecto: `10000 ms`).
* Formateo automático de JSON activable/desactivable.

---

## 🏗️ 5. Arquitectura del Código

El proyecto está estructurado de manera modular y desacoplada del backend:

```
api-tester/
├── index.html                  # Punto de entrada HTML con soporte Swagger UI
├── package.json                # Dependencias (React 18, Vite 6, Tailwind 3, Axios, Lucide)
├── vite.config.ts              # Configuración Vite fijada a host 127.0.0.1:5173
├── tsconfig.json               # Configuración TypeScript estricta
├── tailwind.config.js          # Estilos y tema oscuro moderno
└── src/
    ├── main.tsx                # Entrada React
    ├── App.tsx                 # Layout principal con navegación y vista de 3 paneles
    ├── index.css               # Estilos globales y reseteo de Tailwind
    ├── components/             # Componentes comunes (MethodBadge, StatusBadge, Sidebar)
    ├── context/                # AppContext (Gestión de estado global, specs y persistencia)
    ├── types/                  # Modelos TypeScript (openapi, auth, history, config)
    ├── services/
    │   ├── http-client.ts      # Cliente Axios con medición de tiempos y diagnóstico de errores
    │   ├── spec-parser.ts      # Normalizador OpenAPI y generador de payloads de ejemplo
    │   └── preset-specs.ts     # Especificaciones predefinidas del backend Vice City
    └── features/
        ├── home/               # Dashboard de inicio
        ├── endpoints/          # Lista y búsqueda de endpoints
        ├── request-builder/    # Constructor de peticiones y editor de parámetros
        ├── response-viewer/    # Visor de respuestas en vivo y diagnóstico
        ├── swagger/            # Vista Swagger UI embebida e importador
        ├── auth/               # Gestor de autenticación y roles
        ├── history/            # Historial de peticiones y replay
        └── config/             # Configuración general y loopback
```

---

## 🧪 6. Comandos Disponibles

```bash
# Iniciar en modo desarrollo:
npm run dev

# Compilar para producción (validación de tipos y empaquetado):
npm run build

# Previsualizar compilación localmente:
npm run preview
```

