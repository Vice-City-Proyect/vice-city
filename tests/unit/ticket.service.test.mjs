import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTicketForBooking } from "../../src/features/payments/services/ticket.service.ts";

function createMockTx() {
  const created = [];
  return {
    created,
    tickets: {
      create: async ({ data }) => {
        const ticket = { id: `tkt-${created.length + 1}`, ...data };
        created.push(ticket);
        return ticket;
      },
    },
  };
}

describe("Servicio de tickets: emisión de ticket digital", () => {
  it("Emite un ticket con código seguro de 128 bits (32 hex) y estado valid", async () => {
    const tx = createMockTx();
    const start = new Date("2099-06-02T15:00:00.000Z");
    const end = new Date("2099-06-02T16:00:00.000Z");

    const ticket = await createTicketForBooking(tx, {
      bookingId: "bk-1",
      holderName: "Lucia Caminos",
      validFrom: start,
      validUntil: end,
      metadata: { stripe_session_id: "cs_123" },
    });

    assert.equal(ticket.booking_id, "bk-1");
    assert.equal(ticket.status, "valid");
    assert.match(ticket.code, /^[0-9a-f]{32}$/);
    assert.equal(ticket.holder_name, "Lucia Caminos");
    assert.equal(ticket.valid_from, start);
    assert.equal(ticket.valid_until, end);
    assert.equal(ticket.metadata.stripe_session_id, "cs_123");
    assert.ok(ticket.metadata.issued_at);
  });

  it("Genera códigos distintos para tickets distintos", async () => {
    const tx = createMockTx();
    const a = await createTicketForBooking(tx, { bookingId: "bk-a" });
    const b = await createTicketForBooking(tx, { bookingId: "bk-b" });
    assert.notEqual(a.code, b.code);
  });
});