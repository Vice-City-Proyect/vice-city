# Guía para Frontend - Vice City Iguana Club

## Resumen
Aplicación web desarrollada con Next.js 16 (App Router), TypeScript y Tailwind CSS. Es una landing page estática para un complejo deportivo en Barranquilla.

## Tecnologías
- Next.js 16.3.7 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- lucide-react (iconos)
- babel-plugin-react-compiler

## Estructura del proyecto

```
src/
├── app/              # App Router (páginas y layouts)
├── components/       # Componentes reutilizables UI y layout
├── features/         # Features por dominio (feature-sliced)
├── lib/              # Utilidades/configuración
├── services/         # Lógica de negocio (vacío actualmente)
├── types/            # Tipos compartidos (vacío actualmente)
└── middleware.ts     # Middleware global (actualmente passthrough)
```

## Configuración y rutas

### `src/app/layout.tsx`
- Layout raíz con fuentes Geist (Sans/Mono)
- Metadata: título "Vice City Iguana Club", descripción del complejo
- Usa `LayoutProps<"/">` tipado con Next.js 16
- CSS global importado desde `./globals.css`

### `src/app/page.tsx`
Página home: renderiza `Header`, `main` con `Hero`, `Pools`, `Facilities`, `Location`, `CTA`, y `Footer`.

### `src/app/globals.css`
Configura Tailwind v4 con `@theme`:
- Colores: `club-bg`, `club-surface`, `club-primary`, `club-primary-hover`, `club-accent`, `text-main`, `text-muted`, `btn-text`, `brand-blue`, `brand-blue-light`, `brand-yellow`, `brand-green-dark`
- Fuentes: `font-sans`, `font-mono` (vinculadas a variables CSS)

## Componentes reutilizables (`src/components/`)

### UI (`src/components/ui/`)
- **Button** (`Button.tsx`): botón nativo. Props: `variant` (`primary|dark|light`), `size` (`sm|md|lg`), `className`, `children`, + HTMLButtonAttributes. Clases base con focus-visible ring.
- **ButtonLink** (`Button.tsx`): enlace estilizado (`<a>`). Props: `href`, `variant`, `size`, `className`, `onClick?`, `children`. Detecta enlaces externos (`http`) y añade `target="_blank"` + `rel="noopener noreferrer"`.
- **Card** (`Card.tsx`): contenedor con bordes redondeados, sombra. Props: `tone` (`light|dark`), `className`, `children`, + HTMLAttributes<HTMLDivElement>.
- **Section** (`Section.tsx`): sección con `id`, padding vertical responsive, `scroll-mt-20` (para anclajes con header fijo), ancho máximo `max-w-7xl`. 
- **SectionHeader** (`Section.tsx`): header de sección con `eyebrow`, `title`, `highlightedTitle?`, `description?`. Muestra badge con punto verde.

### Layout (`src/components/layout/`)
- **Header** (`Header.tsx`): header fijo (`fixed inset-x-0 top-0 z-50`), transparente con blur (`bg-club-bg/90 backdrop-blur-md`). Logo con ícono lagarto, navegación desktop (`#piscinas`, `#instalaciones`, `#ubicacion`), botón "Reservar" (`#reservas`), menú móvil con toggle (estado `isMenuOpen`, íconos Menu/X de lucide-react).
- **Footer** (`Footer.tsx`): fondo `club-accent`, 3 columnas (marca+descripción+dirección, navegación, horario). Muestra dirección, horario "Lunes a domingo 8:00 AM – 5:00 PM", nota sobre mantenimiento.

## Feature: Landing (`src/features/landing/`)

### Tipos (`types.ts`)
```ts
export interface Facility {
  id: string;
  name: string;
  sport: string;
  badge: string;
  image: string;
  description: string;
  rate: string;
  rateType: string;
  capacity: string;
  rules: string;
  wristband: string;
}
```

### Datos (`data/facilities.ts`)
Exporta:
- `COMPLEX_HOURS = '8:00 AM – 5:00 PM'`
- `POOLS: Facility[]` (2 items): piscinas adultos (1,2,3), piscina infantil
- `FACILITIES: Facility[]` (5 items): cancha fútbol 11, microfútbol, polideportiva, gimnasio, zona húmeda+sauna

Imágenes referenciadas: `/piscina-adultos.jpeg`, `/piscina-ninos.jpeg`, `/cancha-11.jpeg`, `/cancha-micro.jpeg`, `/polideportiva.jpeg`, `/gym.jpeg`, `/sauna.jpeg` (disponibles en `public/`).

### Componentes (`components/`)
- **Hero**: hero con imagen de fondo (`/hero-athlete.webp`), overlay, título, CTAs (`#piscinas`, `#instalaciones`), badges con horario/dirección/descuento miércoles.
- **Pools**: sección `#piscinas`, mapea `POOLS` con `FacilityCard`, añade card oscuro con datos generales (horario, capacidad, piscina completa con descuento, mantenimiento).
- **Facilities**: sección `#instalaciones`, mapea `FACILITIES` con `FacilityCard`.
- **FacilityCard**: card vertical con imagen, badge, deporte, título, descripción, 3 filas (tarifa, capacidad, ingreso) con íconos, caja de reglas.
- **Location**: sección `#ubicacion`, info de contacto (dirección, horario, tel `+57 (300) 912-3456`, email `concierge@vicecityiguana.club`), highlights, iframe de Google Maps (embed + botón "Cómo llegar").
- **CTA**: sección `#reservas`, CTAs (llamar por teléfono, ver piscinas), 2 cards con promociones (20% miércoles, piscina completa).

## Public assets
Imágenes en `public/`: canchas, gimnasio, piscinas, sauna, hero, logos SVG. Usar rutas absolutas `/nombre.jpg|.jpeg|.webp`.

## Patrones de uso para frontend

### Importar con alias
Usar `@/` para imports desde `src/`. Ej: `import { Button } from '@/components/ui/Button'`.

### Tipado
Todo en TypeScript estricto. Usar tipos definidos en `features/landing/types.ts` cuando corresponda.

### Estilos
Tailwind CSS 4. Colores definidos vía `@theme`. Clases utilitarias directas. Evitar CSS custom innecesario.

### Componentes
- UI componentes son presentacionales, sin lógica de negocio.
- Feature components componen la landing usando UI + datos + tipos.
- Layout components estructuran la página.

### Navegación
Enlaces ancla (`#id`) usados para navegación interna (piscinas, instalaciones, ubicación, reservas). Header fijo implica usar `scroll-mt-20` en secciones (ya aplicado en `Section`).

## Middleware
`src/middleware.ts` actual: solo pasa la request (`NextResponse.next()`). Sin auth/rutas protegidas aún.

## Servicios/Tipos vacíos
`src/services/.gitkeep`, `src/types/.gitkeep` - preparados para futura lógica de negocio/tipos compartidos.

## Notas para integrar frontend con backend
Actualmente toda la información mostrada es estática (datos en `features/landing/data/facilities.ts`, horarios, contacto). Si se agrega API:
- Mantener arquitectura por features (crear feature nueva: `src/features/<nombre>/`)
- Colocar lógica de negocio en `src/services/` o dentro de feature según convenga
- Definir tipos en `src/types/` compartidos o `src/features/<nombre>/types.ts`
- Endpoints en `src/app/api/...` (no existen aún) siguiendo App Router
- Respetar imports con `@/`
