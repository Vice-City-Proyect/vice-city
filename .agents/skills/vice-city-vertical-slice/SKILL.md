---
name: vice-city-vertical-slice
description: Use this skill when implementing a User Story (HU) end-to-end, developing database queries, business logic, API endpoints, UI, tests, and Swagger documentation simultaneously.
---

# Vice City — Vertical Slice Development Workflow

## Purpose
Guide the end-to-end implementation of User Stories (HUs) as single, cohesive vertical features.
Avoid fragmentation into isolated layer branches (ORM, Business, API). All layers of a feature are developed together in a single branch and Pull Request.

## Branch & PR Conventions
- **Branch naming:** `feature/HU<number>-<short-description>` (e.g., `feature/HU04-creacion-reservas`).
- **PR Scope:** 1 HU = 1 Pull Request containing data access, domain logic, route handler, UI components, tests, and Swagger docs.

## Implementation Order per HU (The Vertical Pipeline)
When assigned an HU, execute these steps sequentially within the same context:

### 1. Data Layer (Prisma)
- Verify if models already exist in `prisma/schema.prisma`.
- If new tables or columns are needed in Supabase: run `npm run db:pull` and `npm run db:generate`.
- Never modify generated Prisma files manually. Use `prisma` client from `@/lib/prisma`.

### 2. Domain & Validation Layer (Feature)
- Define input/output DTOs in `src/features/<feature>/types/`.
- Create strict Zod validation schemas in `src/features/<feature>/schemas/<name>.schema.ts` using `.strict()`.
- Create custom domain error classes in `src/features/<feature>/errors/<feature>.errors.ts`.
- Implement business logic in `src/features/<feature>/services/<name>.service.ts`.
- Check business rules in `vice-city-business-rules` (discounts, schedules, hold times, capacities).

### 3. API Transport Layer (Route Handlers)
- Expose endpoint in `src/app/api/<feature>/route.ts` (or subpaths).
- Validate `Content-Type: application/json` and malformed bodies.
- Parse payload with the Zod schema (`safeParse`).
- Delegate execution immediately to the feature service.
- Return standardized JSON response with semantic HTTP status codes.

### 4. UI Layer (React 19 / Tailwind v4)
- Place feature-specific UI in `src/features/<feature>/components/`.
- Connect forms to the same Zod schema used in the backend for client-side validation.
- Implement server or client components appropriately (`'use client'` only when state/events are needed).
- Mount the view in `src/app/(public)/`, `src/app/client/`, `src/app/employee/` or `src/app/admin/`.

### 5. Automated Tests & API Docs
- Write unit tests in `tests/unit/<name>.route.test.mjs` and `<name>.service.test.mjs`.
- Run `npm test` and ensure 100% pass rate.
- Create or update the Swagger contract in `docs/swagger/<feature>.swagger.json`.
- Document PR in `docs/PULL_REQUEST_<HU>.md`.

## Definition of Done (DoD)
An HU is considered complete only when:
1. Business logic respects all rules in `vice-city-business-rules`.
2. All happy paths and edge cases have passing tests in `tests/unit/`.
3. The API endpoint strictly validates payloads and returns standardized JSON.
4. The Swagger JSON contract is documented and valid OpenAPI 3.0.
5. No TypeScript or linting errors exist (`npm run lint`).
