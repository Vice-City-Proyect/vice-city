---
name: vice-city-api-contracts
description: Use this skill when designing, implementing, or reviewing Next.js Route Handlers (API endpoints), Zod validation schemas, and Swagger/OpenAPI 3.0 contracts.
---

# Vice City — API Contracts & Swagger Standards

## Purpose
Standardize request validation, error handling, HTTP response envelopes, and Swagger documentation across all endpoints.

## 1. Request Handling Standard (`route.ts`)
Every API endpoint must follow this defensive template:
```ts
import { NextRequest, NextResponse } from "next/server";
import { featureSchema } from "@/features/<feature>/schemas/<name>.schema";
import { executeFeatureService } from "@/features/<feature>/services/<name>.service";
import { DomainError } from "@/features/<feature>/errors/<feature>.errors";

const strictSchema = featureSchema.strict();

export async function POST(request: NextRequest) {
  try {
    // 1. Content-Type validation
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "INVALID_CONTENT_TYPE", message: "El encabezado Content-Type debe ser application/json" },
        { status: 400 }
      );
    }

    // 2. Safe JSON parse
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "MALFORMED_JSON", message: "El cuerpo de la solicitud no es un JSON válido o está vacío" },
        { status: 400 }
      );
    }

    // 3. Object type guard
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "INVALID_BODY", message: "El cuerpo de la solicitud debe ser un objeto JSON" },
        { status: 400 }
      );
    }

    // 4. Strict Zod validation
    const result = strictSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Datos de entrada inválidos",
          details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
        },
        { status: 400 }
      );
    }

    // 5. Delegate to service
    const data = await executeFeatureService(result.data);

    return NextResponse.json(
      { success: true, message: "Operación exitosa", data },
      { status: 200 } // or 201 Created
    );
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[API_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: "Ocurrió un error interno en el servidor" },
      { status: 500 }
    );
  }
}
```

## 2. Standard JSON Response Envelope
- **Success:**
  `{ "success": true, "message": "...", "data": { ... } }`
- **Error:**
  `{ "success": false, "error": "ERROR_CODE", "message": "...", "details": [ ... ] }`

## 3. Swagger / OpenAPI 3.0 Documentation
- For every endpoint, create or update a file in `docs/swagger/<feature>.swagger.json`.
- Follow OpenAPI 3.0.3 specification.
- Document all possible responses: 200/201, 400, 401, 403, 404, 409, 500.
