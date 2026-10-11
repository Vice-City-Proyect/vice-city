# Quickstart para Frontend

## Desarrollo
```bash
npm run dev
# http://localhost:3000
```

## Build / Lint
```bash
npm run build
npm run start
npm run lint
```

## Agregar nueva página
Crear archivo en `src/app/<ruta>/page.tsx`
```tsx
export default function Page() {
  return <div>...</div>;
}
```

## Agregar componente reutilizable
- UI genérico: `src/components/ui/`
- Específico de layout: `src/components/layout/`
- Específico de feature: `src/features/<feature>/components/`

## Agregar feature nueva
```text
src/features/<nombre>/
├── components/
├── data/
├── hooks/ (futuro)
├── services/ (futuro)
└── types.ts
```

## Agregar API route (cuando backend)
```text
src/app/api/<recurso>/route.ts
```
App Router maneja GET/POST/etc exportados.

## Convenciones
- Usar alias `@/`
- Componentes funcionales con TypeScript
- Props tipadas explícitamente
- Clases Tailwind con colores del theme
- No comentar código salvo necesario
- Mantener cambios acotados a lo solicitado
