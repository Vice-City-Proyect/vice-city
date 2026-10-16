import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { formatTimestampDate } = await import("../../src/lib/format.ts");

describe("HU28 — formatTimestampDate (fecha de registro del perfil)", () => {
  test("formatea un timestamp ISO completo sin lanzar error", () => {
    const result = formatTimestampDate("2025-01-15T10:00:00.000Z");
    assert.equal(typeof result, "string");
    assert.match(result, /2025/);
  });

  test("usa la fecha de Bogotá aunque el UTC ya sea el día siguiente", () => {
    // 2025-01-16T02:00Z = 15 de enero 21:00 en Bogotá (UTC-5)
    const result = formatTimestampDate("2025-01-16T02:00:00.000Z");
    assert.match(result, /15/);
  });

  test("devuelve null para null, vacío o fecha inválida (campo opcional)", () => {
    assert.equal(formatTimestampDate(null), null);
    assert.equal(formatTimestampDate(undefined), null);
    assert.equal(formatTimestampDate(""), null);
    assert.equal(formatTimestampDate("no-es-fecha"), null);
  });
});
