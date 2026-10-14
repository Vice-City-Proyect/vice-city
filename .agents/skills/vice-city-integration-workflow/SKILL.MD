---
name: vice-city-integration-workflow
description: Integrate the Vice City Next.js frontend with its backend APIs, ensuring correct data flow, authentication, error handling, testing, and adherence to project architecture and business rules.
---

# Vice City — Frontend/Backend Integration Workflow

## 1. Objective

Connect the existing frontend and backend of Vice City into a functional application. Ensure that user interfaces consume real backend services correctly, preserve the established architecture, and handle successful and unsuccessful operations reliably.

## 2. Mandatory instructions

Before making changes:

1. Read the root `AGENTS.md`.
2. Read the existing skills:
   - `vice-city-architecture`
   - `vice-city-business-rules`
   - `vice-city-backend-workflow`
   - `vice-city-testing-workflow`
3. Inspect the existing frontend, API routes, services, types, authentication mechanisms, and tests.
4. Read the assigned Jira task and its acceptance criteria.

**Work exclusively on the assigned task.** Do not implement unrelated features, redesign interfaces, modify unrelated files, or change business rules without authorization.

## 3. Integration principles

- Reuse existing components, API routes, services, types, and utilities.
- Follow the established Next.js and TypeScript architecture.
- Never invent endpoints, request formats, response structures, or authentication mechanisms.
- Verify the actual backend contract before connecting the frontend.
- If an endpoint or required functionality is missing, document the gap and implement it only if the assigned task authorizes it.
- Avoid duplicated business logic between frontend and backend.
- The backend remains authoritative for prices, availability, permissions, discounts, reservations, payments, and other business rules.
- Do not introduce dependencies, architectural patterns, or database technologies without justification and authorization.

## 4. Integration workflow

### Step 1 — Inspect

Identify the frontend screens, required data, backend endpoints, request parameters, response types, authentication requirements, and expected behavior.

### Step 2 — Verify API contracts

Confirm HTTP methods, URLs, payloads, response formats, status codes, and error structures from the actual implementation or documented contract.

If frontend and backend disagree, identify the discrepancy before changing either side.

### Step 3 — Connect the frontend

- Replace mock data with real API calls when the corresponding endpoint is available.
- Reuse the project's existing API client and service conventions.
- Create or update TypeScript types to reflect actual API contracts.
- Keep network requests and data-access logic separate from presentation components when consistent with the existing architecture.
- Use environment variables for configurable API URLs.
- Never expose secrets, private credentials, payment secret keys, or server-only configuration in client code.

### Step 4 — Handle application states

Implement the necessary behavior for:

- Loading.
- Successful responses.
- Empty results.
- Validation errors.
- Unauthorized or forbidden requests.
- Missing resources.
- Server errors.
- Network failures.

Display understandable feedback using the existing UI components and design system. Prevent duplicate submissions where relevant.

### Step 5 — Authentication and permissions

Follow the authentication implementation already established in the project.

Preserve protected routes, sessions, cookies, token handling, and role-based access. Never rely exclusively on frontend checks to enforce permissions; the backend must validate authorization.

### Step 6 — Respect business rules

Follow `vice-city-business-rules` for reservations, availability, capacity, payment holds, discounts, QR validation, POS operations, and administrative functions.

Do not calculate authoritative prices, confirm payments, authorize entry, or determine reservation availability solely in the frontend.

Stripe secret operations and payment webhook verification must remain server-side.

### Step 7 — Test the integration

Verify:

- Correct API requests and payloads.
- Response handling and type consistency.
- Loading, empty, success, and error states.
- Authentication and permissions.
- Validation and edge cases.
- Relevant existing tests and regressions.

Add or update tests appropriate to the assigned task. Never claim a test passed without executing it and observing the result.

## 5. Integration priorities

When authorized by the backlog, follow this order:

1. Landing and service catalog.
2. Service details and availability.
3. Reservations and temporary payment holds.
4. Payments and payment confirmation.
5. Digital tickets and QR validation.
6. Employee POS.
7. Administration and service management.
8. Dashboard and reports.

The assigned Jira priority and dependencies take precedence over this suggested order.

## 6. Documentation and delivery

Update the relevant Jira task, API documentation, types, or project documentation when the changes require it.

Before finishing:

- Summarize the files and integrations changed.
- Identify the endpoints connected.
- Describe the tests executed and their actual results.
- Document unresolved dependencies, missing endpoints, or blockers.
- Confirm which acceptance criteria are satisfied and which remain pending.

Do not mark a task complete if required integration behavior or acceptance criteria remain unverified.

## 7. Final response format

Report:

**Status:** Completed / Partially completed / Blocked.

**Frontend connected:** Screens or features integrated.

**Backend endpoints:** Methods and routes used.

**Tests:** Executed checks and observed results.

**Documentation:** Files updated.

**Pending issues:** Remaining blockers or acceptance criteria.

**Scope:** Confirm that unrelated functionality was not modified.

The objective is a reliable, maintainable integration that follows Vice City's existing architecture and business rules without introducing unnecessary complexity.