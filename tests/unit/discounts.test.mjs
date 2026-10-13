import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  DiscountCalculatorService,
  FullPoolDayRestrictedError,
} from "../../src/features/pricing/index.ts";

describe("FT-04 / HU22: Descuentos y Promociones Oficiales", () => {
  let mockCanchaService;
  let mockFullPoolService;
  let service;

  beforeEach(() => {
    // Servicio 1: Cancha de Fútbol ($140.000 / hora)
    mockCanchaService = {
      id: "service-cancha-uuid",
      name: "Cancha Fútbol Grande",
      slug: "cancha-futbol-grande",
      capacity: 11,
      price: 140000,
      currency: "COP",
      duration_minutes: 60,
      is_active: true,
    };

    // Servicio 2: Reserva Completa de Piscina (50 cupos, 9 horas continuas a $2.000/cupo/hora = $900.000)
    mockFullPoolService = {
      id: "service-full-pool-uuid",
      name: "Reserva Completa Piscina",
      slug: "piscina-reserva-completa",
      capacity: 50,
      price: 100000, // Tarifa base por hora de la piscina completa
      currency: "COP",
      duration_minutes: 540,
      is_active: true,
    };

    const mockFindServiceById = async (id) => {
      if (id === mockCanchaService.id) return mockCanchaService;
      if (id === mockFullPoolService.id) return mockFullPoolService;
      return null;
    };

    service = new DiscountCalculatorService({
      findServiceByIdFn: mockFindServiceById,
    });
  });

  test("Criterio 1: Una reserva de miércoles recibe automáticamente el 20% de descuento (RN-013)", async () => {
    // 2026-10-14 es Miércoles
    const result = await service.calculatePricing({
      serviceId: mockCanchaService.id,
      date: "2026-10-14", // Miércoles
      startAt: "2026-10-14T09:00:00-05:00",
      endAt: "2026-10-14T10:00:00-05:00", // 1 hora
      quantity: 1,
    });

    assert.equal(result.isWednesday, true);
    assert.equal(result.originalAmount, 140000);
    assert.equal(result.discountPercent, 20);
    assert.equal(result.discountAmount, 28000); // 20% de 140.000
    assert.equal(result.finalAmount, 112000);   // 140.000 - 28.000
    assert.equal(result.appliedDiscount, "WEDNESDAY_DISCOUNT");
    assert.match(result.discountDescription, /Miércoles/i);
  });

  test("Criterio 2: Una reserva completa de piscina recibe el 20% de descuento (RN-014)", async () => {
    // 2026-10-15 es Jueves (día permitido para piscina completa)
    const result = await service.calculatePricing({
      serviceId: mockFullPoolService.id,
      date: "2026-10-15", // Jueves
      startAt: "2026-10-15T08:00:00-05:00",
      endAt: "2026-10-15T17:00:00-05:00", // 9 horas continuas
      quantity: 50,
      isFullPool: true,
    });

    // 9 horas * $100.000 = $900.000 (o 9h * 50 cupos)
    assert.equal(result.isFullPool, true);
    assert.equal(result.isWednesday, false);
    assert.equal(result.discountPercent, 20);
    assert.equal(result.discountAmount, (result.originalAmount * 20) / 100);
    assert.equal(result.finalAmount, result.originalAmount - result.discountAmount);
    assert.equal(result.appliedDiscount, "FULL_POOL_DISCOUNT");
    assert.match(result.discountDescription, /Piscina Completa|Reserva Completa de Piscina/i);
  });

  test("Criterio 3: Caso de error - Una reserva completa de piscina en día prohibido es rechazada (RN-014)", async () => {
    // 1. Viernes (2026-10-16)
    await assert.rejects(
      async () => {
        await service.calculatePricing({
          serviceId: mockFullPoolService.id,
          date: "2026-10-16", // Viernes
          startAt: "2026-10-16T08:00:00-05:00",
          endAt: "2026-10-16T17:00:00-05:00",
          isFullPool: true,
        });
      },
      (err) => {
        assert.ok(err instanceof FullPoolDayRestrictedError);
        assert.equal(err.code, "FULL_POOL_DAY_RESTRICTED");
        assert.equal(err.statusCode, 422);
        assert.match(err.message, /viernes/i);
        return true;
      }
    );

    // 2. Sábado (2026-10-17)
    await assert.rejects(
      async () => {
        await service.calculatePricing({
          serviceId: mockFullPoolService.id,
          date: "2026-10-17", // Sábado
          startAt: "2026-10-17T08:00:00-05:00",
          endAt: "2026-10-17T17:00:00-05:00",
          isFullPool: true,
        });
      },
      (err) => {
        assert.ok(err instanceof FullPoolDayRestrictedError);
        assert.match(err.message, /sábado/i);
        return true;
      }
    );

    // 3. Domingo (2026-10-18)
    await assert.rejects(
      async () => {
        await service.calculatePricing({
          serviceId: mockFullPoolService.id,
          date: "2026-10-18", // Domingo
          startAt: "2026-10-18T08:00:00-05:00",
          endAt: "2026-10-18T17:00:00-05:00",
          isFullPool: true,
        });
      },
      (err) => {
        assert.ok(err instanceof FullPoolDayRestrictedError);
        assert.match(err.message, /domingo/i);
        return true;
      }
    );

    // 4. Lunes Festivo en Colombia (2026-10-12, Día de la Raza)
    await assert.rejects(
      async () => {
        await service.calculatePricing({
          serviceId: mockFullPoolService.id,
          date: "2026-10-12", // Lunes Festivo
          startAt: "2026-10-12T08:00:00-05:00",
          endAt: "2026-10-12T17:00:00-05:00",
          isFullPool: true,
        });
      },
      (err) => {
        assert.ok(err instanceof FullPoolDayRestrictedError);
        assert.match(err.message, /lunes festivo/i);
        return true;
      }
    );
  });

  test("Criterio 4: Caso límite - Reserva que cumple los dos casos recibe un solo descuento de 20%, nunca 40% (RN-015)", async () => {
    // 2026-10-14 es Miércoles Y es Reserva Completa de Piscina
    const result = await service.calculatePricing({
      serviceId: mockFullPoolService.id,
      date: "2026-10-14", // Miércoles
      startAt: "2026-10-14T08:00:00-05:00",
      endAt: "2026-10-14T17:00:00-05:00",
      isFullPool: true,
    });

    assert.equal(result.isWednesday, true);
    assert.equal(result.isFullPool, true);

    // Regla RN-015: No acumulables. Debe ser exactamente 20%, JAMÁS 40%
    assert.equal(result.discountPercent, 20, "El descuento nunca debe sumar 40%");
    assert.notEqual(result.discountPercent, 40);

    const expectedDiscountAmount = (result.originalAmount * 20) / 100;
    assert.equal(result.discountAmount, expectedDiscountAmount);
    assert.equal(result.finalAmount, result.originalAmount - expectedDiscountAmount);
    assert.match(result.discountDescription, /No acumulable según RN-015/i);
  });

  test("Día normal sin promoción: Aplica tarifa completa sin descuento", async () => {
    // 2026-10-15 es Jueves (no es miércoles ni es piscina completa)
    const result = await service.calculatePricing({
      serviceId: mockCanchaService.id,
      date: "2026-10-15", // Jueves
      startAt: "2026-10-15T09:00:00-05:00",
      endAt: "2026-10-15T10:00:00-05:00",
      quantity: 1,
    });

    assert.equal(result.isWednesday, false);
    assert.equal(result.isFullPool, false);
    assert.equal(result.discountPercent, 0);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.finalAmount, result.originalAmount);
    assert.equal(result.appliedDiscount, "NONE");
    assert.equal(result.discountDescription, null);
  });
});

