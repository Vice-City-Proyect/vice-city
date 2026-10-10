---
name: vice-city-testing
description: Use this skill when writing, running, or debugging unit and integration tests for API route handlers and business services.
---

# Vice City — Automated Testing Standards

## Purpose
Ensure code stability and prevent regression through automated unit tests for routes and services.

## Test Runner Setup
- Built on Node.js Native Test Runner (`node:test`, `node:assert/strict`).
- Executed via `tsx` (TypeScript Execute).
- **Run command:**
  ```bash
  npm test
  # or
  npm run test:unit
  ```
- Tests are stored in `tests/unit/*.test.mjs`.

## Route Testing Pattern (`*.route.test.mjs`)
Test route handlers by invoking the exported HTTP functions (`POST`, `GET`, `PUT`, `DELETE`) with synthetic `NextRequest` objects:
```js
import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/<feature>/route.ts";

describe("HUxx: API Route Test", () => {
  function createRequest(body, contentType = "application/json") {
    const headers = new Headers();
    if (contentType) headers.set("content-type", contentType);
    return new NextRequest("http://localhost:3000/api/<feature>", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  test("Criterio: Falla 400 si falta Content-Type", async () => {
    const req = createRequest({}, "text/plain");
    const res = await POST(req);
    assert.equal(res.status, 400);
  });

  test("Criterio: Falla 400 con cuerpo vacío o malformado", async () => {
    const req = createRequest("", "application/json");
    const res = await POST(req);
    assert.equal(res.status, 400);
  });
});
```

## Service Testing Pattern (`*.service.test.mjs`)
- Test business validations, error throwing, and edge cases.
- Pass a mock database object or mock Prisma functions to avoid modifying production data during unit tests.
