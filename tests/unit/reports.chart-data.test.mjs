import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasChartData,
  describeMetricsError,
} from "../../src/features/reports/utils/chart-data.ts";
import { REVENUE_PERIODS } from "../../src/features/reports/constants.ts";

describe("HU32: utilidades de presentación de métricas", () => {
  describe("hasChartData", () => {
    it("false para una serie vacía, nula o indefinida", () => {
      assert.equal(hasChartData([]), false);
      assert.equal(hasChartData(null), false);
      assert.equal(hasChartData(undefined), false);
    });

    it("false para un período sin ventas (serie de ceros, no un error)", () => {
      const zeros = ["08:00", "09:00", "10:00"].map((label) => ({ label, value: 0 }));
      assert.equal(hasChartData(zeros), false);
    });

    it("false si los valores no son números finitos", () => {
      assert.equal(hasChartData([{ label: "a", value: Number.NaN }]), false);
      assert.equal(hasChartData([{ label: "a", value: Number.POSITIVE_INFINITY }]), false);
    });

    it("true en cuanto hay al menos un valor positivo", () => {
      assert.equal(
        hasChartData([
          { label: "08:00", value: 0 },
          { label: "09:00", value: 56000 },
        ]),
        true
      );
    });
  });

  describe("describeMetricsError", () => {
    it("da un mensaje específico para 401, 403 y 400", () => {
      assert.match(describeMetricsError(401), /sesión/i);
      assert.match(describeMetricsError(403), /permiso/i);
      assert.match(describeMetricsError(400), /período/i);
    });

    it("da un mensaje genérico para cualquier otro fallo y no expone detalles internos", () => {
      for (const status of [500, 502, 503, null]) {
        const message = describeMetricsError(status);
        assert.match(message, /No se pudieron cargar las métricas/);
        assert.doesNotMatch(message, /prisma|stack|sql|undefined/i);
      }
    });
  });

  describe("filtros de período", () => {
    it("coinciden con los que acepta /api/reports/metrics", () => {
      assert.deepEqual(
        REVENUE_PERIODS.map((p) => p.value),
        ["day", "week", "month", "year"]
      );
    });
  });
});
