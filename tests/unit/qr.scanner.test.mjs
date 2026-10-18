import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QRScannerService } from "../../src/features/qr/services/qr-scanner.service.ts";
import { requireQrValidator } from "../../src/features/qr/auth/qr-validator.guard.ts";
import {
  TicketNotFoundError,
  TicketAlreadyUsedError,
  TicketCancelledError,
  MaintenanceDayError,
  OutOfScheduleError,
  UnauthorizedValidatorError,
} from "../../src/features/qr/errors/qr.errors.ts";

/**
 * Valores que Supabase acepta realmente (CHECK constraints de la base de datos).
 * El simulador los hace cumplir para que un valor inválido (p. ej. "USED" en mayúscula)
 * falle en las pruebas igual que fallaría contra la base real.
 */
const VALID_TICKET_STATUS = ["valid", "used", "cancelled", "expired"];
const VALID_ACCESS_RESULT = ["granted", "denied"];

/**
 * Mock en memoria de PrismaClient para probar todas las reglas de negocio
 * del Escáner QR de forma aislada, sin tocar la base de datos real de Supabase.
 */
function createMockPrisma({ tickets = [], failAuditLog = false } = {}) {
  const ticketsStore = tickets.map((t) => ({ ...t, bookings: { ...t.bookings } }));
  const accessLogsStore = [];
  const auditLogsStore = [];

  const client = {
    ticketsStore,
    accessLogsStore,
    auditLogsStore,
    tickets: {
      findUnique: async ({ where }) => ticketsStore.find((t) => t.code === where.code) || null,
      findFirst: async ({ where }) => {
        if (where?.code?.equals) {
          const target = where.code.equals.toLowerCase();
          return ticketsStore.find((t) => t.code.toLowerCase() === target) || null;
        }
        return ticketsStore.find((t) => t.code === where?.code) || null;
      },
      updateMany: async ({ where, data }) => {
        if (data.status !== undefined && !VALID_TICKET_STATUS.includes(data.status)) {
          throw new Error(`tickets_status_valid: valor no permitido '${data.status}'`);
        }
        let count = 0;
        ticketsStore.forEach((t) => {
          if (t.code === where.code && t.status === where.status) {
            Object.assign(t, data);
            count++;
          }
        });
        return { count };
      },
    },
    access_logs: {
      create: async ({ data }) => {
        if (!VALID_ACCESS_RESULT.includes(data.result)) {
          throw new Error(`access_logs_result_valid: valor no permitido '${data.result}'`);
        }
        const entry = { id: `log-uuid-${accessLogsStore.length + 1}`, ...data };
        accessLogsStore.push(entry);
        return entry;
      },
    },
    audit_logs: {
      create: async ({ data }) => {
        if (failAuditLog) {
          throw new Error("Simulated database failure during audit log insertion");
        }
        const entry = { id: `audit-uuid-${auditLogsStore.length + 1}`, ...data };
        auditLogsStore.push(entry);
        return entry;
      },
    },
    $transaction: async (callback) => {
      // Guarda un snapshot para rollback ante fallo dentro de la transacción
      const snapshotTickets = ticketsStore.map((t) => ({ ...t }));
      const snapshotAccessLogs = [...accessLogsStore];
      const snapshotAuditLogs = [...auditLogsStore];
      try {
        return await callback(client);
      } catch (err) {
        // Rollback
        ticketsStore.length = 0;
        ticketsStore.push(...snapshotTickets);
        accessLogsStore.length = 0;
        accessLogsStore.push(...snapshotAccessLogs);
        auditLogsStore.length = 0;
        auditLogsStore.push(...snapshotAuditLogs);
        throw err;
      }
    },
  };

  return client;
}

/**
 * Instante real a partir de una fecha y hora de Bogotá (UTC-5, sin horario de verano).
 * Ej.: bogota("2026-10-14", "10:00") === 2026-10-14T15:00:00Z
 */
function bogota(dateStr, time) {
  const t = time.length === 5 ? `${time}:00` : time;
  return new Date(`${dateStr}T${t}-05:00`);
}

