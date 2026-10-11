# Mapa Frontend - Vice City

## Flujo de renderizado Home
1. `src/app/layout.tsx` -> Providers/globales + fonts
2. `src/app/page.tsx` -> Home
   - Header
   - main: Hero → Pools → Facilities → Location → CTA
   - Footer

## Component Tree
```
Home
├── Header (client)
│   ├── Logo + nav links (#piscinas/#instalaciones/#ubicacion)
│   ├── ButtonLink(#reservas)
│   └── Mobile menu (toggle)
├── Hero
│   ├── Background image + overlays
│   ├── CTAs (#piscinas, #instalaciones)
│   └── Info badges (horario, ubicación, descuento)
├── Pools (id="piscinas")
│   ├── SectionHeader
│   ├── FacilityCard × POOLS
│   └── Card oscuro (facts)
├── Facilities (id="instalaciones")
│   ├── SectionHeader
│   └── FacilityCard × FACILITIES
├── Location (id="ubicacion")
│   ├── Contact cards + highlights
│   └── Google Maps iframe + link
├── CTA (id="reservas")
│   ├── CTAs (tel, #piscinas)
│   └── Promotion cards
└── Footer
```

## Dependencias clave
- next/image para imágenes optimizadas
- lucide-react para iconos
- Tailwind v4 con @theme
