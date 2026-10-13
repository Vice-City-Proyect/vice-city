# Pull Request: [HU09-F] Implementación de Landing Page, Componentes y Flujo de Reservas

| Campo | Detalle |
| :--- | :--- |
| **Rama Origen** | `feature/HU09/landing-page/saeb-gc` |
| **Rama Destino** | `develop` |
| **Historia de Usuario** | **HU09-F: Landing Page (Frontend)** |
| **Proyecto** | Vice City Iguana Club |
| **Tipo de Cambio** | `feat` (Nueva funcionalidad y arquitectura basada en features) |

---

## 📌 1. Descripción General del Proyecto y Contexto

El presente Pull Request implementa de manera integral la **Landing Page** para la plataforma web de **Vice City Iguana Club**, un complejo deportivo de alto rendimiento ubicado en Barranquilla. Esta pantalla constituye el punto de entrada principal para los usuarios, presentando la propuesta de valor del club, su catálogo de escenarios deportivos, calculadoras de precios dinámicas en tiempo real, un sistema de reservas integrado con carrito interactivo, ubicación geográfica con Google Maps e información corporativa.

### Estándares de Arquitectura
Siguiendo las directrices del proyecto establecidas en [readme.md](file:///c:/Users/garci/Downloads/proyecto_vc_1/readme.md):
- Los componentes reutilizables globales residen en `src/components/layout/`.
- La lógica de negocio, tipos y componentes de la funcionalidad están encapsulados bajo `src/features/landing/`.
- La composición y renderizado principal se orquestan en [page.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/app/page.tsx) envolviendo la aplicación con el proveedor de estado `CartProvider`.

---

## 📁 2. Estructura de Archivos del Proyecto

```text
vice-city/
├── src/
│   ├── app/
│   │   ├── globals.css                       # Variables de tema y configuración Tailwind CSS v4
│   │   ├── layout.tsx                        # Layout raíz y metadatos HTML
│   │   └── page.tsx                          # Orquestación de la Landing Page + CartProvider
│   │
│   ├── components/
│   │   └── layout/
│   │       ├── Header.tsx                    # Barra de navegación fija con contador dinámico
│   │       └── Footer.tsx                    # Pie de página corporativo, políticas y horarios
│   │
│   └── features/
│       └── landing/
│           ├── types.ts                      # Interfaces de TypeScript (Instalaciones, Reservas, Carrito)
│           └── components/
│               ├── Hero.tsx                  # Sección principal de bienvenida con CTAs
│               ├── FacilitiesSlider.tsx      # Carrusel de instalaciones + Modal detallado de reserva
│               ├── LocationSection.tsx       # Ubicación del club, concierge y mapa interactivo
│               └── Cart/
│                   ├── CartContext.tsx       # Context API y hook de gestión de reservas
│                   ├── Cart.tsx              # Drawer lateral deslizable (Slide-over)
│                   ├── CartItem.tsx          # Fila individual de reserva con ajuste de horas
│                   └── CartEmpty.tsx         # Estado visual cuando el carrito está vacío
```

---

## 📦 3. Dependencias del Proyecto

El desarrollo utiliza las siguientes dependencias registradas en [package.json](file:///c:/Users/garci/Downloads/proyecto_vc_1/package.json):

### 3.1 Dependencias de Producción (`dependencies`)

| Dependencia | Versión | Rol en la Landing Page |
| :--- | :--- | :--- |
| **`next`** | `16.3.7` | Framework principal. Utiliza la arquitectura App Router, renderizado del lado del cliente (`"use client"`), fuentes optimizadas y el componente nativo `next/image` con carga prioritaria para alto rendimiento (LCP). |
| **`react`** | `19.2.8` | Biblioteca base de interfaz de usuario. Emplea hooks modernos (`useState`, `useRef`, `useEffect`, `useCallback`, `useMemo`, `useContext`) para la reactividad fluida de reservas y carruseles. |
| **`react-dom`** | `19.2.8` | Capa de renderizado en el navegador para React 19. |
| **`lucide-react`** | `^1.50.0` | Colección de íconos vectoriales SVG optimizados y accesibles para deportes, controles de navegación, insígnias, horarios, teléfonos y carrito de compras (`ShoppingCart`, `Calendar`, `Clock`, `Users`, `MapPin`, `Trash2`, etc.). |
| **`framer-motion`** | `^14.0.0` | Motor de animaciones utilizado para la transición suave de apertura y cierre del cajón del carrito (slide-over), animaciones de entrada del modal, badges pulsantes y microinteracciones en botones. |

### 3.2 Dependencias de Desarrollo (`devDependencies`)

| Dependencia | Versión | Rol |
| :--- | :--- | :--- |
| **`tailwindcss`** | `^4` | Motor de estilos utilitarios moderno (Tailwind CSS v4) configurado mediante variables CSS nativas en [globals.css](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/app/globals.css). |
| **`@tailwindcss/postcss`** | `^4` | Integración de procesamiento PostCSS para Tailwind v4. |
| **`typescript`** | `^5` | Tipado estático estricto para evitar errores en tiempo de ejecución en interfaces de datos y props de componentes. |
| **`eslint`** / **`eslint-config-next`** | `^9` / `16.3.7` | Linter estandarizado para mantener la consistencia y calidad de código Next.js. |
| **`babel-plugin-react-compiler`** | `1.0.0` | Compilador experimental de React para optimización automática de memoización. |

---

## 🧩 4. Documentación Detallada de Componentes

### 4.1 Componentes Globales de Layout (`src/components/layout/`)

#### 🔹 [Header.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/Header.tsx)
* **Propósito**: Barra de navegación superior fija en pantalla.
* **Características Clave**:
  - Diseño con efecto de desenfoque de fondo (*glassmorphism*) mediante `backdrop-blur-md` y fondo semi-transparente.
  - Logotipo e isotipo del club con tipografía en mayúsculas (`Vice City Iguana`).
  - Navegación rápida mediante anclas suaves hacia las secciones `#facilities`, `#about` y `#contact`.
  - Botón de apertura del carrito de compras con contador en tiempo real (`badge`), el cual incorpora una animación de pulso cuando existen reservas activas.
* **Props**:
  - `onOpenCart?: () => void` (Opcional, en caso de no especificarse consume directamente `openCart` de [useCart](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartContext.tsx#L116-L122)).
  - `totalBookings?: number` (Opcional, sincronizado por defecto con el estado global).

#### 🔹 [Footer.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/Footer.tsx)
* **Propósito**: Sección de cierre y pie de página corporativo.
* **Características Clave**:
  - Contraste visual definido con borde superior de acento corporativo (`border-t-8 border-club-primary`).
  - Identificación de la zona horaria operativa: `America/Bogota (UTC-5)`.
  - Matriz de información con horarios de atención (Lunes a Domingo, 8:00 AM a 5:00 PM, festivos incluidos).
  - Enlaces directos a políticas (Reglas de reserva, cancelación y privacidad).
  - Pie con mención de derechos reservados para el año 2026.

---

### 4.2 Componentes de la Funcionalidad Landing (`src/features/landing/components/`)

#### 🔹 [Hero.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Hero.tsx)
* **Propósito**: Encabezado visual de impacto para captar la atención del usuario.
* **Características Clave**:
  - Imagen a sangre completa (*full-bleed*) utilizando el componente `<Image>` de Next.js con carga prioritaria (`priority`), alta calidad y dimensionamiento responsivo.
  - Superposición de degradados lineales multidireccionales para asegurar la legibilidad del texto y el contraste de accesibilidad.
  - Insignia de estado ("Premium Sports Experience") con punto parpadeante.
  - Título tipográfico contundente ("Unleash Your Potential") con resplandor neón decorativo.
  - Botones de acción principales:
    - **"Book Your Court"**: Conduce de inmediato al catálogo de escenarios en `#facilities`.
    - **"Club Details"**: Redirige a la sección informativa en `#about`.

#### 🔹 [FacilitiesSlider.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/FacilitiesSlider.tsx)
* **Propósito**: Carrusel horizontal e interactivo que presenta la oferta deportiva del complejo y abre la experiencia de reserva.
* **Instalaciones Incluidas en el Catálogo**:
  1. **Adult Pools (1, 2 & 3)**: Piscinas semiolímpicas climatizadas ($2.000 COP / hora por persona).
  2. **Kids Pool 1**: Piscina infantil supervisada con fuentes de agua ($2.000 COP / hora por persona).
  3. **Large Soccer Field**: Cancha de fútbol 11 profesional con césped certificado FIFA Quality Pro ($140.000 COP / hora exclusiva).
  4. **Micro-soccer Field 5v5**: Cancha de microfútbol perimetrada de alto impacto ($80.000 COP / hora exclusiva).
  5. **Multisport Court**: Cancha polideportiva amortiguada para voleibol y básquetbol ($70.000 COP / hora exclusiva).
  6. **Gym 1**: Gimnasio de fuerza equipado con maquinaria Hammer Strength y peso libre ($2.000 COP / hora por persona).
  7. **Wet Zone / Sauna**: Zona húmeda con sauna finlandés, turco de eucalipto y tinas de frío ($4.000 COP / hora por persona).
* **Funcionalidades**:
  - Desplazamiento horizontal fluido mediante botones de dirección anterior/siguiente.
  - Tarjetas con imagen, categoría deportiva, tarifa, capacidad y normas de uso.
  - Botón **"Ver Info"** que activa el modal detallado [FacilityDetailModal](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/FacilitiesSlider.tsx#L230-L350).
* **Modal Detallado ([FacilityDetailModal](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/FacilitiesSlider.tsx#L230-L350))**:
  - Ventana emergente con desenfoque de fondo y control accesible (cierre con tecla `Escape` y bloqueo de scroll de la página).
  - Selector de fecha de reserva.
  - Menú desplegable con franjas horarias disponibles (8:00 AM a 5:00 PM).
  - Controles incrementales personalizados (`NumberStepper`) para la selección de horas (1 a 8 hrs) y número de personas.
  - Lógica de cálculo en tiempo real:
    - *Reserva Exclusiva*: `Tarifa * Horas`.
    - *Por Persona*: `Tarifa * Horas * Personas`.
  - Botón de adición al carrito con confirmación visual interactiva y botón secundario de favoritos con ícono de corazón.

#### 🔹 [LocationSection.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/LocationSection.tsx)
* **Propósito**: Presentar la sede física, vías de acceso, atención VIP y ubicación satelital.
* **Características Clave**:
  - Dirección física oficial: Cra. 53 # 106 - 280, Barranquilla, Atlántico, Colombia.
  - 4 tarjetas informativas: Dirección, Horarios de operación, Línea de Concierge (`+57 300 912-3456`) y Correo directo (`concierge@vicecityiguana.club`).
  - Etiquetas destacadas de amenidades (Valet Parking exclusivo y Zonas Climatizadas).
  - Iframe integrado de Google Maps con estilización, filtro de saturación y carga diferida (`loading="lazy"`).
  - Botón flotante **"Abrir en Google Maps"** con enlace directo a la ubicación satelital oficial.

---

### 4.3 Sistema de Carrito y Estado de Reservas (`src/features/landing/components/Cart/`)

#### 🔹 [CartContext.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartContext.tsx)
* **Propósito**: Proveedor de estado global que administra las reservas activas del cliente.
* **Métodos y Estados Expuestos**:
  - `cart`: Lista de reservas de tipo [CartBookingItem](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/types.ts#L31-L45).
  - `isCartOpen`: Booleano que define si el cajón lateral está desplegado.
  - `openCart()` / `closeCart()`: Abre o cierra el cajón lateral.
  - `addBookingToCart(booking)`: Agrega una nueva reserva con ID único y abre el carrito automáticamente.
  - `removeFromCart(id)`: Elimina un elemento por su identificador.
  - `updateHours(id, delta)`: Modifica las horas reservadas (límites de 1 a 8 horas) y recalcula el subtotal en pesos colombianos.
  - `totalCost`: Valor total acumulado de las reservas en COP (calculado mediante `useMemo`).
  - `totalBookings`: Conteo total de reservas presentes en el carrito.
  - `formatCOP(amount)`: Formateador numérico de moneda colombiana.

#### 🔹 [Cart.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/Cart.tsx)
* **Propósito**: Panel lateral deslizable (*slide-over drawer*) animado con `framer-motion`.
* **Características Clave**:
  - Fondo oscuro con efecto *blur* que cierra el cajón al recibir clic.
  - Cabecera con conteo dinámico de instalaciones seleccionadas y botón de cierre accesible.
  - Lista deslizable con soporte para renderizar los elementos activos o el estado vacío.
  - Sección inferior con desglose del número de reservas, monto total en COP y botón de acción principal **"Continuar al Pago"**.

#### 🔹 [CartItem.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartItem.tsx)
* **Propósito**: Tarjeta representativa de cada reserva dentro del carrito.
* **Características Clave**:
  - Miniatura fotográfica con ícono representativo de la disciplina.
  - Insignia con la modalidad (`Reserva Exclusiva` o `Por persona / hora`).
  - Datos de fecha, franja horaria y cantidad de personas.
  - Ajustador de horas (`+` / `-`) en vivo con recálculo automático del subtotal.
  - Botón de papelera para eliminar la reserva.

#### 🔹 [CartEmpty.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartEmpty.tsx)
* **Propósito**: Vista de carrito vacío que orienta al usuario hacia la exploración de los escenarios deportivos.

---

## 📐 5. Modelos de Datos TypeScript ([types.ts](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/types.ts))

```typescript
// Modelo de datos de cada instalación deportiva
export interface FacilityItem {
  id: string;
  name: string;
  sport: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  rate: string;
  rateType: string;
  numericRate: number;
  capacity: string;
  rules?: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  badge: string;
  image: string;
}

// Payload generado al momento de reservar desde el modal
export interface BookingPayload {
  facility: FacilityItem;
  selectedDate: string;
  selectedTime: string;
  hours: number;
  people: number;
  totalPrice: number;
  isExclusive: boolean;
}

// Elemento administrado dentro del carrito de compras
export interface CartBookingItem {
  id: string;
  facilityId: string;
  facilityName: string;
  modalidad: string;
  date: string;
  time: string;
  hours: number;
  people?: number;
  rate: number;
  subtotal: number;
  icon?: React.ComponentType<{ className?: string }>;
  primaryColor?: string;
  image?: string;
}
```

---

## ✅ 6. Lista de Verificación de Calidad y Pruebas Realizadas

- [x] **Cumplimiento de Arquitectura**: El código respeta la convención de carpetas por funcionalidad (`src/features/landing`) y componentes comunes (`src/components/layout`) descrita en `readme.md`.
- [x] **Validación de Linter**: Ejecución exitosa de `npm run lint` con 0 errores en los componentes de la Landing Page.
- [x] **Diseño Responsivo**: Comportamiento verificado en dispositivos móviles (375px+), tabletas (768px+) y pantallas de escritorio (1280px+).
- [x] **Accesibilidad y UX**: Cierre de modales mediante tecla `Escape`, bloqueo de desplazamiento de fondo al abrir ventanas emergentes y contrastes adecuados en textos.
- [x] **Rendimiento Visual**: Uso de imágenes prioritarias y optimizadas en Next.js, fuentes del sistema y carga diferida en mapas.
- [x] **Tipado Estricto**: Todo el código cuenta con interfaces y tipos explícitos en TypeScript.

---

## 🚀 7. Instrucciones para Revisión (Code Review)

1. Cambiar a la rama de la funcionalidad:
   ```bash
   git checkout feature/HU09/landing-page/saeb-gc
   ```
2. Instalar dependencias si no se ha hecho previamente:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
4. Puntos a evaluar:
   - Navegación fija del [Header](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/Header.tsx) y anclas de navegación suave.
   - Apertura y cálculo de tarifas en el modal de instalaciones de [FacilitiesSlider](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/FacilitiesSlider.tsx).
   - Comportamiento del carrito: agregar reserva, ajustar horas, eliminar elementos y visualización del total en COP.
   - Visualización y enlace externo de Google Maps en [LocationSection](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/LocationSection.tsx).
