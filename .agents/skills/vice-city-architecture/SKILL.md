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
## Dev Stack 
  - Next.js App Router
  - TypeScript
  - Prisma 6
  - PostgreSQL / Supabase
  - Zod
  - Arquitectura por capas
  - Arquitectura modular por Feature
  - Swagger / OpenAPI 3.0

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
