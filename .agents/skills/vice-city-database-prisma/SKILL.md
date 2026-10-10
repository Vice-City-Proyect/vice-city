---
name: vice-city-database-prisma
description: Use this skill when interacting with PostgreSQL via Prisma 6, running database queries, managing transactions, or synchronizing schema with Supabase.
---

# Vice City — Prisma & Database Guidelines

## Purpose
Ensure safe, performant, and consistent interaction with the PostgreSQL database hosted in Supabase.

## Tech Stack Rules
- **Prisma Version:** Must stay on **Prisma 6.x** (`@prisma/client@^6.19.3` and `prisma@^6.19.3`).
- **NEVER upgrade to Prisma 8 RC** (avoids CLI breaking changes and missing `db pull` / `generate`).
- **DO NOT create** `prisma.config.ts`. Prisma 6 uses `prisma/schema.prisma` directly.

## Connection Setup
- Runtime queries (Next.js server): Use `DATABASE_URL` (Transaction Pooler, port 6543, `?pgbouncer=true`).
- DDL / Introspection / Migrations: Use `DIRECT_URL` (Session Pooler, port 5432).
- Always import the client singleton from:
  ```ts
  import { prisma } from "@/lib/prisma";
  ```
- Never instantiate `new PrismaClient()` directly inside routes or services.

## Common Database Commands
```bash
# Introspect tables from Supabase into schema.prisma:
npm run db:pull

# Generate TypeScript client types:
npm run db:generate

# Test DB connection and query roles table:
npm run db:test

# Open visual database studio:
npm run db:studio
```

## Critical Data Operations & Transactions
For multi-table operations (e.g., booking creation + payment hold + ticket issue):
1. **Always use interactive transactions:**
   ```ts
   await prisma.$transaction(async (tx) => {
     const booking = await tx.bookings.create({ ... });
     const payment = await tx.payments.create({ ... });
     return { booking, payment };
   });
   ```
2. **Case-insensitive lookups:**
   For emails and usernames, always use `mode: "insensitive"`.
3. **Respect database soft deletes and statuses:**
   Never hard delete records with foreign key dependencies unless explicitly defined by business rules.
