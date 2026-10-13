import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../../src/app/api/qr/[code]/route.ts";
import { POST } from "../../src/app/api/qr/[code]/entry/route.ts";

describe("HU13: Route Handlers - Endpoints API /api/qr", () => {
  it("GET /api/qr/[code] responde 401 si no hay sesión activa", async () => {
    const request = new NextRequest("http://localhost:3000/api/qr/ABCDEF123456", {
      method: "GET",
    });
    // Invocado sin sesión válida
    const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF123456" }) });
    const json = await response.json();

    assert.equal(response.status, 401);
    assert.equal(json.success, false);
    assert.equal(json.error, "UNAUTHORIZED");
  });

  it("POST /api/qr/[code]/entry responde 401 si no hay sesión activa", async () => {
    const request = new NextRequest("http://localhost:3000/api/qr/ABCDEF123456/entry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessPoint: "Torniquete 1" }),
    });
    const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF123456" }) });
    const json = await response.json();

    assert.equal(response.status, 401);
    assert.equal(json.success, false);
    assert.equal(json.error, "UNAUTHORIZED");
  });

  it("GET /api/qr/[code] rechaza cabeceras falsificadas x-user-role y responde 401", async () => {
    const request = new NextRequest("http://localhost:3000/api/qr/ABCDEF123456", {
      method: "GET",
      headers: {
        "x-user-role": "QR_VALIDATOR",
        "x-user-id": "fake-validator-id",
      },
    });
    const response = await GET(request, { params: Promise.resolve({ code: "ABCDEF123456" }) });
    const json = await response.json();

    assert.equal(response.status, 401);
    assert.equal(json.success, false);
    assert.equal(json.error, "UNAUTHORIZED");
  });

  it("POST /api/qr/[code]/entry rechaza cabeceras falsificadas x-user-role y responde 401", async () => {
    const request = new NextRequest("http://localhost:3000/api/qr/ABCDEF123456/entry", {
      method: "POST",
      headers: {
        "x-user-role": "QR_VALIDATOR",
        "x-user-id": "fake-validator-id",
        "content-type": "application/json",
      },
    });
    const response = await POST(request, { params: Promise.resolve({ code: "ABCDEF123456" }) });
    const json = await response.json();

    assert.equal(response.status, 401);
    assert.equal(json.success, false);
    assert.equal(json.error, "UNAUTHORIZED");
  });
});
