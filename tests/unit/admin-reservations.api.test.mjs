import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as listReservationsHandler } from "../../src/app/api/admin/reservations/route.ts";
import {
  GET as getReservationDetailHandler,
  PATCH as updateReservationHandler,
} from "../../src/app/api/admin/reservations/[id]/route.ts";
import {
  BookingNotFoundError,
} from "../../src/features/reservations/errors/reservation.errors.ts";
import {
  SlotUnavailableError,
} from "../../src/features/reservations/errors/reservations.errors.ts";

function createMockRequest(url, { method = "GET", headers = {}, body = null } = {}) {
  const reqInit = {
    method,
    headers: new Headers(headers),
  };
  if (body !== null && method !== "GET") {
    reqInit.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit);
}

describe("MR1: API Endpoints - Gestión de Reservas Administrativas", () => {
  const adminSession = {
    user: { id: "u-admin-01", email: "admin@vicecity.com", role: "ADMIN" },
  };
  const clientSession = {
    user: { id: "u-client-02", email: "cliente@vicecity.com", role: "CLIENT" },
  };
  const sellerSession = {
    user: { id: "u-seller-03", email: "taquilla@vicecity.com", role: "TICKET_SELLER" },
  };

  const VALID_UUID = "e2a4b860-9114-41d7-b35a-40a256191f4d";
  const NOT_FOUND_UUID = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
  const CONFLICT_UUID = "c2a4b860-9114-41d7-b35a-40a256191f4c";

  let mockService;

  beforeEach(() => {
    mockService = {
      listReservations: async (params) => {
        return {
          reservations: [
            {
              id: VALID_UUID,
              code: "TK-7B93F12A",
              clientId: "u-client-02",
              clientName: "Carlos Valderrama",
              clientEmail: "pibe@vicecity.com",
              clientPhone: "+57 300 111 2233",
              serviceId: "s-cancha-01",
              serviceName: "Cancha Fútbol 5 Sintética",
              category: "SOCCER_MICRO",
              resource: "Cancha Principal A",
              date: "2026-10-20",
              startTime: "10:00",
              endTime: "11:00",
              guests: 10,
              hours: 1,
              basePrice: 80000,
              discountType: "NONE",
              discountPercent: 0,
              total: 80000,
              status: "CONFIRMED",
              paymentStatus: "CONFIRMED",
              holdState: "NONE",
              holdExpiresAt: null,
              type: "NORMAL",
              accessStatus: "NOT_ENTERED",
              qrStatus: "VALID",
              wristbandColor: "BLUE",
              createdBy: "WEB",
              notes: "Reserva de prueba",
              cancellationReason: null,
              cancelledAt: null,
              createdAt: "2026-10-18T10:00:00.000Z",
              updatedAt: "2026-10-18T10:00:00.000Z",
            },
          ],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 10,
            total: 1,
            totalPages: 1,
          },
        };
      },
      getReservationById: async (id) => {
        if (id === NOT_FOUND_UUID) {
          throw new BookingNotFoundError("Reserva no encontrada");
        }
        return {
          id,
          code: "TK-7B93F12A",
          clientId: "u-client-02",
          clientName: "Carlos Valderrama",
          clientEmail: "pibe@vicecity.com",
          clientPhone: "+57 300 111 2233",
          serviceId: "s-cancha-01",
          serviceName: "Cancha Fútbol 5 Sintética",
          category: "SOCCER_MICRO",
          resource: "Cancha Principal A",
          date: "2026-10-20",
          startTime: "10:00",
          endTime: "11:00",
          guests: 10,
          hours: 1,
          basePrice: 80000,
          discountType: "NONE",
          discountPercent: 0,
          total: 80000,
          status: "CONFIRMED",
          paymentStatus: "CONFIRMED",
          holdState: "NONE",
          holdExpiresAt: null,
          type: "NORMAL",
          accessStatus: "NOT_ENTERED",
          qrStatus: "VALID",
          wristbandColor: "BLUE",
          createdBy: "WEB",
          notes: "Reserva con detalle completo",
          cancellationReason: null,
          cancelledAt: null,
          createdAt: "2026-10-18T10:00:00.000Z",
          updatedAt: "2026-10-18T10:00:00.000Z",
          payment: {
            id: "p-01",
            amount: 80000,
            status: "COMPLETED",
            method: "STRIPE",
            providerReference: "pi_test_12345",
            paidAt: "2026-10-18T10:05:00.000Z",
          },
          ticket: {
            id: "t-01",
            code: "TK-7B93F12A",
            status: "VALID",
            usedAt: null,
            validFrom: null,
            validUntil: null,
          },
          tickets: [
            {
              id: "t-01",
              ticketCode: "TK-7B93F12A",
              status: "VALID",
              createdAt: "2026-10-18T10:05:00.000Z",
            },
          ],
          accessLogs: [],
        };
      },
      updateReservation: async (id, payload, _adminId) => {
        if (id === NOT_FOUND_UUID) {
          throw new BookingNotFoundError("Reserva no encontrada");
        }
        if (id === CONFLICT_UUID || payload.startTime === "18:00") {
          throw new SlotUnavailableError("Horario no disponible por choque con otra reserva");
        }

        const isCancelled = payload.status === "CANCELLED";
        return {
          id,
          code: "TK-7B93F12A",
          clientId: "u-client-02",
          clientName: "Carlos Valderrama",
          clientEmail: "pibe@vicecity.com",
          clientPhone: "+57 300 111 2233",
          serviceId: "s-cancha-01",
          serviceName: "Cancha Fútbol 5 Sintética",
          category: "SOCCER_MICRO",
          resource: "Cancha Principal A",
          date: payload.date || "2026-10-20",
          startTime: payload.startTime || "10:00",
          endTime: payload.endTime || "11:00",
          guests: payload.guests || 10,
          hours: 1,
          basePrice: 80000,
          discountType: "NONE",
          discountPercent: 0,
          total: 80000,
          status: isCancelled ? "CANCELLED" : "CONFIRMED",
          paymentStatus: "CONFIRMED",
          holdState: "NONE",
          holdExpiresAt: null,
          type: "NORMAL",
          accessStatus: "NOT_ENTERED",
          qrStatus: isCancelled ? "CANCELLED" : "VALID",
          wristbandColor: "BLUE",
          createdBy: "WEB",
          notes: payload.notes || "Reserva de prueba",
          cancellationReason: payload.cancellationReason || null,
          cancelledAt: isCancelled ? new Date().toISOString() : null,
          createdAt: "2026-10-18T10:00:00.000Z",
          updatedAt: new Date().toISOString(),
          payment: null,
          ticket: null,
          tickets: [],
          accessLogs: [],
        };
      },
    };
  });

  // ---------------------------------------------------------------------------
  // GET /api/admin/reservations
  // ---------------------------------------------------------------------------
  describe("GET /api/admin/reservations", () => {
    test("401 si no hay sesión activa", async () => {
      const req = createMockRequest("http://localhost:3000/api/admin/reservations");
      const res = await listReservationsHandler(req, {
        sessionOverride: null,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 401);
    });

    test("403 si el rol no es ADMIN (CLIENT o TICKET_SELLER)", async () => {
      const req1 = createMockRequest("http://localhost:3000/api/admin/reservations");
      const res1 = await listReservationsHandler(req1, {
        sessionOverride: clientSession,
        serviceOverride: mockService,
      });
      assert.equal(res1.status, 403);

      const req2 = createMockRequest("http://localhost:3000/api/admin/reservations");
      const res2 = await listReservationsHandler(req2, {
        sessionOverride: sellerSession,
        serviceOverride: mockService,
      });
      assert.equal(res2.status, 403);
    });

    test("200 con listado paginado si es ADMIN", async () => {
      const req = createMockRequest("http://localhost:3000/api/admin/reservations?page=1&limit=10");
      const res = await listReservationsHandler(req, {
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.equal(json.pagination.total, 1);
    });

    test("400 si los query params son inválidos", async () => {
      const req = createMockRequest("http://localhost:3000/api/admin/reservations?page=-1");
      const res = await listReservationsHandler(req, {
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error, "VALIDATION_ERROR");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/admin/reservations/[id]
  // ---------------------------------------------------------------------------
  describe("GET /api/admin/reservations/[id]", () => {
    test("401 si no hay sesión activa", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`);
      const res = await getReservationDetailHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: null,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 401);
    });

    test("403 si el rol no es ADMIN", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`);
      const res = await getReservationDetailHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: clientSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 403);
    });

    test("400 si el id no es un UUID válido", async () => {
      const req = createMockRequest("http://localhost:3000/api/admin/reservations/invalid-id-format");
      const res = await getReservationDetailHandler(req, {
        params: Promise.resolve({ id: "invalid-id-format" }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 400);
    });

    test("404 si la reserva no existe", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${NOT_FOUND_UUID}`);
      const res = await getReservationDetailHandler(req, {
        params: Promise.resolve({ id: NOT_FOUND_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.error, "BOOKING_NOT_FOUND");
    });

    test("200 con detalle completo de la reserva", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`);
      const res = await getReservationDetailHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.id, VALID_UUID);
      assert.ok(json.data.payment);
      assert.equal(json.data.tickets.length, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/admin/reservations/[id]
  // ---------------------------------------------------------------------------
  describe("PATCH /api/admin/reservations/[id]", () => {
    test("401 si no hay sesión activa", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`, {
        method: "PATCH",
        body: { status: "CANCELLED", cancellationReason: "Motivo administrativo" },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: null,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 401);
    });

    test("403 si el rol no es ADMIN", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`, {
        method: "PATCH",
        body: { status: "CANCELLED", cancellationReason: "Motivo administrativo" },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: clientSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 403);
    });

    test("400 si el cuerpo tiene campos no permitidos (.strict())", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`, {
        method: "PATCH",
        body: { status: "CANCELLED", campoInvalido: "hack" },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error, "VALIDATION_ERROR");
    });

    test("400 si se cancela sin proveer cancellationReason", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`, {
        method: "PATCH",
        body: { status: "CANCELLED" },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error, "VALIDATION_ERROR");
    });

    test("404 si la reserva no existe", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${NOT_FOUND_UUID}`, {
        method: "PATCH",
        body: { status: "CANCELLED", cancellationReason: "Cancelación válida de 10 caracteres" },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: NOT_FOUND_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 404);
    });

    test("409 si el horario reprogramado colisiona con otra reserva", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`, {
        method: "PATCH",
        body: {
          date: "2026-10-20",
          startTime: "18:00",
          endTime: "19:00",
        },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 409);
      const json = await res.json();
      assert.equal(json.error, "SLOT_NOT_AVAILABLE");
    });

    test("200 al cancelar lógicamente una reserva de forma exitosa", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`, {
        method: "PATCH",
        body: {
          status: "CANCELLED",
          cancellationReason: "Mantenimiento extraordinario en complejo",
        },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.message, "Reserva cancelada exitosamente");
      assert.equal(json.data.status, "CANCELLED");
    });

    test("200 al reprogramar reserva exitosamente", async () => {
      const req = createMockRequest(`http://localhost:3000/api/admin/reservations/${VALID_UUID}`, {
        method: "PATCH",
        body: {
          date: "2026-10-21",
          startTime: "14:00",
          endTime: "15:00",
          guests: 8,
          notes: "Horario cambiado por solicitud del cliente",
        },
      });
      const res = await updateReservationHandler(req, {
        params: Promise.resolve({ id: VALID_UUID }),
        sessionOverride: adminSession,
        serviceOverride: mockService,
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.date, "2026-10-21");
      assert.equal(json.data.startTime, "14:00");
    });
  });
});

