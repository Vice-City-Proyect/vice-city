---

name: vice-city-architecture
description: Use this skill when creating, modifying, reviewing, or organizing code within the Vice City project architecture.
------------------------------------------------------------------------------------------------------------------------------

# Vice City Architecture

## Purpose

Maintain a consistent and organized architecture throughout the Vice City project.

Before creating or modifying code, identify which part of the architecture the change belongs to.

## Main Structure

```text
src/
├── app/
├── features/
├── components/
├── services/
├── lib/
├── types/
└── middleware.ts
```

## `src/app`

Contains Next.js routes and pages.

API endpoints are located inside:

```text
src/app/api/
```

API route handlers should coordinate requests and responses.

Business logic should not be placed entirely inside `route.ts`.

## `src/features`

Organizes the application by functionality.

Examples:

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

Feature-specific components, hooks, types, validations, and utilities should remain inside their corresponding feature when appropriate.

## `src/components`

Contains globally reusable components.

Examples:

```text
components/
├── ui/
├── layout/
└── common/
```

Do not place feature-specific components here.

## `src/services`

Contains reusable business logic and application services.

Examples include:

* availability
* capacity validation
* pricing
* discounts
* reservation creation
* payment operations
* business validations

## `src/lib`

Contains shared technical utilities and configuration.

Do not use this directory as a replacement for `features` or `services`.

## `src/types`

Contains types shared across different parts of the application.

Types that are specific to one feature should remain inside that feature when appropriate.

## Before Creating Files

Before creating a new file:

1. Check whether a similar implementation already exists.
2. Identify which feature or responsibility it belongs to.
3. Place it in the appropriate directory.
4. Avoid duplicating existing logic.
5. Follow the existing project conventions.

## Important Rules

* Respect the existing architecture.
* Do not introduce new architectural patterns without justification.
* Do not move files unnecessarily.
* Do not duplicate business logic.
* Keep responsibilities separated.
* Prefer reusing existing components and services.
* Keep changes focused on the requested task.

## Frozen Dependencies Policy (Strict for AI Agents)

Las dependencias del proyecto están estrictamente **CONGELADAS** y protegidas:

1. **Uso Exclusivo de `npm ci`:**
   * Es **OBLIGATORIO** usar `npm ci` para instalar dependencias.
   * Está **TERMINANTEMENTE PROHIBIDO** usar `npm install` o `npm i`. El script de preinstalación y el CI rechazarán cualquier intento.
2. **Prohibición de Nuevas Dependencias:**
   * Los agentes de IA **NO deben instalar ninguna dependencia** que no esté registrada en `package-lock.json`.
   * Si una tarea parece requerir una nueva librería externa, el agente **DEBE CONSULTAR PRIMERO AL USUARIO** y obtener autorización explícita antes de proponer cualquier cambio.
3. **Sin Actualizaciones Automáticas (Versiones Exactas / Pinned):**
   * Ninguna dependencia debe usar prefijos de rango flotante (`^` o `~`). Todas las versiones en `package.json` son **fijas y exactas**.
   * No se permiten actualizaciones automáticas de dependencias ni cambios silenciosos en versiones menores/parches.
4. **Protección de Archivos Clave:**
   * Los archivos `package.json`, `package-lock.json`, `.npmrc` y `prisma/schema.prisma` están blindados y protegidos por CI/CD.
   * Cualquier alteración no autorizada del `package-lock.json` romperá el pipeline de CI/CD (`git diff --exit-code package.json package-lock.json`).