// Ticket de prueba: franja por defecto 10:00 a 11:00 hora de Bogotá
function createSampleTicket({
  code = "A1B2C3D4E5F60718293A4B5C6D7E8F90",
  status = "valid",
  dateStr = "2026-10-14", // Miércoles (no mantenimiento)
  start = "10:00",
  end = "11:00",
} = {}) {
  const startAt = bogota(dateStr, start);
  const endAt = bogota(dateStr, end);

  return {
    id: "ticket-uuid-001",
    booking_id: "booking-uuid-001",
    code,
    holder_name: "Andres Elles (Portador)",
    status,
    valid_from: startAt,
    valid_until: endAt,
    used_at: status === "used" ? new Date() : null,
    bookings: {
      id: "booking-uuid-001",
      user_id: "user-uuid-client-1",
      service_id: "service-uuid-cancha-1",
      start_at: startAt,
      end_at: endAt,
      users: {
        id: "user-uuid-client-1",
        full_name: "Carlos Rodriguez",
        email: "carlos.cliente@vicecity.com",
        phone: "+57 300 123 4567",
        document_id: "1002345678",
      },
      services: {
        id: "service-uuid-cancha-1",
        name: "Cancha Sintetica 1 (Futbol 5)",
        duration_minutes: 60,
      },
    },
  };
}

function setup(ticketOptions, { failAuditLog = false } = {}) {
  const ticket = createSampleTicket(ticketOptions);
  const db = createMockPrisma({ tickets: [ticket], failAuditLog });
  return { ticket, db, service: new QRScannerService(db) };
}

