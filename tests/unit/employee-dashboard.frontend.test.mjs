import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fetchEmployeeSummary } from "../../src/features/reservations/api/reservations.api.ts";
import { describeReservationsError } from "../../src/features/reservations/hooks/use-my-reservations.ts";
import { RemoteStatus } from "../../src/features/reservations/components/RemoteStatus.tsx";
import { EmployeeSummary } from "../../src/features/employees/components/EmployeeSummary.tsx";
import { AccessControl } from "../../src/features/employees/components/AccessControl.tsx";
import { ApiError } from "../../src/lib/api-client.ts";
import { toBogotaTime } from "../../src/lib/format.ts";

const SUMMARY = {
  date: "2026-10-20",
  todayReservations: 7,
  expectedVisitors: 41,
  pendingEntry: 5,
  activeServices: 6,
  reservations: [],
};

describe("VCP-93 (empleados): fetchEmployeeSummary", () => {
  const realFetch = globalThis.fetch;
  let requested;

  function stubFetch(status, body) {
    globalThis.fetch = async (url) => {
      requested = url;
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    };
  }

  beforeEach(() => {
    requested = null;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("Consulta /api/employee/summary y entrega el contenido de data", async () => {
    stubFetch(200, { success: true, data: SUMMARY });
    const result = await fetchEmployeeSummary();
    assert.equal(requested, "/api/employee/summary");
    assert.deepEqual(result, SUMMARY);
  });

  test("401 y 403 lanzan ApiError con el código HTTP", async () => {
    for (const status of [401, 403]) {
      stubFetch(status, { success: false, error: "FORBIDDEN", message: "no" });
      await assert.rejects(fetchEmployeeSummary(), (err) => err instanceof ApiError && err.status === status);
    }
  });

  test("Un error de red lanza ApiError con status 0", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    await assert.rejects(fetchEmployeeSummary(), (err) => err instanceof ApiError && err.status === 0);
  });

  test("El mensaje de sesión vencida nombra el panel", () => {
    assert.match(describeReservationsError(new ApiError("x", 401), "ver el panel"), /ver el panel/);
  });
});

describe("VCP-93 (empleados): estados de carga y error", () => {
  const retry = () => {};

  test("Cargando: muestra el aviso y no el error", () => {
    const html = renderToStaticMarkup(
      createElement(RemoteStatus, { loading: true, error: null, onRetry: retry, loadingLabel: "Cargando el resumen" })
    );
    assert.match(html, /role="status"/);
    assert.match(html, /Cargando el resumen/);
    assert.doesNotMatch(html, /Reintentar/);
  });

  test("Error: muestra el mensaje claro y el botón Reintentar", () => {
    const html = renderToStaticMarkup(
      createElement(RemoteStatus, { loading: false, error: "No se pudo conectar", onRetry: retry })
    );
    assert.match(html, /role="alert"/);
    assert.match(html, /No se pudo conectar/);
    assert.match(html, /Reintentar/);
  });

  test("Con datos no renderiza nada", () => {
    const html = renderToStaticMarkup(createElement(RemoteStatus, { loading: false, error: null, onRetry: retry }));
    assert.equal(html, "");
  });
});

describe("VCP-93 (empleados): tarjetas y búsqueda", () => {
  test("Las tarjetas muestran las cifras del backend", () => {
    const html = renderToStaticMarkup(createElement(EmployeeSummary, { summary: SUMMARY }));
    for (const value of ["7", "41", "5", "6"]) {
      assert.match(html, new RegExp(`>${value}<`), value);
    }
    assert.match(html, /Por atender/);
  });

  test("Un día sin reservas muestra ceros, no datos de ejemplo", () => {
    const empty = { ...SUMMARY, todayReservations: 0, expectedVisitors: 0, pendingEntry: 0, activeServices: 0 };
    const html = renderToStaticMarkup(createElement(EmployeeSummary, { summary: empty }));
    assert.match(html, />0</);
    assert.doesNotMatch(html, /Valderrama|Mendoza/);
  });

  test("El control de acceso no trae reservas propias: arranca sin resultados", () => {
    const html = renderToStaticMarkup(createElement(AccessControl, { reservations: [] }));
    assert.match(html, /Ingresa un criterio de búsqueda/);
    assert.doesNotMatch(html, /Valderrama|Mendoza|VC-2401/);
  });

  test("toBogotaTime usa la hora de Bogotá, no la del navegador", () => {
    assert.equal(toBogotaTime(new Date("2026-10-20T15:30:00.000Z")), "10:30");
    assert.equal(toBogotaTime(new Date("2026-10-21T03:05:00.000Z")), "22:05");
  });
});
