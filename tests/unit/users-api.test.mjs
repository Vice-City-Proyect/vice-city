import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  fetchAdminUsers,
  fetchAllAdminUsers,
  MAX_ADMIN_USERS_PAGES,
} from "../../src/features/users/api/users.api.ts";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function userPage(page, totalPages) {
  return {
    success: true,
    data: {
      users: page === 1 ? [{ id: `u1`, email: "a@a.com", full_name: "A" }] : [],
      pagination: { total: totalPages, page, limit: 100, totalPages },
    },
  };
}

const REAL_FETCH = globalThis.fetch;
const REAL_WARN = console.warn;

function stubWarn() {
  const calls = [];
  console.warn = (...args) => calls.push(args);
  return calls;
}

afterEach(() => {
  globalThis.fetch = REAL_FETCH;
  console.warn = REAL_WARN;
});

describe("users.api: fetchAdminUsers construye la query", () => {
  test("Incluye page, limit, search y role en la URL", async () => {
    let requestedUrl;
    globalThis.fetch = async (url) => {
      requestedUrl = String(url);
      return jsonResponse({
        success: true,
        data: { users: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 0 } },
      });
    };

    await fetchAdminUsers({ page: 1, limit: 100, search: "ana", role: "CLIENT" });

    const url = new URL(requestedUrl, "http://localhost:3000");
    assert.equal(url.searchParams.get("page"), "1");
    assert.equal(url.searchParams.get("limit"), "100");
    assert.equal(url.searchParams.get("search"), "ana");
    assert.equal(url.searchParams.get("role"), "CLIENT");
  });
});

describe("users.api: fetchAllAdminUsers (límite defensivo)", () => {
  test("Agrupa todas las páginas del backend", async () => {
    globalThis.fetch = async (url) => {
      const page = new URL(String(url), "http://localhost:3000").searchParams.get("page") ?? "1";
      if (page === "1") {
        return jsonResponse({
          success: true,
          data: {
            users: [
              { id: "a", email: "a@a.com", full_name: "A" },
              { id: "b", email: "b@b.com", full_name: "B" },
            ],
            pagination: { total: 2, page: 1, limit: 100, totalPages: 1 },
          },
        });
      }
      throw new Error("no debería paginarse");
    };

    const users = await fetchAllAdminUsers();
    assert.equal(users.length, 2);
  });

  test("Advierte en consola cuando se supera el tope de páginas (BAJO-4)", async () => {
    globalThis.fetch = async (url) => {
      const page = Number(
        new URL(String(url), "http://localhost:3000").searchParams.get("page") ?? 1
      );
      return jsonResponse(userPage(page, MAX_ADMIN_USERS_PAGES + 1));
    };

    const warnings = stubWarn();
    const users = await fetchAllAdminUsers();

    assert.equal(users.length, 1);
    assert.equal(users[0].id, "u1");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0][0], /supera el tope defensivo/);
  });

  test("No advierte cuando el listado cabe en el tope", async () => {
    globalThis.fetch = async (url) => {
      const page = Number(
        new URL(String(url), "http://localhost:3000").searchParams.get("page") ?? 1
      );
      return jsonResponse(userPage(page, 1));
    };

    const warnings = stubWarn();
    const users = await fetchAllAdminUsers();

    assert.equal(users.length, 1);
    assert.equal(warnings.length, 0);
  });
});