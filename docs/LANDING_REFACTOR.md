# Landing Page — Vice City Iguana Club

Documentación de la landing page estática del complejo deportivo.

| Parámetro | Detalle |
| :--- | :--- |
| Rama | `feature/HU09F/static-landing-ronaldo-rodriguez` |
| Alcance | Presentación del complejo (informativa y visual) |
| Lógica de negocio | Ninguna. Sin carrito, pagos ni reservas. |
| Dependencias | Solo `next`, `react`, `tailwindcss` y `lucide-react` |

---

## 1. Objetivo

La landing es una página **estática** que presenta el complejo deportivo. No gestiona
reservas, pagos ni disponibilidad. El contenido proviene de datos estáticos
(`src/features/landing/data/facilities.ts`) alineados con las reglas de negocio del proyecto
(`.agents/skills/vice-city-business-rules`).

Todo lo que la landing muestra es contenido. Cualquier interacción con reglas de negocio
(disponibilidad, capacidad, precios, descuentos) corresponde a las features de reservas y pagos,
fuera de este alcance.

---

## 2. Secciones

| Orden | Sección | Componente | `id` |
| :--- | :--- | :--- | :--- |
| 1 | Header / Navbar | `components/layout/Header.tsx` | — |
| 2 | Hero | `features/landing/components/Hero.tsx` | — |
| 3 | Piscinas | `features/landing/components/Pools.tsx` | `piscinas` |
| 4 | Otras instalaciones | `features/landing/components/Facilities.tsx` | `instalaciones` |
| 5 | Ubicación | `features/landing/components/Location.tsx` | `ubicacion` |
| 6 | CTA de reserva | `features/landing/components/CTA.tsx` | `reservas` |
| 7 | Footer | `components/layout/Footer.tsx` | — |

`src/app/page.tsx` solo ensambla las secciones en orden.

### CTA de reserva

La sección `#reservas` es informativa: explica cómo inicia el proceso de reserva y dirige al
concierge por teléfono. **No** enluta a rutas de autenticación o reservas porque esas rutas aún no
existen en el repositorio. Cuando se creen (`/login`, `/reservas`), basta con cambiar el `href` del
`ButtonLink` en `CTA.tsx`.

---

## 3. Grid de piscinas

`Pools.tsx` usa el grid responsive requerido:

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
```

| Breakpoint | Columnas |
| :--- | :--- |
| Móvil (< 768px) | 1 |
| Tablet (768px – 1023px) | 2 |
| Escritorio (≥ 1024px) | 3 |

Las imágenes se muestran con `next/image` (`fill`, `object-cover`, `sizes` por breakpoint).

El grid contiene tres tarjetas: las dos de la zona acuática (piscinas de adultos 1, 2 y 3, y
piscina infantil) y una tarjeta informativa con los datos de la zona. El mismo grid de 3 columnas
se usa en la sección de otras instalaciones.

---

## 4. Sistema visual

Los tokens viven en `@theme` (`src/app/globals.css`) y se usan como utilidades de Tailwind:

| Token | Uso |
| :--- | :--- |
| `club-bg` | Fondo de la página y de secciones alternas |
| `club-surface` | Tarjetas, superficies y panel del menú móvil |
| `club-primary` | Acento lima: títulos destacados, iconos y botón primario |
| `club-accent` | Fondo oscuro para CTA, footer y panel informativo |
| `text-main` / `text-muted` | Texto principal y secundario |
| `brand-blue` / `brand-yellow` | Detalles de iconografía en las tarjetas |

Convenciones:

* **Tipografía**: `font-black uppercase` en títulos, `font-bold uppercase tracking-wider` en
  botones y etiquetas, texto normal en párrafos.
* **Superficies**: `rounded-3xl` en tarjetas, `rounded-xl` en bloques secundarios, `rounded-full`
  en chips.
* **Espaciado**: secciones `py-16 sm:py-20 lg:py-24`, contenido con `max-w-7xl` y `px-4 sm:px-6 lg:px-8`.
* **Estados**: hover de color en enlaces y botones, `focus-visible` con anillo `club-primary`.
* **Transiciones**: solo `transition-colors` y el zoom de imagen en las tarjetas (`group-hover:scale-105`).
  Sin animaciones complejas ni librerías de animación.

Primitivas reutilizables en `src/components/ui/`:

* `Button`: botón nativo con variantes `primary`, `dark`, `light` y tamaños `sm`, `md`, `lg`.
* `ButtonLink`: mismo estilo visual aplicado a enlaces (`#ancla`, `tel:`, `mailto:`, URLs externas).
* `Card`: superficie de tarjeta con tonos `light` (por defecto) y `dark`.
* `Section` / `SectionHeader`: contenedor de sección con `scroll-mt-20` (compensa el header fijo) y
  encabezado con eyebrow, título y descripción.

