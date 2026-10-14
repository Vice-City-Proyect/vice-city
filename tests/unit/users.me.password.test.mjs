process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-characters-long!!";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

const { PATCH } = await import("../../src/app/api/users/me/password/route.ts");
const { hashPassword, comparePassword } = await import("../../src/lib/password.ts");
const { isRouteAllowed } = await import("../../src/features/auth/permissions/route-permissions.ts");

const URL_ME_PASSWORD = "http://localhost:3000/api/users/me/password";

function patchRequest(body) {
  return new NextRequest(new URL(URL_ME_PASSWORD), {
    method: "PATCH",
    headers: new Headers({ "content-type": "application/json" }),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function createMockDb(passwordHash) {
  const store = new Map([
    ["usr_1", { id: "usr_1", password_hash: passwordHash }],
    ["usr_google", { id: "usr_google", password_hash: null }],
  ]);
  return {
    store,
    users: {
      async findUnique({ where }) {
        return store.get(where.id) ?? null;
      },
      async update({ where, data }) {
        const updated = { ...store.get(where.id), ...data };
        store.set(where.id, updated);
        return { id: updated.id };
      },
    },
  };
}

const SESSION = { user: { id: "usr_1", role: "CLIENT", email: "a@example.com" } };

describe("HU28 — PATCH /api/users/me/password (cambio de contraseña)", () => {
  test("1. sin sesión devuelve 401", async () => {
    const db = await createMockDb(await hashPassword("ClaveActual1"));
    const res = await PATCH(
      patchRequest({ current_password: "ClaveActual1", new_password: "ClaveNueva22" }),
      { sessionOverride: null, prismaOverride: db }
    );
    assert.equal(res.status, 401);
  });

  test("2. JSON malformado devuelve 400", async () => {
    const db = await createMockDb(await hashPassword("ClaveActual1"));
    const res = await PATCH(patchRequest("{no-es-json"), {
      sessionOverride: SESSION,
      prismaOverride: db,
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "MALFORMED_JSON");
  });

  test("3. rechaza una nueva contraseña corta o igual a la actual", async () => {
    const db = await createMockDb(await hashPassword("ClaveActual1"));
    const short = await PATCH(
      patchRequest({ current_password: "ClaveActual1", new_password: "corta" }),
      { sessionOverride: SESSION, prismaOverride: db }
    );
    assert.equal(short.status, 400);
    assert.equal((await short.json()).error, "VALIDATION_ERROR");

    const same = await PATCH(
      patchRequest({ current_password: "ClaveActual1", new_password: "ClaveActual1" }),
      { sessionOverride: SESSION, prismaOverride: db }
    );
    assert.equal(same.status, 400);
    assert.equal((await same.json()).error, "VALIDATION_ERROR");
  });

  test("4. rechaza campos desconocidos (esquema estricto)", async () => {
    const db = await createMockDb(await hashPassword("ClaveActual1"));
    const res = await PATCH(
      patchRequest({
        current_password: "ClaveActual1",
        new_password: "ClaveNueva22",
        role: "ADMIN",
      }),
      { sessionOverride: SESSION, prismaOverride: db }
    );
    assert.equal(res.status, 400);
  });

  test("5. contraseña actual incorrecta devuelve 400 y no modifica el hash", async () => {
    const original = await hashPassword("ClaveActual1");
    const db = await createMockDb(original);
    const res = await PATCH(
      patchRequest({ current_password: "Equivocada99", new_password: "ClaveNueva22" }),
      { sessionOverride: SESSION, prismaOverride: db }
    );
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "INVALID_CURRENT_PASSWORD");
    assert.equal(db.store.get("usr_1").password_hash, original);
  });

  test("6. cuenta solo con Google (sin contraseña local) devuelve PASSWORD_NOT_SET", async () => {
    const db = await createMockDb(await hashPassword("ClaveActual1"));
    const res = await PATCH(
      patchRequest({ current_password: "ClaveActual1", new_password: "ClaveNueva22" }),
      { sessionOverride: { user: { id: "usr_google", role: "CLIENT" } }, prismaOverride: db }
    );
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "PASSWORD_NOT_SET");
  });

  test("7. cambio correcto guarda un hash bcrypt nuevo (nunca el texto plano)", async () => {
    const db = await createMockDb(await hashPassword("ClaveActual1"));
    const res = await PATCH(
      patchRequest({ current_password: "ClaveActual1", new_password: "ClaveNueva22" }),
      { sessionOverride: SESSION, prismaOverride: db }
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data, undefined);

    const stored = db.store.get("usr_1").password_hash;
    assert.notEqual(stored, "ClaveNueva22");
    assert.equal(await comparePassword("ClaveNueva22", stored), true);
    assert.equal(await comparePassword("ClaveActual1", stored), false);
  });

  test("8. si la BD falla devuelve 500 con mensaje claro", async () => {
    const db = {
      users: {
        async findUnique() {
          throw new Error("db down");
        },
      },
    };
    const res = await PATCH(
      patchRequest({ current_password: "ClaveActual1", new_password: "ClaveNueva22" }),
      { sessionOverride: SESSION, prismaOverride: db }
    );
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, "INTERNAL_SERVER_ERROR");
  });

  test("9. el middleware permite la ruta a los cuatro roles y la niega sin rol", () => {
    for (const role of ["ADMIN", "CLIENT", "TICKET_SELLER", "QR_VALIDATOR"]) {
      assert.equal(isRouteAllowed(role, "/api/users/me/password"), true, role);
    }
    assert.equal(isRouteAllowed(null, "/api/users/me/password"), false);
    assert.equal(isRouteAllowed("INTRUSO", "/api/users/me/password"), false);
  });
});
