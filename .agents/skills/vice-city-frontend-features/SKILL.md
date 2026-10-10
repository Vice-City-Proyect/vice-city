---
name: vice-city-frontend-features
description: Use this skill when building UI components, forms, client views, and animations using React 19, Tailwind CSS v4, and Framer Motion.
---

# Vice City — Frontend Feature Guidelines

## Purpose
Structure frontend code according to feature-first architecture, maintaining consistency with Tailwind CSS v4 and React 19 App Router.

## Component Organization
- **Feature components:** `src/features/<feature>/components/` (e.g., `ReservationCalendar.tsx`, `TicketCard.tsx`).
- **Reusable generic UI:** `src/components/ui/` (e.g., `Button.tsx`, `Modal.tsx`, `Input.tsx`).
- **Layouts & Navigation:** `src/components/layout/` (e.g., `Navbar.tsx`, `Footer.tsx`).
- **Pages & Routes:** `src/app/(public)/`, `src/app/client/`, `src/app/employee/`, `src/app/admin/`.

## Server vs. Client Components
- Keep components as **Server Components** by default for fast rendering and zero JS bundle overhead.
- Use `'use client'` ONLY when:
  - Using React hooks (`useState`, `useEffect`, `useActionState`).
  - Handling user interactions (form submissions, clicks, input changes).
  - Integrating client-side libraries like `framer-motion`.

## Form Handling & Validation
- Share the same Zod schema defined in `src/features/<feature>/schemas/` on the client side.
- Display field-specific validation errors inline beneath inputs.
- Show clear loading and disabled states on submit buttons during pending requests.
- Use Tailwind CSS v4 classes for responsive styling (mobile-first for client booking and POS screens).
