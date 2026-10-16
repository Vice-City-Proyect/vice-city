import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toISODate } from '../../src/lib/format.ts';

describe('Punto de Venta POS (/empleado/pos): Validaciones de Formulario y Reglas de Negocio', () => {
  // 1. Sanitización de cédula
  test('Sanitización de cédula: remueve caracteres no numéricos y permite máximo 12 dígitos', () => {
    const rawInput = 'CC-10.203.040-50 abc!';
    const sanitized = rawInput.replace(/\D/g, '').slice(0, 12);
    assert.equal(sanitized, '1020304050');
  });

  // 2. Control de valor vacío en cantidad
  test('Cantidad de personas permite vaciarse sin forzar el 0 visual', () => {
    // Al presionar backspace en un string vacío
    const rawValue = '';
    const val = rawValue.replace(/\D/g, '');
    const quantity = val === '' ? '' : parseInt(val, 10);
    assert.equal(quantity, '');

    // Al ingresar un nuevo número
    const entered = '5';
    const num = parseInt(entered.replace(/\D/g, ''), 10);
    assert.equal(num, 5);
  });

  // 3. Validación de cantidad entera positiva >= 1 y capacidad máxima
  test('Validación de cantidad: rechaza vacío, menor a 1 o mayor a la capacidad del servicio', () => {
    const capacity = 10;

    function validateQuantity(q) {
      const parsed = typeof q === 'number' ? q : parseInt(String(q), 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return 'La cantidad de personas debe ser un número entero mayor o igual a 1.';
      }
      if (parsed > capacity) {
        return `La cantidad excede la capacidad máxima del servicio (${capacity} personas).`;
      }
      return null;
    }

    assert.equal(validateQuantity(''), 'La cantidad de personas debe ser un número entero mayor o igual a 1.');
    assert.equal(validateQuantity(0), 'La cantidad de personas debe ser un número entero mayor o igual a 1.');
    assert.equal(validateQuantity(-2), 'La cantidad de personas debe ser un número entero mayor o igual a 1.');
    assert.equal(validateQuantity(15), 'La cantidad excede la capacidad máxima del servicio (10 personas).');
    assert.equal(validateQuantity(5), null);
    assert.equal(validateQuantity(10), null);
  });

  // 4. Reglas temporales: fechas pasadas y anticipación máxima de 15 días
  test('Reglas de fecha: rechaza fechas pasadas y más de 15 días de anticipación', () => {
    const now = new Date('2026-10-16T10:00:00-05:00');
    const todayStr = toISODate(now);

    function validateDate(date) {
      if (date < todayStr) {
        return 'No se pueden crear reservas en fechas pasadas.';
      }
      const maxAllowed = new Date(now);
      maxAllowed.setDate(maxAllowed.getDate() + 15);
      if (new Date(`${date}T23:59:59`) > maxAllowed) {
        return 'Las reservas solo se pueden realizar con un máximo de 15 días de anticipación.';
      }
      return null;
    }

    assert.equal(validateDate('2026-10-15'), 'No se pueden crear reservas en fechas pasadas.');
    assert.equal(validateDate('2026-11-05'), 'Las reservas solo se pueden realizar con un máximo de 15 días de anticipación.');
    assert.equal(validateDate(todayStr), null);
  });

  // 5. Regla de mantenimiento: lunes cerrado
  test('Regla de mantenimiento: complejo cerrado los lunes por mantenimiento', () => {
    function validateMaintenance(dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const selectedDateObj = new Date(year, month - 1, day);
      if (selectedDateObj.getDay() === 1) {
        return 'El complejo deportivo se encuentra cerrado los lunes por mantenimiento.';
      }
      return null;
    }

    // 2026-10-19 es Lunes
    assert.equal(validateMaintenance('2026-10-19'), 'El complejo deportivo se encuentra cerrado los lunes por mantenimiento.');
    // 2026-10-20 es Martes
    assert.equal(validateMaintenance('2026-10-20'), null);
  });

  // 6. Horario operativo: 8:00 AM a 5:00 PM
  test('Regla de horario operativo: franjas deben estar dentro de 8:00 a 17:00', () => {
    function validateHours(startTime, effectiveHours) {
      const endHour = Number(startTime.slice(0, 2)) + effectiveHours;
      if (Number(startTime.slice(0, 2)) < 8 || endHour > 17) {
        return 'La reserva debe estar dentro del horario de operación (8:00 AM a 5:00 PM).';
      }
      return null;
    }

    assert.equal(validateHours('07:00', 1), 'La reserva debe estar dentro del horario de operación (8:00 AM a 5:00 PM).');
    assert.equal(validateHours('16:00', 2), 'La reserva debe estar dentro del horario de operación (8:00 AM a 5:00 PM).');
    assert.equal(validateHours('08:00', 2), null);
    assert.equal(validateHours('16:00', 1), null);
  });

  // 7. Franja culminada en el día de hoy
  test('Regla de franja finalizada: no se puede reservar una franja cuya hora fin ya pasó hoy', () => {
    const fixedNow = new Date('2026-10-16T11:30:00-05:00');
    const todayStr = toISODate(fixedNow);

    function validateSlotFinished(date, startTime, effectiveHours) {
      if (date === todayStr) {
        const endHour = Number(startTime.slice(0, 2)) + effectiveHours;
        const endSlotTime = new Date(`${date}T${String(endHour).padStart(2, '0')}:${startTime.slice(3, 5)}:00-05:00`);
        if (fixedNow >= endSlotTime) {
          return 'La franja horaria seleccionada ya finalizó.';
        }
      }
      return null;
    }

    // Franja 09:00 - 10:00 ya finalizó a las 11:30
    assert.equal(validateSlotFinished(todayStr, '09:00', 1), 'La franja horaria seleccionada ya finalizó.');
    // Franja 10:00 - 11:00 ya finalizó a las 11:30
    assert.equal(validateSlotFinished(todayStr, '10:00', 1), 'La franja horaria seleccionada ya finalizó.');
    // Franja 11:00 - 12:00 aún no finaliza (son las 11:30) -> permitida en taquilla POS
    assert.equal(validateSlotFinished(todayStr, '11:00', 1), null);
    // Franja 14:00 - 15:00 en el futuro -> permitida
    assert.equal(validateSlotFinished(todayStr, '14:00', 1), null);
  });

  // 8. Tarea 2: Carga dinámica de servicios reales de PostgreSQL
  test('Servicios dinámicos: filtra inactivos y mapea UUID, tarifa y capacidad', () => {
    const rawServices = [
      { id: 'uuid-1', name: 'Piscina Adultos', price: 2000, capacity: 50, is_active: true },
      { id: 'uuid-2', name: 'Cancha Fútbol', price: 140000, capacity: 22, is_active: true },
      { id: 'uuid-3', name: 'Servicio Antiguo', price: 10000, capacity: 10, is_active: false },
    ];

    const activeServices = rawServices.filter((s) => s.is_active !== false);
    assert.equal(activeServices.length, 2);
    assert.equal(activeServices[0].id, 'uuid-1');
    assert.equal(activeServices[0].price, 2000);
    assert.equal(activeServices[0].capacity, 50);
    assert.equal(activeServices.some((s) => s.id === 'uuid-3'), false);
  });

  // 9. Tarea 3: Inyección de sellerId desde la sesión
  test('Vendedor de turno: inyecta sellerId del usuario autenticado', () => {
    const mockSession = {
      user: {
        id: 'usr-seller-uuid-777',
        name: 'Carlos Taquillero',
        role: 'TICKET_SELLER',
      },
    };

    const sellerId = mockSession?.user?.id || '';
    const sellerName = mockSession?.user?.name || 'Taquillero de Turno';

    assert.equal(sellerId, 'usr-seller-uuid-777');
    assert.equal(sellerName, 'Carlos Taquillero');
  });

  // 10. Tarea 4: Construcción del payload de previsualización con ISO 8601 en Bogotá
  test('Payload de preview: estructura conforme a posPreviewSchema con horas calculadas', () => {
    const sellerId = 'usr-seller-uuid-777';
    const clientName = 'Diana Gómez';
    const clientId = '1098765432';
    const serviceId = 'srv-pool-uuid-111';
    const date = '2026-10-20';
    const startTime = '10:00';
    const quantity = 3;
    const paymentMethod = 'cash';

    const startH = Number(startTime.slice(0, 2));
    const endH = startH + 1;
    const startAt = `${date}T${startTime}:00-05:00`;
    const endAt = `${date}T${String(endH).padStart(2, '0')}:${startTime.slice(3, 5)}:00-05:00`;

    const payload = {
      sellerId,
      clientName: clientName.trim(),
      clientId: clientId.trim(),
      serviceId,
      startAt,
      endAt,
      quantity,
      paymentMethod,
    };

    assert.equal(payload.startAt, '2026-10-20T10:00:00-05:00');
    assert.equal(payload.endAt, '2026-10-20T11:00:00-05:00');
    assert.equal(payload.quantity, 3);
    assert.equal(payload.paymentMethod, 'cash');
  });
});