describe("HU13: Escáner QR - Validación y Control de Acceso Backend (VCP-57)", () => {
  it("Criterio 1: Un QR válido devuelve cliente, fecha y hora de Bogotá, servicio y estado", async () => {
    const { ticket, service } = setup();
    const response = await service.validateQRCode(
      ticket.code,
      "QR_VALIDATOR",
      bogota("2026-10-14", "10:02")
    );

    assert.equal(response.code, ticket.code);
    assert.equal(response.status, "VALID");
    assert.equal(response.customer.fullName, "Carlos Rodriguez");
    assert.equal(response.service.name, "Cancha Sintetica 1 (Futbol 5)");
    // La franja se informa en hora de Bogotá, no en UTC
    assert.equal(response.schedule.date, "2026-10-14");
    assert.equal(response.schedule.startTime, "10:00");
    assert.equal(response.schedule.endTime, "11:00");
    assert.equal(response.accessValidation.canEnter, true);
    assert.equal(response.accessValidation.isLateEntry, false);
    assert.equal(response.accessValidation.reasonCode, "ENTRY_GRANTED");
  });

  it("Criterio 2: Permite el ingreso tardío mientras el cliente esté dentro de su franja", async () => {
    const { ticket, service } = setup();
    const response = await service.validateQRCode(
      ticket.code,
      "QR_VALIDATOR",
      bogota("2026-10-14", "10:25")
    );

    assert.equal(response.accessValidation.canEnter, true);
    assert.equal(response.accessValidation.isLateEntry, true);
    assert.equal(response.accessValidation.reasonCode, "LATE_ENTRY_ALLOWED");
  });

  it("Criterio 3: Confirmar ingreso marca el ticket como used y registra access_logs y audit_logs", async () => {
    const { ticket, db, service } = setup();
    const result = await service.confirmEntry(
      ticket.code,
      "validator-user-id-99",
      "QR_VALIDATOR",
      "Torniquete Sur",
      "192.168.1.50",
      bogota("2026-10-14", "10:10")
    );

    // La API informa USED; la base guarda 'used' (minúscula, exigido por el CHECK de Supabase)
    assert.equal(result.status, "USED");
    assert.ok(result.usedAt);
    assert.ok(result.accessLogId);

    const updatedTicket = db.ticketsStore.find((t) => t.code === ticket.code);
    assert.equal(updatedTicket.status, "used");
    assert.ok(updatedTicket.used_at);

    assert.equal(db.accessLogsStore.length, 1);
    assert.equal(db.accessLogsStore[0].result, "granted");
    assert.equal(db.accessLogsStore[0].scanned_by, "validator-user-id-99");
    assert.equal(db.accessLogsStore[0].access_point, "Torniquete Sur");

    // Registro del evento en audit_logs a nombre del validador real
    assert.equal(db.auditLogsStore.length, 1);
    assert.equal(db.auditLogsStore[0].action, "TICKET_ENTRY_CONFIRMED");
    assert.equal(db.auditLogsStore[0].user_id, "validator-user-id-99");
    assert.equal(db.auditLogsStore[0].entity_id, ticket.id);
  });

  it("Criterio 4a: Caso de error - QR inexistente es rechazado con mensaje claro", async () => {
    const { service } = setup();
    await assert.rejects(
      () => service.validateQRCode("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "QR_VALIDATOR"),
      (err) => err instanceof TicketNotFoundError && err.statusCode === 404 && err.message.length > 10
    );
  });

  it("Criterio 4b: Caso de error - fecha incorrecta (futura o pasada) es rechazada", async () => {
    // 2026-10-15 (jueves) y 2026-10-16 (viernes) son días ordinarios sin mantenimiento
    const { ticket, service } = setup({ dateStr: "2026-10-16", start: "10:00", end: "11:00" });

    const futuro = await service.validateQRCode(ticket.code, "QR_VALIDATOR", bogota("2026-10-15", "10:30"));
    assert.equal(futuro.accessValidation.canEnter, false);
    assert.equal(futuro.accessValidation.reasonCode, "OUT_OF_SCHEDULE");

    const pasado = await service.validateQRCode(ticket.code, "QR_VALIDATOR", bogota("2026-10-17", "10:30"));
    assert.equal(pasado.accessValidation.canEnter, false);
    assert.equal(pasado.accessValidation.reasonCode, "EXPIRED_TICKET");
  });

  it("Criterio 4c: Caso de error - fuera de franja (antes y después) es rechazado", async () => {
    const { ticket, service } = setup();
    const antes = await service.validateQRCode(ticket.code, "QR_VALIDATOR", bogota("2026-10-14", "09:30"));
    assert.equal(antes.accessValidation.canEnter, false);
    assert.equal(antes.accessValidation.reasonCode, "OUT_OF_SCHEDULE");

    const despues = await service.validateQRCode(ticket.code, "QR_VALIDATOR", bogota("2026-10-14", "11:05"));
    assert.equal(despues.accessValidation.canEnter, false);
    assert.equal(despues.accessValidation.reasonCode, "EXPIRED_TICKET");
  });

  it("Criterio 4d: Caso de error - mantenimiento semanal (lunes) bloquea el ingreso", async () => {
    // 2026-10-19 es lunes no festivo
    const { ticket, service } = setup({ dateStr: "2026-10-19", start: "14:00", end: "15:00" });
    const response = await service.validateQRCode(ticket.code, "QR_VALIDATOR", bogota("2026-10-19", "14:00"));
    assert.equal(response.accessValidation.canEnter, false);
    assert.equal(response.accessValidation.reasonCode, "MAINTENANCE_DAY_CLOSED");
  });

  it("Criterio 4e: Caso de error - lunes festivo el mantenimiento pasa al martes", async () => {
    // 2026-10-12 (lunes festivo Día de la Raza) abre; 2026-10-13 (martes) cierra
    const lunes = setup({ dateStr: "2026-10-12" });
    const abierto = await lunes.service.validateQRCode(lunes.ticket.code, "QR_VALIDATOR", bogota("2026-10-12", "10:30"));
    assert.equal(abierto.accessValidation.canEnter, true);

    const martes = setup({ dateStr: "2026-10-13" });
    const cerrado = await martes.service.validateQRCode(martes.ticket.code, "QR_VALIDATOR", bogota("2026-10-13", "10:30"));
    assert.equal(cerrado.accessValidation.canEnter, false);
    assert.equal(cerrado.accessValidation.reasonCode, "MAINTENANCE_DAY_CLOSED");
  });

  it("Criterio 4f: Confirmar ingreso en día de mantenimiento lanza MaintenanceDayError (422)", async () => {
    const { ticket, service } = setup({ dateStr: "2026-10-19", start: "14:00", end: "15:00" });
    await assert.rejects(
      () => service.confirmEntry(ticket.code, "val-1", "QR_VALIDATOR", "Torniquete", null, bogota("2026-10-19", "14:00")),
      (err) => err instanceof MaintenanceDayError && err.statusCode === 422
    );
  });

  it("Criterio 5: Caso de error - un QR ya usado es rechazado y el intento queda registrado", async () => {
    const { ticket, db, service } = setup({ status: "used" });
    const now = bogota("2026-10-14", "10:10");

    const validation = await service.validateQRCode(ticket.code, "QR_VALIDATOR", now);
    assert.equal(validation.accessValidation.canEnter, false);
    assert.equal(validation.accessValidation.reasonCode, "ALREADY_USED");

    await assert.rejects(
      () => service.confirmEntry(ticket.code, "val-id", "QR_VALIDATOR", "Torniquete 1", null, now),
      (err) => err instanceof TicketAlreadyUsedError && err.statusCode === 409
    );
    // El intento denegado se guarda con un valor que la base acepta
    assert.equal(db.accessLogsStore.length, 1);
    assert.equal(db.accessLogsStore[0].result, "denied");
  });

  it("Criterio 5b: Caso de error - ticket cancelado o vencido no permite ingreso", async () => {
    const cancelado = setup({ status: "cancelled" });
    const resCancel = await cancelado.service.validateQRCode(cancelado.ticket.code, "QR_VALIDATOR", bogota("2026-10-14", "10:10"));
    assert.equal(resCancel.accessValidation.canEnter, false);

    await assert.rejects(
      () => cancelado.service.confirmEntry(cancelado.ticket.code, "val-id", "QR_VALIDATOR", "Torniquete 1", null, bogota("2026-10-14", "10:10")),
      (err) => err instanceof TicketCancelledError || err instanceof OutOfScheduleError
    );

    const vencido = setup({ status: "expired" });
    const resVencido = await vencido.service.validateQRCode(vencido.ticket.code, "QR_VALIDATOR", bogota("2026-10-14", "10:10"));
    assert.equal(resVencido.accessValidation.canEnter, false);
  });

  it("Criterio 6: Caso de error - un rol distinto de QR_VALIDATOR recibe 403 (incluido ADMIN)", async () => {
    const { ticket, service } = setup();
    for (const rol of ["CLIENT", "TICKET_SELLER", "ADMIN", null]) {
      await assert.rejects(
        () => service.validateQRCode(ticket.code, rol),
        (err) => err instanceof UnauthorizedValidatorError && err.statusCode === 403
      );
    }
  });

  it("Criterio 7: Caso límite - dos escaneos simultáneos del mismo QR, solo uno marca el ingreso", async () => {
    const { ticket, db, service } = setup();
    const now = bogota("2026-10-14", "10:05");

    // Promise.all los lanza en paralelo; el UPDATE condicional (status = 'valid') deja pasar solo uno
    const resultados = await Promise.allSettled([
      service.confirmEntry(ticket.code, "validator-1", "QR_VALIDATOR", "Torniquete Norte", null, now),
      service.confirmEntry(ticket.code, "validator-2", "QR_VALIDATOR", "Torniquete Sur", null, now),
    ]);

    const exitosos = resultados.filter((r) => r.status === "fulfilled");
    const rechazados = resultados.filter((r) => r.status === "rejected");
    assert.equal(exitosos.length, 1);
    assert.equal(rechazados.length, 1);
    assert.ok(rechazados[0].reason instanceof TicketAlreadyUsedError);
    assert.equal(db.ticketsStore[0].status, "used");
  });

  it("Criterio 8: Caso límite - escaneo justo al inicio y al fin de la franja (inicio inclusivo, fin exclusivo)", async () => {
    const { ticket, service } = setup();
    const evaluar = async (hora) =>
      (await service.validateQRCode(ticket.code, "QR_VALIDATOR", bogota("2026-10-14", hora))).accessValidation;

    // Un segundo antes del inicio: aún no
    assert.equal((await evaluar("09:59:59")).canEnter, false);
    // Justo al inicio: entra, sin ser tardío
    const alInicio = await evaluar("10:00:00");
    assert.equal(alInicio.canEnter, true);
    assert.equal(alInicio.isLateEntry, false);
    // Último segundo de la franja: entra (tardío)
    const alFinal = await evaluar("10:59:59");
    assert.equal(alFinal.canEnter, true);
    assert.equal(alFinal.isLateEntry, true);
    // Justo al fin: ya no
    const alFin = await evaluar("11:00:00");
    assert.equal(alFin.canEnter, false);
    assert.equal(alFin.reasonCode, "EXPIRED_TICKET");
  });

  it("Criterio 9: Zona horaria - la hora de Bogotá se evalúa igual con la franja guardada en UTC", async () => {
    // 10:00 en Bogotá se guarda como 15:00Z; 10:00Z (= 05:00 en Bogotá) NO debe contar como 10:00
    const { ticket, service } = setup();
    assert.equal(ticket.valid_from.toISOString(), "2026-10-14T15:00:00.000Z");

    const respuesta = await service.validateQRCode(
      ticket.code,
      "QR_VALIDATOR",
      new Date("2026-10-14T10:30:00.000Z") // 05:30 en Bogotá: faltan 4 h 30 min
    );
    assert.equal(respuesta.accessValidation.canEnter, false);
    assert.equal(respuesta.accessValidation.reasonCode, "OUT_OF_SCHEDULE");
  });

  it("Criterio 10: Un ticket sin franja asociada no se valida con una fecha inventada", async () => {
    const ticket = createSampleTicket();
    ticket.bookings.start_at = null;
    ticket.bookings.end_at = null;
    ticket.valid_from = null;
    ticket.valid_until = null;
    const service = new QRScannerService(createMockPrisma({ tickets: [ticket] }));

    await assert.rejects(
      () => service.validateQRCode(ticket.code, "QR_VALIDATOR"),
      (err) => err instanceof OutOfScheduleError
    );
  });

  it("Criterio 11: Rollback - si la persistencia de auditoría falla, el ticket no queda marcado como used", async () => {
    const { ticket, db, service } = setup({}, { failAuditLog: true });
    const now = bogota("2026-10-14", "10:10");

    await assert.rejects(
      () => service.confirmEntry(ticket.code, "val-1", "QR_VALIDATOR", "Torniquete 1", null, now),
      /Simulated database failure/
    );

    // Rollback verificado: el ticket sigue siendo 'valid'
    const storedTicket = db.ticketsStore.find((t) => t.code === ticket.code);
    assert.equal(storedTicket.status, "valid");
    assert.equal(storedTicket.used_at, null);
  });

  it("Criterio 12: Respeta CHECK constraints - rechaza estados inválidos en la base", async () => {
    const { db } = setup();
    // Intento de persistir status no soportado lanza error en el mock que replica la BD
    await assert.rejects(
      () => db.tickets.updateMany({ where: { code: "any", status: "valid" }, data: { status: "INVALID_STATUS" } }),
      /tickets_status_valid/
    );
    await assert.rejects(
      () => db.access_logs.create({ data: { ticket_id: "id", result: "INVALID_RESULT" } }),
      /access_logs_result_valid/
    );
  });

  it("Criterio 13: Insensible a mayúsculas/minúsculas - consultar en MAYÚSCULAS un código guardado en minúsculas es válido y autoriza el ingreso", async () => {
    // Ticket guardado con código hexadecimal en minúsculas (ej: generado por crypto.randomBytes)
    const { service, ticket } = setup({
      code: "247ae24514589d30c5e7b2438fa918b4",
      start: "10:00",
      end: "11:00",
    });

    const now = bogota("2026-10-14", "10:15");
    // Consulta enviando el código en mayúsculas (como cuando se escribe en el teclado)
    const uppercaseCode = "247AE24514589D30C5E7B2438FA918B4";
    const validation = await service.validateQRCode(uppercaseCode, "QR_VALIDATOR", now);

    assert.equal(validation.code, "247ae24514589d30c5e7b2438fa918b4");
    assert.equal(validation.accessValidation.canEnter, true);

    // Confirmación enviando el código en mayúsculas también actualiza y autoriza
    const entry = await service.confirmEntry(uppercaseCode, "val-1", "QR_VALIDATOR", "Torniquete 1", null, now);
    assert.equal(entry.status, "USED");
    assert.equal(entry.code, "247ae24514589d30c5e7b2438fa918b4");
  });
});

describe("HU13: Guard de acceso - sesión JWT real (sin cabeceras falsificables)", () => {
  // Petición sin token válido: el guard debe ignorar cualquier cabecera x-user-role / x-user-id
  const fakeRequest = { headers: new Headers({ "x-user-role": "QR_VALIDATOR", "x-user-id": "x" }) };

  it("Sin sesión responde 401 aunque la petición traiga cabeceras con un rol falso", async () => {
    const check = await requireQrValidator(fakeRequest, null);
    assert.equal(check.authorized, false);
    assert.equal(check.status, 401);
  });

  it("Un validador con sesión es autorizado y se identifica por el id del token", async () => {
    const check = await requireQrValidator(fakeRequest, { id: "user-validator-1", role: "QR_VALIDATOR" });
    assert.equal(check.authorized, true);
    assert.equal(check.userId, "user-validator-1");
  });

  it("Cualquier otro rol (CLIENT, TICKET_SELLER, ADMIN) recibe 403", async () => {
    for (const role of ["CLIENT", "TICKET_SELLER", "ADMIN"]) {
      const check = await requireQrValidator(fakeRequest, { id: "u1", role });
      assert.equal(check.authorized, false);
      assert.equal(check.status, 403);
    }
  });

  it("Una sesión sin id de usuario no se acepta (no se puede auditar quién escaneó)", async () => {
    const check = await requireQrValidator(fakeRequest, { role: "QR_VALIDATOR" });
    assert.equal(check.authorized, false);
    assert.equal(check.status, 403);
  });
});