Los componentes de la landing viven en `features/landing/components/` porque son específicos de
esta feature. `FacilityCard` es la única tarjeta de escenario y la comparten `Pools` y
`Facilities`.

---

## 5. Responsive

| Elemento | Mobile | Tablet | Desktop |
| :--- | :--- | :--- | :--- |
| Navbar | Marca + CTA + botón de menú | Menú de enlaces visible | Menú de enlaces visible |
| Hero | Columna única, botones apilados | Columna única, botones en fila | Columna única, botones en fila |
| Grids | 1 columna | 2 columnas | 3 columnas |
| Cards | Imagen + contenido apilado | Ídem | Ídem |
| Ubicación | Contacto y mapa apilados | Ídem | 2 columnas |
| Footer | 1 columna | 3 columnas | 3 columnas |

El menú móvil es el único estado interactivo de la página (`useState` en `Header.tsx`). Se cierra al
navegar a una sección.

---

## 6. Inventario de archivos

| Operación | Archivo |
| :--- | :--- |
| Modificado | `src/app/page.tsx` |
| Modificado | `src/app/layout.tsx` (idioma y metadata en español) |
| Modificado | `src/app/globals.css` |
| Modificado | `src/components/layout/Header.tsx` |
| Modificado | `src/components/layout/Footer.tsx` |
| Nuevo | `src/components/ui/Button.tsx` |
| Nuevo | `src/components/ui/Card.tsx` |
| Nuevo | `src/components/ui/Section.tsx` |
| Nuevo | `src/features/landing/data/facilities.ts` |
| Nuevo | `src/features/landing/components/FacilityCard.tsx` |
| Modificado | `src/features/landing/types.ts` |
| Modificado | `src/features/landing/components/Hero.tsx` |
| Nuevo | `src/features/landing/components/Pools.tsx` |
| Nuevo | `src/features/landing/components/Facilities.tsx` |
| Nuevo | `src/features/landing/components/Location.tsx` |
| Nuevo | `src/features/landing/components/CTA.tsx` |

Código eliminado en el refactor anterior y que **no** debe volver a la landing:

* `features/landing/components/Cart/*` (carrito de reservas).
* `features/landing/components/FacilitiesSlider.tsx` (carrusel con modal de compra y calculadora de
  precios).
* `features/landing/components/LocationSection.tsx` (duplicado de `Location.tsx`).
* `components/ui/Badge.tsx` (sin uso tras unificar la tarjeta de escenario).

La dependencia `framer-motion` se eliminó del `package.json`: solo la usaba el carrito y el modal de
compra que ya no existen. Si otra funcionalidad la necesita, debe volver a instalarse de forma
explícita.

---

## 7. Verificación

```bash
npx tsc --noEmit   # sin errores de tipos
npm run lint       # sin errores (1 warning preexistente en src/middleware.ts)
npm run build      # "/" prerenderizado como contenido estático
```

Notas:

* Las imágenes viven en `public/` y se sirven con `next/image`; los archivos originales son JPEG de
  ~3,5 MB y Next los optimiza por solicitud.
* El mapa es un `iframe` de Google Maps con `loading="lazy"` y enlace externo para abrir la
  ubicación.