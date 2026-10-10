---
name: vice-city-auth-permissions
description: Use this skill when managing authentication, sessions with NextAuth, JWT handling, password encryption, or role-based access control (RBAC).
---

# Vice City — Authentication & Permissions (RBAC)

## Purpose
Ensure secure authentication and strict role-based access control matching the Vice City SRS.

## 1. Roles in the System
The application supports 4 official roles defined in database and SRS:
- `ADMIN`: Full administrative access (services, pricing, employees, reports, pos).
- `CLIENT` (customer): Public client making reservations and viewing own tickets.
- `TICKET_SELLER` (staff - Vendedor): Employee selling tickets/reservations via POS.
- `QR_VALIDATOR` (staff - Validador QR): Employee validating tickets and access logs at sports complex entry points.

## 2. Password & Encryption
- Passwords must be hashed using `bcryptjs` with salt rounds = 10 (`@/lib/password`).
- Never return `password_hash` in responses or API payloads.

## 3. Session Management
- NextAuth configuration is located at `src/lib/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`.
- Server-side session retrieval:
  ```ts
  import { getServerSession } from "next-auth";
  import { authOptions } from "@/lib/auth";
  const session = await getServerSession(authOptions);
  ```
- Public session endpoint for clients: `GET /api/auth/session`.

## 4. Route Protection & Middleware
- Global route protection is handled in `src/middleware.ts`.
- Admin routes (`/admin/*`) require role `ADMIN`.
- Employee routes (`/employee/*`) require `TICKET_SELLER`, `QR_VALIDATOR` or `ADMIN`.
- Client dashboard (`/client/*`) requires authenticated session.
