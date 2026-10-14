import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashAdminPassword, ensureAdminUser } from "../../scripts/seed-admin-core.mjs";

function fakePrisma({ existing = null, hashRows = [{ hash: "$2a$10$hash-de-pgcrypto" }], failExtension = false } = {}) {
  const calls = { create: [], findFirst: 0, update: 0 };
  return {
    calls,
    $executeRawUnsafe: async () => {
      if (failExtension) throw new Error("permission denied to create extension");
    },
    $queryRawUnsafe: async () => hashRows,
    users: {
      findFirst: async () => {
        calls.findFirst += 1;
        return existing;
      },
      create: async ({ data }) => {
        calls.create.push(data);
        return { id: "nuevo-id" };
      },
      update: async () => {
        calls.update += 1;
      },
    },
  };
}

describe("VCP-86: seed de administrador (hash y usuario existente)", () => {
  test("administrador existente: no crea otro ni modifica su contraseña", async () => {
    const prisma = fakePrisma({ existing: { id: "admin-existente" } });

    const result = await ensureAdminUser(prisma, {
      roleId: "rol-admin",
      email: "admin@vicecity.com",
      fullName: "Administrador Principal",
      passwordHash: "hash-nuevo-que-no-debe-aplicarse",
    });

    assert.deepEqual(result, { userId: "admin-existente", created: false });
    assert.equal(prisma.calls.create.length, 0);
    assert.equal(prisma.calls.update, 0);
  });

  test("administrador inexistente: lo crea activo con el hash recibido", async () => {
    const prisma = fakePrisma({ existing: null });

    const result = await ensureAdminUser(prisma, {
      roleId: "rol-admin",
      email: "admin@vicecity.com",
      fullName: "Administrador Principal",
      passwordHash: "hash-recibido",
    });

    assert.deepEqual(result, { userId: "nuevo-id", created: true });
    assert.equal(prisma.calls.create.length, 1);
    assert.equal(prisma.calls.create[0].password_hash, "hash-recibido");
    assert.equal(prisma.calls.create[0].role_id, "rol-admin");
    assert.equal(prisma.calls.create[0].is_active, true);
  });

  test("hash: usa pgcrypto cuando la base lo permite", async () => {
    const prisma = fakePrisma();
    const hash = await hashAdminPassword(prisma, "Xk9#mQ2$vL7!", async () => {
      throw new Error("no debe cargarse bcryptjs");
    });
    assert.equal(hash, "$2a$10$hash-de-pgcrypto");
  });

  test("hash: si la base restringe CREATE EXTENSION usa el respaldo bcryptjs", async () => {
    const prisma = fakePrisma({ failExtension: true });
    let received = null;
    const hash = await hashAdminPassword(prisma, "Xk9#mQ2$vL7!", async () => ({
      hash: async (plain, rounds) => {
        received = { plain, rounds };
        return "$2a$10$hash-de-bcryptjs";
      },
    }));

    assert.equal(hash, "$2a$10$hash-de-bcryptjs");
    assert.deepEqual(received, { plain: "Xk9#mQ2$vL7!", rounds: 10 });
  });

  test("hash: sin pgcrypto y sin bcryptjs falla con error claro", async () => {
    const prisma = fakePrisma({ failExtension: true });
    await assert.rejects(
      () => hashAdminPassword(prisma, "Xk9#mQ2$vL7!", async () => null),
      /No se pudo generar el hash/
    );
  });
});
