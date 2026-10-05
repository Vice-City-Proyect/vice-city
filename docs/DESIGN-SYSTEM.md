# Sistema de diseño y landing — Vice City Iguana Club

Guía de referencia para mantener la interfaz visual consistente al trabajar en la landing.
Todo lo descrito aquí está extraído del código real del proyecto.

## Índice

1. [Qué es la landing](#1-qué-es-la-landing)
2. [Stack visual](#2-stack-visual)
3. [Sistema de diseño](#3-sistema-de-diseño)
4. [Responsive](#4-responsive)
5. [Componentes](#5-componentes)
6. [Estructura de la landing](#6-estructura-de-la-landing)
7. [Imágenes y recursos](#7-imágenes-y-recursos)
8. [Cómo continuar trabajando en la landing](#8-cómo-continuar-trabajando-en-la-landing)
9. [Qué NO debe hacer la landing](#9-qué-no-debe-hacer-la-landing)

---

## 1. Qué es la landing

La landing (`/`) es la página pública de presentación del complejo deportivo. Es **estática e
informativa**: muestra qué ofrece el club, sus tarifas, horarios, reglas de uso, ubicación y
contacto.

No interactúa con la base de datos, no consulta disponibilidad y no procesa reservas. Todo el
contenido proviene de constantes y datos estáticos en
`src/features/landing/data/facilities.ts`, alineados con las reglas de negocio del proyecto
(`.agents/skills/vice-city-business-rules/SKILL.md`).

Documentos relacionados:

| Documento | Propósito |
|---|---|
| `FRONTEND-GUIDE.md` | Arquitectura, estructura de carpetas y tecnología |
| `COMPONENTS-API.md` | Referencia de props de cada componente |
| `FRONTEND-MAP.md` | Árbol de componentes de la página |
| `FRONTEND-QUICKSTART.md` | Comandos y checklist para agregar código |
| `DESIGN-SYSTEM.md` (este) | Tokens, responsive y convenciones visuales |

---

## 2. Stack visual

| Elemento | Tecnología | Nota |
|---|---|---|
| Framework | Next.js 16 (App Router) | `reactCompiler: true` en `next.config.ts` |
| UI | React 19 + TypeScript estricto | Alias `@/` → `src/` |
| Estilos | Tailwind CSS v4 | Sin `tailwind.config.js`: los tokens viven en `@theme` |
| Iconos | `lucide-react` | Única librería de iconos |
| Tipografías | `next/font/google` (Geist, Geist Mono) | Variables CSS, subconjunto `latin` |
| Animación | Solo transiciones CSS | Sin librerías de animación |

`postcss.config.mjs` usa `@tailwindcss/postcss`. `globals.css` arranca con
`@import "tailwindcss";`.

---

## 3. Sistema de diseño

### 3.1 Colores

Todos los colores están declarados como variables CSS en el bloque `@theme` de
`src/app/globals.css`. Tailwind v4 los convierte automáticamente en utilidades
(`bg-*`, `text-*`, `border-*`, `ring-*`).

#### Paleta base del club

| Token | Valor | Uso recomendado | Ejemplo real en el código |
|---|---|---|---|
| `club-bg` | `#ecebe1` | Fondo general de la página. Color crema cálido, nunca blanco puro. | `page.tsx` → `bg-club-bg`; `globals.css` → `body` |
| `club-surface` | `#ffffff` | Tarjetas, paneles, chips y superficie elevada sobre `club-bg`. | `Card` → `bg-club-surface`; menú móvil del `Header` |
| `club-primary` | `#b0bf3f` | Acento lima de marca: palabra destacada en títulos, iconos, botón primario, borde superior del footer. | `SectionHeader` → texto destacado; `Button variant="primary"` |
| `club-primary-hover` | `#9da833` | Estado hover del acento primario. | `Button` → `hover:bg-club-primary-hover` |
| `club-accent` | `#172010` | Verde muy oscuro. Fondos de secciones inversas y títulos sobre superficie clara. | `CTA` → `bg-club-accent`; `Footer` → `bg-club-accent`; `Card tone="dark"` |
| `text-main` | `#232d16` | Texto principal y títulos de tarjeta. | `body`; `Section` → `border-text-main/10` |
| `text-muted` | `#6b7562` | Texto secundario: descripciones, etiquetas, valores secundarios. | `FacilityCard` → `text-text-muted` |
| `btn-text` | `#0e1608` | Texto del botón primario (contraste sobre el lima). | `Button variant="primary"` → `text-btn-text` |

#### Paleta de marca secundaria

| Token | Valor | Uso | Estado |
|---|---|---|---|
| `brand-blue` | `#4a7c9f` | Detalle cromático en iconografía de datos secundarios dentro de tarjetas. | En uso: `FacilityCard` (icono de capacidad) |
| `brand-yellow` | `#e4be36` | Detalle cromático para alertas e información destacada dentro de tarjetas. | En uso: `FacilityCard` (iconos de ingreso y reglas) |
| `brand-blue-light` | `#a0c3d9` | Variante clara de marca azul. | **Declarado pero sin uso.** No usarlo sin antes justificarlo |
| `brand-green-dark` | `#3a4714` | Variante oscura de marca verde. | **Declarado pero sin uso.** No usarlo sin antes justificarlo |

> **Regla:** los tokens `brand-*` son colores de detalle para iconos, nunca para fondos ni
> textos largos. Si necesitas un matiz nuevo, primero evalúa si `club-*` ya resuelve el caso.

#### Opacidad sobre tokens

El proyecto usa modificadores de opacidad en lugar de colores nuevos:

```text
border-text-main/10     borde sutil sobre superficie clara
bg-club-surface/50      superficie translúcida (secciones alternas)
bg-club-bg/90           header con efecto glassmorphism
text-white/70           texto secundario sobre fondo oscuro
border-white/10         separador sobre fondo oscuro
```

Sobre fondos oscuros (`club-accent`) el texto usa **blanco con opacidad**, no `text-muted`.

### 3.2 Tipografía

| Aspecto | Decisión |
|---|---|
| Familia | Geist Sans (`--font-geist-sans`), con fallback `Arial, Helvetica, sans-serif` |
| Mono | Geist Mono (`--font-mono`) — declarado, hoy sin uso en la landing |
| Estilo | Toda la interfaz está en español, textos en `uppercase` para títulos, botones y etiquetas |

#### Pesos

| Peso | Uso |
|---|---|
| `font-black` | Títulos (`h1`, `h2`, `h3`) y la marca "Vice City Iguana" |
| `font-bold` | Botones, chips, eyebrows, navegación, valores de datos |
| `font-semibold` | Datos destacados del hero ( horario, ciudad, descuento ) |
| `font-medium` | Etiquetas de la lista de datos dentro de `FacilityCard` |
| `font-normal` | Sufijo secundario de la tarifa (`rateType`) |

#### Escala de títulos

| Elemento | Clases |
|---|---|
| `h1` (Hero) | `text-4xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.95] tracking-tight` |
| `h2` (secciones) | `text-3xl sm:text-4xl lg:text-5xl font-black uppercase leading-tight tracking-tight` |
| `h3` (tarjetas) | `text-xl font-black uppercase leading-tight tracking-tight` |

#### Escala de texto

| Elemento | Clases |
|---|---|
| Descripción de sección | `text-base sm:text-lg leading-relaxed text-text-muted` |
| Párrafo sobre oscuro | `text-base sm:text-lg leading-relaxed text-white/70` |
| Texto de tarjeta | `text-sm leading-relaxed text-text-muted` |
| Etiqueta / chip / eyebrow | `text-xs font-bold uppercase tracking-wider` |
| Microdatos de tarjeta | `text-xs` o `text-[10px]` |
| Cifras destacadas | `font-bold` sobre `text-xs` (datos de tarjeta) o `text-sm` (footer, CTA) |

#### Reglas tipográficas

* `tracking-tight` en títulos grandes (compensa el peso `font-black`).
* `tracking-wider` en botones, etiquetas y navegación.
* `tracking-widest` solo en el badge del Hero.
* Todo título de sección combina un texto normal + un fragmento en `text-club-primary`
  (prop `highlightedTitle` de `SectionHeader`).
* Párrafos siempre `leading-relaxed`; datos compactos `leading-snug` o `leading-tight`.

### 3.3 Botones

Componente único: `src/components/ui/Button.tsx` exporta `Button` y `ButtonLink`.
Ambos comparten las mismas clases base, variantes y tamaños.

```text
Clases base (BASE)
inline-flex items-center justify-center gap-2 rounded-xl font-bold uppercase
tracking-wider transition-colors duration-200
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-club-primary
focus-visible:ring-offset-2
```

| Variante | Fondo | Texto | Hover | Cuándo usarla |
|---|---|---|---|---|
| `primary` (default) | `bg-club-primary` | `text-btn-text` | `hover:bg-club-primary-hover` | Acción principal: CTA del hero, "Reservar" del header, "Hablar con concierge", "Cómo llegar" |
| `dark` | `bg-club-accent` | `text-white` | `hover:bg-club-accent/90` | Acción principal sobre superficie clara |
| `light` | transparente | `text-white` | `hover:bg-white hover:text-club-accent` | Acción secundaria sobre fondo oscuro o con imagen de fondo. Siempre con `border-2 border-white/50` |

| Tamaño | Padding | Tipografía |
|---|---|---|
| `sm` | `px-4 py-2` | `text-xs` |
| `md` (default) | `px-5 py-3` | `text-xs sm:text-sm` |
| `lg` | `px-7 py-4` | `text-sm sm:text-base` |

* `ButtonLink` detecta enlaces externos con `href.startsWith('http')` y añade
  `target="_blank"` + `rel="noopener noreferrer"` automáticamente.
* Admite `tel:`, `mailto:` y anclas `#id` sin configuración adicional.
* El icono (de `lucide-react`) va como `children` después del texto; `gap-2` ya lo separa.
* En móvil los botones del hero y del CTA usan `w-full sm:w-auto`.

### 3.4 Cards

#### `Card` (`src/components/ui/Card.tsx`)

Superficie base. Clases fijas:

```text
flex flex-col overflow-hidden rounded-3xl border border-text-main/10 shadow-xs
```

| `tone` | Fondo | Texto | Uso |
|---|---|---|---|
| `light` (default) | `bg-club-surface` | `text-text-main` | Tarjetas de escenario (`FacilityCard`) |
| `dark` | `bg-club-accent` | `text-white` | Bloque informativo de datos en `Pools` |

#### Estructura de `FacilityCard`

```text
Card (group)
├── Imagen  h-56, object-cover, group-hover:scale-105
│   ├── Gradiente inferior (legibilidad del texto)
│   ├── Badge  arriba-izquierda · bg-club-surface/95 · text-[10px] uppercase
│   └── Sport  abajo-izquierda · text-white
└── Contenido  flex-1 flex-col gap-4 p-6
    ├── Nombre      h3 text-xl font-black uppercase
    ├── Descripción text-sm text-text-muted
    ├── Lista dl    border-t border-text-main/10 pt-4 text-xs
    │   Tarifa · Capacidad · Ingreso
    └── Reglas      rounded-xl bg-club-bg/70 p-3 text-xs text-text-muted
```

El patrón clave es `flex-1` en el contenido + `mt-auto` en el último bloque: así **todas las
tarjetas de una fila alinean su bloque de reglas al fondo**, aunque tengan descripciones de
distinto largo. No romper esta regla al agregar contenido a la tarjeta.

#### Radios, bordes y sombras

| Token | Valor | Uso |
|---|---|---|
| `rounded-3xl` | 1.5rem | Tarjetas y marco del mapa (superficies principales) |
| `rounded-2xl` | 1rem | Tarjetas de contacto, cards de promoción, mapa interior |
| `rounded-xl` | 0.75rem | Botones, bloque de reglas, badge del botón de menú |
| `rounded-lg` | 0.5rem | Items del menú móvil, chips de highlights |
| `rounded-full` | 9999px | Chips/eyebrows y puntos decorativos |
| `border-text-main/10` | — | Borde estándar sobre superficie clara |
| `border-white/10` | — | Separador estándar sobre fondo oscuro |
| `shadow-xs` | — | Tarjetas y tarjetas de contacto |
| `shadow-sm` | — | Botones con relleno (`primary`, `dark`) |
| `shadow-md` | — | Solo el marco del mapa (`Location`) |

Reglas de sombra:

* Superficies claras: `shadow-xs`.
* Botones con relleno: `shadow-sm`.
* Contenedores con contenido multimedia (mapa): `shadow-md`.
* No usar sombras grandes ni coloreadas.

### 3.5 Secciones

#### `Section` (`src/components/ui/Section.tsx`)

```text
<section class="relative scroll-mt-20 overflow-hidden py-16 sm:py-20 lg:py-24">
  <div class="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
```

| Decisión | Valor |
|---|---|
| Padding vertical | `py-16 sm:py-20 lg:py-24` (4rem → 5rem → 6rem) |
| Ancho máximo | `max-w-7xl` (80rem) |
| Padding horizontal | `px-4 sm:px-6 lg:px-8` |
| `scroll-mt-20` | Compensa el `header` fijo al navegar por anclas |
| `overflow-hidden` | Contiene los degradados de fondo |

**Regla:** toda sección nueva debe usar `Section`. No escribir `<section>` con padding manual.

#### Fondos alternos

La página alterna fondos para separar bloques visuales sin bordes duros:

| Sección | Fondo |
|---|---|
| Hero | Imagen + degradados negros |
| Piscinas | `bg-club-surface/50` + `border-t border-text-main/10` |
| Instalaciones | Fondo heredado (`club-bg`), sin borde |
| Ubicación | `bg-club-surface/50` + `border-t border-text-main/10` |
| CTA | `bg-club-accent` |

Al añadir una sección nueva, conserva el ritmo: claro (`club-bg`) → translúcido
(`club-surface/50`) → oscuro (`club-accent`) para los cierres.

#### `SectionHeader`

| Prop | Uso |
|---|---|
| `eyebrow` (requerida) | Chip con punto `bg-club-primary`; define la categoría de la sección |
| `title` (requerida) | Primera parte del `h2` |
| `highlightedTitle` (opcional) | Se renderiza en `text-club-primary` dentro del mismo `h2` |
| `description` (opcional) | Párrafo `text-text-muted` debajo del título |

Contenedor: `mb-10 sm:mb-14 flex max-w-3xl flex-col`. El `max-w-3xl` mantiene la medida de
lectura cómoda; no lo elimines.

---

## 4. Responsive

### Breakpoints

Solo se usan los breakpoints por defecto de Tailwind v4:

| Prefijo | Ancho | Rol en el diseño |
|---|---|---|
| (sin prefijo) | `< 640px` | Mobile: una columna, botones apilados, menú hamburguesa |
| `sm:` | `≥ 640px` | Tablet: padding horizontal mayor, botones en fila, 2 columnas en datos |
| `md:` | `≥ 768px` | Menú de navegación visible, grids de 2 columnas |
| `lg:` | `≥ 1024px` | Escritorio: grids de 3 columnas, tipografía grande, padding amplio |

Flujo mental: **Mobile → Tablet → Desktop**. El diseño base es mobile; cada breakpoint **solo
añade** capacidad. Nunca se oculta contenido en móvil.

### Patrón de grid

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
```

Por qué se usa:

* `grid-cols-1` garantiza que en móvil las tarjetas se lean de arriba abajo a ancho completo
  (las tarjetas tienen imagen y 3 filas de datos; a media columna serían ilegibles).
* `md:grid-cols-2` aprovecha tablets en horizontal sin forzar 3 columnas estrechas.
* `lg:grid-cols-3` es el máximo de columnas que la marca define; más columnas romperían el
  `max-w-7xl` y la jerarquía visual.
* `gap-6` es el gutter estándar entre tarjetas en toda la landing. No mezclar con `gap-4` o
  `gap-8` en grids de tarjetas.

Se usa en `Pools` (2 tarjetas de piscina + 1 tarjeta de datos) y en `Facilities`. Otros grids:

| Place | Clases | Columnas |
|---|---|---|
| Datos destacados del Hero | `grid-cols-1 sm:grid-cols-3` | 1 → 3 |
| Contacto en `Location` | `grid-cols-1 sm:grid-cols-2` | 1 → 2 |
| `Location` (info + mapa) | `grid-cols-1 lg:grid-cols-2 lg:gap-16` | 1 → 2 |
| Promociones del CTA | `grid-cols-1 sm:grid-cols-2` | 1 → 2 |
| `Footer` | `grid-cols-1 gap-10 md:grid-cols-3` | 1 → 3 |

### Comportamiento por elemento

| Elemento | Mobile | Tablet | Desktop |
|---|---|---|---|
| **Header** | Marca reducida (`text-base`), botón "Reservar" `sm`, botón hamburguesa | Marca `sm:text-lg`, navegación visible, sin hamburguesa | Marca `text-2xl`, navegación visible, header más alto (`lg:h-20`) |
| **Hero** | `min-h-[90vh]`, columna única, botones `w-full` apilados, 1 dato destacado | Botones en fila (`sm:flex-row`), 3 datos en fila | Título `lg:text-7xl`, `pt-36 pb-24`, `max-w-3xl` de contenido |
| **Cards** | 1 columna, imagen `h-56` | 2 columnas | 3 columnas |
| **Grid de piscinas** | 1 columna | 2 columnas | 3 columnas |
| **Mapa** | `h-90` | `sm:h-110` | `sm:h-110` |
| **Footer** | 1 columna, columnas apiladas | 3 columnas | 3 columnas |

Detalles importantes:

* **Header**: es el único elemento con estado. `h-16 lg:h-20`. Como pasa de `h-16` a `h-20` en
  `lg`, el `scroll-mt-20` de `Section` está calibrado para el header de escritorio; en móvil
  deja un pequeño margen extra, intencional.
* **Hero**: el degradado en dos capas (`bg-linear-to-r` horizontal + `bg-linear-to-t` vertical)
  garantiza legibilidad del texto blanco en cualquier relación de aspecto. Al agregar una
  imagen de fondo, replica ambos degradados.
* **Imágenes de tarjeta**: `fill` + `sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"`
  describe exactamente el grid 1/2/3. Si cambias el grid, actualiza `sizes`.
* **Botones**: `flex-col sm:flex-row` + `w-full sm:w-auto` para que en móvil ocupen todo el ancho
  y sean fáciles de tocar.

---

## 5. Componentes

### `Hero`

```text
Responsabilidad: Presentar el complejo y dirigir a la acción principal.
Props:           Ninguna.
Estado:          Ninguno (Server Component).
Dependencias:    next/image, lucide-react, components/ui/Button, data/facilities (COMPLEX_HOURS)
Uso:             Primera sección de src/app/page.tsx
```

### `Pools`

```text
Responsabilidad: Mostrar la zona acuática y sus datos operativos.
Props:           Ninguna.
Estado:          Ninguno.
Dependencias:    components/ui/Card, components/ui/Section, ./FacilityCard, data/facilities
Uso:             Sección #piscinas de la landing.
```

### `Facilities`

```text
Responsabilidad: Mostrar canchas, gimnasio y zona húmeda.
Props:           Ninguna.
Estado:          Ninguno.
Dependencias:    components/ui/Section, ./FacilityCard, data/facilities
Uso:             Sección #instalaciones de la landing.
```

### `FacilityCard`

```text
Responsabilidad: Tarjeta vertical de un escenario (imagen, datos y reglas).
Props:           facility: Facility  (src/features/landing/types.ts)
Estado:          Ninguno. Usa group/group-hover para el zoom de la imagen.
Dependencias:    next/image, lucide-react, components/ui/Card, types
Uso:             Compartida por Pools y Facilities. Es la única tarjeta de escenario.
```

### `Location`

```text
Responsabilidad: Comunicar dirección, contacto y ubicación física.
Props:           Ninguna.
Estado:          Ninguno.
Dependencias:    lucide-react, components/ui/Button, components/ui/Section, data/facilities
Uso:             Sección #ubicacion de la landing.
```

Constantes locales: `MAPS_URL` (enlace externo), `MAPS_EMBED_URL` (iframe),
`CONTACT_ITEMS`, `HIGHLIGHTS`.

### `CTA`

```text
Responsabilidad: Cerrar la página explicando cómo iniciar una reserva.
Props:           Ninguna.
Estado:          Ninguno.
Dependencias:    lucide-react, components/ui/Button, components/ui/Section, data/facilities
Uso:             Sección #reservas de la landing.
```

### `Button` / `ButtonLink`

```text
Responsabilidad: Acción (variantes primary/dark/light) con tamaño sm/md/lg.
Props:           Button → ButtonHTMLAttributes + variant, size, className, children
                 ButtonLink → href, variant, size, className, onClick, children
Estado:          Ninguno.
Dependencias:    Solo utilidades de Tailwind.
Uso:             Header, Hero, Location, CTA.
```

### `Card`

```text
Responsabilidad: Superficie base de tarjeta.
Props:           tone (light|dark), className, children + HTMLAttributes<HTMLDivElement>
Estado:          Ninguno.
Dependencias:    Solo Tailwind.
Uso:             FacilityCard, bloque de datos de Pools.
```

### `Section` / `SectionHeader`

```text
Responsabilidad: Contenedor de sección con ancho máximo y encabezado tipográfico.
Props:           Section → id, className, children
                 SectionHeader → eyebrow, title, highlightedTitle?, description?
Estado:          Ninguno.
Dependencias:    Solo Tailwind.
Uso:             Pools, Facilities, Location, CTA.
```

### `Header`

```text
Responsabilidad: Navegación fija con CTA y menú móvil.
Props:           Ninguna.
Estado:          isMenuOpen (boolean). Único estado de la página.
Dependencias:    useState, next/link, lucide-react, components/ui/Button
Uso:             src/app/page.tsx. Es un Client Component ('use client').
```

### `Footer`

```text
Responsabilidad: Cerrar con marca, navegación, dirección y horario.
Props:           Ninguna.
Estado:          Ninguno (Server Component).
Dependencias:    lucide-react.
Uso:             src/app/page.tsx
```

---

## 6. Estructura de la landing

```text
Landing (/)
│
├── Header            fijo, glassmorphism, navegación + CTA + menú móvil
├── Hero              imagen a pantalla completa, título, 2 CTAs, datos clave
├── Pools        #piscinas      grid 1/2/3: 2 FacilityCard + Card dark con datos
├── Facilities   #instalaciones grid 1/2/3: 5 FacilityCard
├── Location     #ubicacion     contacto 1/2 + iframe de Google Maps
├── CTA          #reservas      cierre oscuro con 2 botones y 2 promociones
└── Footer                     3 columnas: marca, navegación, horario
```

`src/app/page.tsx` solo ensambla. No contiene lógica ni estilos propios salvo el contenedor raíz:

```tsx
<div className="min-h-screen bg-club-bg text-text-main flex flex-col">
  <Header />
  <main className="flex-1">...</main>
  <Footer />
</div>
```

`flex-1` en `<main>` mantiene el footer al final de la ventana aunque el contenido sea corto.

Anclas activas: `#piscinas`, `#instalaciones`, `#ubicacion`, `#reservas`.

---

## 7. Imágenes y recursos

### Ubicación

Todas las imágenes viven en `public/` y se referencian con ruta absoluta (`/archivo.ext`).

### Inventario

| Archivo | Representa | Tamaño aprox. | Componente | Cómo se carga |
|---|---|---|---|---|
| `hero-athlete.webp` | Fondo del hero (deportista / complejo) | 80 KB | `Hero` | `next/image` con `fill`, `priority`, `sizes="100vw"` |
| `piscina-adultos.jpeg` | Piscinas de adultos semiolímpicas | 3,7 MB | `FacilityCard` (`POOLS[0]`) | `next/image` `fill` + `sizes` responsive |
| `piscina-ninos.jpeg` | Piscina infantil | 3,8 MB | `FacilityCard` (`POOLS[1]`) | `next/image` `fill` + `sizes` |
| `cancha-11.jpeg` | Cancha de fútbol 11 | 3,4 MB | `FacilityCard` (`FACILITIES[0]`) | `next/image` `fill` + `sizes` |
| `cancha-micro.jpeg` | Cancha de microfútbol | 3,9 MB | `FacilityCard` (`FACILITIES[1]`) | `next/image` `fill` + `sizes` |
| `polideportiva.jpeg` | Cancha polideportiva | 3,6 MB | `FacilityCard` (`FACILITIES[2]`) | `next/image` `fill` + `sizes` |
| `gym.jpeg` | Gimnasio | 3,5 MB | `FacilityCard` (`FACILITIES[3]`) | `next/image` `fill` + `sizes` |
| `sauna.jpeg` | Zona húmeda y sauna | 3,2 MB | `FacilityCard` (`FACILITIES[4]`) | `next/image` `fill` + `sizes` |

Sin uso por la landing actual (residuales o de la plantilla inicial): `hero-athlete.jpg`,
`Lucia_Caminos_gym.jpg`, `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`.

### Reglas para imágenes

* Usar **siempre `next/image`** con `import Image from 'next/image'`. Nunca `<img>`.
* El logo no es una imagen: es el emoji 🦎 con la palabra "Vice City" + "Iguana" en
  `text-club-primary`.
* Las imágenes de tarjeta se muestran con `fill`, `object-cover` y altura fija (`h-56`).
  No estirar la imagen: el contenedor debe tener `overflow-hidden` (ya lo trae `Card`).
* `alt` debe describir el contenido real. En `FacilityCard` se usa `alt={facility.name}`.
* El `path` se define en los datos (`data/facilities.ts`), no dentro del componente.
* `priority` solo para la imagen del Hero. `loading="lazy"` es el default del resto.
* El mapa es un `<iframe>` de Google Maps, no una imagen.
* Las imágenes originales son JPEG pesados; Next las optimiza por solicitud. Si agregas una
  imagen nueva, colócala en `public/`; para el Hero conviene usar `.webp` por su peso.

---

## 8. Cómo continuar trabajando en la landing

### Reglas obligatorias

1. **Usa solo los tokens de `@theme`.** No escribas colores hexadecimales ni `bg-[#...]` en los
   componentes. Si falta un matiz, agrégalo en `src/app/globals.css`.
2. **Usa Tailwind.** No crees archivos CSS nuevos, no uses CSS-in-JS, no agregues librerías de
   estilos o de animación.
3. **Reutiliza antes de crear.** Revisa `src/components/ui/` (`Button`, `Card`, `Section`,
   `SectionHeader`) y `src/features/landing/components/FacilityCard.tsx` antes de escribir un
   componente nuevo.
4. **Respeta la arquitectura.** Componentes genéricos en `src/components/ui/` y
   `src/components/layout/`. Componentes exclusivos de la landing en
   `src/features/landing/components/`. Contenido estático en
   `src/features/landing/data/`. Tipos en `src/features/landing/types.ts`.
5. **Usa el alias `@/`.** `import { Card } from '@/components/ui/Card';`
6. **Mantén el responsive.** Empieza por mobile, añade `sm:`, `md:` y `lg:` en ese orden.
   Verifica los tres anchos antes de abrir el PR.
7. **Usa `next/image`.** Nunca `<img>`.
8. **Mantén los componentes simples y presentacionales.** Sin fetches, sin efectos, sin
   estado global. Si un componente necesita estado, debe justificarse (el `Header` es el único
   caso actual).
9. **Evita estilos duplicados.** Si el mismo patrón aparece tres veces, extrae un componente o
   una constante en `data/`. No copies clases largas entre archivos.
10. **No agregues dependencias.** El set actual es `next`, `react`, `react-dom`,
    `lucide-react` y `tailwindcss`. `framer-motion` fue removida a propósito.
11. **No muevas archivos sin razón clara** y mantén los cambios acotados a la tarea.

### Cómo agregar una sección nueva

1. Crear `src/features/landing/components/<Nombre>.tsx` como Server Component (sin
   `'use client'` si no necesita estado).
2. Usar `Section` con un `id` en kebab-case si debe ser ancla de navegación.
3. Encabezar con `SectionHeader` (`eyebrow`, `title`, `highlightedTitle`, `description`).
4. Respetar la alternancia de fondos de la sección 3.5.
5. Si es una lista de tarjetas, usar `grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3`.
6. Registrar la sección en `src/app/page.tsx` dentro de `<main>`.
7. Si debe aparecer en el menú, agregar el enlace a `NAV_LINKS` en **ambos** `Header.tsx` y
   `Footer.tsx`.

```tsx
// src/features/landing/components/NuevaSeccion.tsx
import { Section, SectionHeader } from '@/components/ui/Section';
import { ButtonLink } from '@/components/ui/Button';

export function NuevaSeccion() {
  return (
    <Section id="nueva-seccion" className="border-t border-text-main/10 bg-club-surface/50">
      <SectionHeader
        eyebrow="Categoría"
        title="Título"
        highlightedTitle="destacado"
        description="Descripción breve de la sección."
      />

      <ButtonLink href="#reservas" size="lg">
        Llamado a la acción
      </ButtonLink>
    </Section>
  );
}
```

### Cómo agregar un escenario

1. Agregar el objeto al array correspondiente (`POOLS` o `FACILITIES`) en
   `src/features/landing/data/facilities.ts`.
2. Agregar la imagen a `public/` y referenciarla como `/nombre.jpeg`.
3. Verificar que el grid siga equilibrio visual (agregar uno a un grid de 3 columnas deja huecos;
   en ese caso agregar también el bloque informativo o reorganizar).

### Checklist antes de abrir un PR

```bash
npx tsc --noEmit   # tipos
npm run lint       # lint
npm run build      # build
```

* [ ] Solo se usaron tokens de `@theme`.
* [ ] Se verificó mobile, tablet y desktop.
* [ ] Las imágenes usan `next/image` con `alt` descriptivo.
* [ ] La sección respeta el patrón de `Section` / `SectionHeader`.
* [ ] No se agregó lógica de negocio ni dependencias.
* [ ] No se duplicaron componentes existentes.

---

## 9. Qué NO debe hacer la landing

La landing es **principalmente visual e informativa**. Su responsabilidad es presentar el
complejo y dirigir al usuario hacia el resto de la aplicación mediante enlaces.

### No debe contener

* Lógica de reservas (selección de fecha/hora, disponibilidad, creación de reservas).
* Lógica de pagos ni integración con pasarelas de pago.
* Carrito de reservas.
* Procesamiento de compras o checkout.
* Cálculo de precios, descuentos o tarifas en el navegador.
* Validaciones de backend o llamadas a API de negocio.
* Estado global (`Context`), tablas ni librerías de estado.

### Consecuencias prácticas

* **Los precios y capacidades mostrados son contenido editorial**, no un motor de cálculo.
  Si el administrador cambia una tarifa en el sistema, la landing se actualiza editando
  `src/features/landing/data/facilities.ts`.
* **Los botones solo navegan.** Hoy apuntan a anclas internas (`#reservas`, `#piscinas`) o a
  contactos externos (`tel:`, `mailto:`, Google Maps). Cuando existan las rutas `/login` o
  `/reservas`, basta con cambiar el `href` del `ButtonLink` en `CTA.tsx`.
* **No reintroducir el código eliminado en el refactor anterior**:
  * `features/landing/components/Cart/*` (carrito de reservas).
  * `features/landing/components/FacilitiesSlider.tsx` (carrusel con modal de compra y
    calculadora de precios).
  * `features/landing/components/LocationSection.tsx` (duplicado de `Location.tsx`).
  * `components/ui/Badge.tsx` (el badge se inlinea dentro de `FacilityCard`).
* **No reintroducir `framer-motion`.** Si otra funcionalidad la necesita, debe instalarse de
  forma explícita y justificada.

Si en el futuro la landing necesita lógica real (disponibilidad, reservas, pagos), esa lógica
debe vivir en su propia feature (`src/features/reservations/`, `src/features/payments/`) y en
`src/services/`, **no** dentro de `src/features/landing/`.
