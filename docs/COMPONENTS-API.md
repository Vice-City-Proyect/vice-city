# API de Componentes - Vice City

Guía rápida para usar componentes UI desde el frontend.

## UI Components

### Button
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="md" onClick={() => {}}>
  Texto
</Button>
```
- `variant`: 'primary' (verde), 'dark' (negro), 'light' (blanco outline) - default: 'primary'
- `size`: 'sm' | 'md' | 'lg' - default: 'md'
- Acepta props nativos de `<button>`

### ButtonLink
```tsx
import { ButtonLink } from '@/components/ui/Button';

<ButtonLink href="#reservas" variant="primary" size="lg">
  Reservar
</ButtonLink>

<ButtonLink href="https://..." variant="light"> <!-- externo -->
  Ir a sitio
</ButtonLink>
```
- Enlaces externos detectados automáticamente (`target="_blank" rel="noopener noreferrer"`)
- Mismo `variant`/`size` que Button

### Card
```tsx
import { Card } from '@/components/ui/Card';

<Card tone="light" className="p-6">
  contenido
</Card>
```
- `tone`: 'light' (blanco) | 'dark' (negro) - default: 'light'
- Redondeado `rounded-3xl`, sombra `shadow-xs`, borde

### Section
```tsx
import { Section } from '@/components/ui/Section';

<Section id="piscinas" className="bg-club-surface/50">
  ...
</Section>
```
- `id`: opcional (para anclas)
- `scroll-mt-20`: compensación para header fijo
- Contenedor interno `max-w-7xl px-4 sm:px-6 lg:px-8`

### SectionHeader
```tsx
import { SectionHeader } from '@/components/ui/Section';

<SectionHeader
  eyebrow="Zona acuática"
  title="Nuestras"
  highlightedTitle="piscinas"
  description="Descripción"
/>
```
- `highlightedTitle`: opcional, aplica color `club-primary`

## Layout Components

### Header
```tsx
import { Header } from '@/components/layout/Header';
```
- Componente cliente (`'use client'`) - gestiona estado del menú móvil
- Fijo en top, con blur. Navegación: #piscinas, #instalaciones, #ubicacion
- CTA: #reservas

### Footer
```tsx
import { Footer } from '@/components/layout/Footer';
```
- Estático. Muestra info de contacto, horario, navegación.

## Landing Feature

### Tipos
```tsx
import type { Facility } from '@/features/landing/types';
```

### Datos
```tsx
import { COMPLEX_HOURS, POOLS, FACILITIES } from '@/features/landing/data/facilities';
```

### Componentes
```tsx
import { Hero } from '@/features/landing/components/Hero';
import { Pools } from '@/features/landing/components/Pools';
import { Facilities } from '@/features/landing/components/Facilities';
import { FacilityCard } from '@/features/landing/components/FacilityCard';
import { Location } from '@/features/landing/components/Location';
import { CTA } from '@/features/landing/components/CTA';
```

## Colores (Tailwind v4)
Claves disponibles: `club-bg`, `club-surface`, `club-primary`, `club-primary-hover`, `club-accent`, `text-main`, `text-muted`, `btn-text`, `brand-blue`, `brand-blue-light`, `brand-yellow`, `brand-green-dark`

Ejemplo: `text-club-primary`, `bg-club-accent`
