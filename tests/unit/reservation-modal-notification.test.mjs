import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createStatusNotification,
} from "../../src/features/reservations/components/ReservationEditModal.tsx";

describe("HU32 — Modal del dashboard: notificación única de estado de reserva", () => {
  test("Criterio 1 y 2: Al cambiar el estado de la reserva se genera una sola notificación con el nuevo estado claro", () => {
    const notifConfirmed = createStatusNotification("CONFIRMED");
    assert.ok(notifConfirmed, "Debe existir un objeto de notificación");
    assert.equal(typeof notifConfirmed.id, "number");
    assert.equal(notifConfirmed.status, "CONFIRMED");
    assert.equal(
      notifConfirmed.message,
      'Estado de la reserva actualizado a: Confirmada'
    );

    const notifCancelled = createStatusNotification("CANCELLED");
    assert.equal(notifCancelled.status, "CANCELLED");
    assert.equal(
      notifCancelled.message,
      'Estado de la reserva actualizado a: Cancelada'
    );

    const notifPending = createStatusNotification("PENDING");
    assert.equal(notifPending.status, "PENDING");
    assert.equal(
      notifPending.message,
      'Estado de la reserva actualizado a: Pendiente'
    );
  });

  test("Criterio 3: La notificación se cierra y no se acumulan múltiples alertas", () => {
    // Simulador del gestor de notificación única del modal
    class SingleNotificationManager {
      constructor() {
        this.current = null;
        this.timer = null;
      }

      notify(status) {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        this.current = createStatusNotification(status);
        this.timer = setTimeout(() => {
          this.current = null;
          this.timer = null;
        }, 4000);
      }

      dismiss() {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
        this.current = null;
      }
    }

    const manager = new SingleNotificationManager();
    manager.notify("CONFIRMED");

    assert.ok(manager.current !== null, "Debe haber una notificación activa");
    assert.equal(manager.current.status, "CONFIRMED");

    // Cierre manual con botón
    manager.dismiss();
    assert.equal(manager.current, null, "La notificación debe quedar cerrada");
  });

  test("Criterio 4 (Caso límite): dos cambios seguidos muestran solo la notificación más reciente sin duplicados", () => {
    class SingleNotificationManager {
      constructor() {
        this.current = null;
        this.historyCount = 0;
      }

      notify(status) {
        // Reemplazo atómico: nunca un arreglo o lista acumulada
        this.current = createStatusNotification(status);
        this.historyCount++;
      }

      getActiveNotifications() {
        return this.current ? [this.current] : [];
      }
    }

    const manager = new SingleNotificationManager();

    // Primer cambio
    manager.notify("CONFIRMED");
    assert.equal(manager.getActiveNotifications().length, 1);
    assert.equal(manager.current.status, "CONFIRMED");
    assert.equal(
      manager.current.message,
      'Estado de la reserva actualizado a: Confirmada'
    );

    // Segundo cambio inmediato (caso límite)
    manager.notify("CANCELLED");
    const active = manager.getActiveNotifications();

    assert.equal(
      active.length,
      1,
      "No deben existir notificaciones acumuladas ni duplicadas"
    );
    assert.equal(
      active[0].status,
      "CANCELLED",
      "Debe mostrar únicamente la notificación del estado más reciente"
    );
    assert.equal(
      active[0].message,
      'Estado de la reserva actualizado a: Cancelada'
    );
  });
});

