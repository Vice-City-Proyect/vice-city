import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePricing,
  computeDurationHours,
  InvalidPricingError,
  isFullPool,
} from "../../src/features/payments/lib/pricing.ts";

function addDays(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Encuentra el próximo día miércoles (getDay() === 3) a partir de hoy. */
function nextWednesday(hour = 10) {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(i, hour);
    if (d.getDay() === 3) return d;
  }
  throw new Error("No se encontró un miércoles");
}

/** Día futuro que no sea lunes (mantenimiento) ni miércoles (descuento 20%). */
function nonHoliday(hour = 10) {
  for (let i = 1; ; i++) {
    const d = addDays(i, hour);
    if (d.getDay() !== 1 && d.getDay() !== 3) return d;
  }
}

describe("Pricing HU: Motor de precios del servidor", () => {
  it("PER_PERSON_HOUR: precio × cantidad × horas sin descuento", () => {
    const start = nonHoliday(10);
    const end = new Date(start.getTime() + 3600 * 1000);
    const r = calculatePricing({
      unitPrice: 2000,
      modality: "PER_PERSON_HOUR",
      quantity: 2,
      startAt: start,
      endAt: end,
      capacity: 50,
    });
    assert.equal(r.baseAmount, 4000);
    assert.equal(r.discountPercent, 0);
    assert.equal(r.totalAmount, 4000);
    assert.equal(r.durationHours, 1);
    assert.equal(r.fullPool, false);
  });

  it("Miércoles aplica 20% de descuento (cualquier servicio)", () => {
    const start = nextWednesday(10);
    const end = new Date(start.getTime() + 3600 * 1000);
    const r = calculatePricing({
      unitPrice: 2000,
      modality: "PER_PERSON_HOUR",
      quantity: 2,
      startAt: start,
      endAt: end,
      capacity: 50,
    });
    assert.equal(r.discountPercent, 20);
    assert.equal(r.totalAmount, 3200);
    assert.equal(r.wednesdayDiscount, true);
  });

  it("Piscina completa aplica 20% (cantidad >= aforo) en día no miércoles", () => {
    const start = nonHoliday(12);
    const end = new Date(start.getTime() + 3600 * 1000);
    const r = calculatePricing({
      unitPrice: 2000,
      modality: "PER_PERSON_HOUR",
      quantity: 50,
      startAt: start,
      endAt: end,
      capacity: 50,
    });
    assert.equal(r.fullPool, true);
    assert.equal(r.fullPoolDiscount, true);
    assert.equal(r.baseAmount, 100000);
    assert.equal(r.discountPercent, 20);
    assert.equal(r.totalAmount, 80000);
  });

  it("Los descuentos NO se acumulan (miércoles + piscina completa = 20% único)", () => {
    const start = nextWednesday(11);
    const end = new Date(start.getTime() + 3600 * 1000);
    const r = calculatePricing({
      unitPrice: 2000,
      modality: "PER_PERSON_HOUR",
      quantity: 50,
      startAt: start,
      endAt: end,
      capacity: 50,
    });
    assert.equal(r.wednesdayDiscount, true);
    assert.equal(r.fullPoolDiscount, false);
    assert.equal(r.discountPercent, 20); // un solo descuento
    assert.equal(r.totalAmount, 80000); // no 64000
  });

  it("EXCLUSIVE_RESERVATION (cancha): precio por hora, sin multiplicar por personas", () => {
    const start = nonHoliday(11);
    const end = new Date(start.getTime() + 2 * 3600 * 1000);
    const r = calculatePricing({
      unitPrice: 140000,
      modality: "EXCLUSIVE_RESERVATION",
      quantity: 2,
      startAt: start,
      endAt: end,
      capacity: 11,
    });
    assert.equal(r.baseAmount, 280000);
    assert.equal(r.totalAmount, 280000);
  });

  it("Caso límite: duración máxima de 9 horas es aceptada", () => {
    const start = nonHoliday(8);
    const end = new Date(start.getTime() + 9 * 3600 * 1000);
    const r = calculatePricing({
      unitPrice: 1000,
      modality: "PER_PERSON_HOUR",
      quantity: 1,
      startAt: start,
      endAt: end,
      capacity: 1,
    });
    assert.equal(r.durationHours, 9);
  });

  it("Caso de error: duración en fracciones de hora es rechazada", () => {
    const start = new Date("2026-01-05T10:00:00.000Z");
    const end = new Date("2026-01-05T11:30:00.000Z");
    assert.throws(() => computeDurationHours(start, end), InvalidPricingError);
  });

  it("Caso de error: duración fuera de 1..9 horas es rechazada", () => {
    const start = new Date("2026-01-05T10:00:00.000Z");
    const end = new Date("2026-01-05T20:00:00.000Z");
    assert.throws(() => computeDurationHours(start, end), InvalidPricingError);
  });

  it("isFullPool: identifica reserva de aforo completo", () => {
    assert.equal(isFullPool(50, 50), true);
    assert.equal(isFullPool(49, 50), false);
    assert.equal(isFullPool(0, 50), false);
  });
});