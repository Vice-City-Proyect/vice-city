import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  mapServiceRecordToUi,
  buildServiceMutationPayload,
  resolveCategoryId,
} from "../../src/features/services/api/service-mappers.ts";

const CATEGORIES = [
  { id: "cat-pool", name: "Piscinas", slug: "piscinas" },
  { id: "cat-court", name: "Canchas", slug: "canchas" },
  { id: "cat-gym", name: "Gimnasio", slug: "gimnasio" },
  { id: "cat-wet", name: "Zona húmeda", slug: "zona-humeda" },
];

function createRecord(overrides = {}) {
  return {
    id: "srv-1",
    category_id: "cat-court",
    name: "Cancha microfútbol",
    slug: "cancha-micro",
    description: "Cancha sintética",
    price: "35000",
    capacity: 10,
    image_url: null,
    is_active: true,
    categories: { id: "cat-court", name: "Canchas", slug: "canchas" },
    ...overrides,
  };
}

describe("Integración servicios: mapeo backend → UI", () => {
  test("Mapea campos básicos y normaliza el precio numérico", () => {
    const service = mapServiceRecordToUi(createRecord());

    assert.equal(service.id, "srv-1");
    assert.equal(service.name, "Cancha microfútbol");
    assert.equal(service.price, 35000);
    assert.equal(service.capacity, 10);
    assert.equal(service.status, "ACTIVE");
    assert.equal(service.category, "SOCCER_MICRO");
  });

  test("Precio no numérico no produce NaN en la UI (BAJO-2)", () => {
    const service = mapServiceRecordToUi(
      createRecord({ price: "PRECIO_INVALIDO" })
    );

    assert.ok(Number.isFinite(service.price));
    assert.equal(service.price, 0);
  });

  test("Resuelve la categoría de la UI según el slug y el texto del servicio", () => {
    assert.equal(
      mapServiceRecordToUi(
        createRecord({ name: "Piscina adultos", slug: "piscina-adultos", categories: { slug: "piscinas" } })
      ).category,
      "POOL"
    );
    assert.equal(
      mapServiceRecordToUi(
        createRecord({ name: "Gimnasio", slug: "gimnasio", categories: { slug: "gimnasio" } })
      ).category,
      "GYM"
    );
    assert.equal(
      mapServiceRecordToUi(
        createRecord({ name: "Sauna", slug: "sauna", categories: { slug: "zona-humeda" } })
      ).category,
      "WET_AREA"
    );
    assert.equal(
      mapServiceRecordToUi(
        createRecord({ name: "Fútbol grande", slug: "cancha-futbol-grande" })
      ).category,
      "SOCCER_LARGE"
    );
    assert.equal(
      mapServiceRecordToUi(createRecord({ name: "Polideportiva", slug: "cancha-multiple" })).category,
      "MULTI_COURT"
    );
  });

  test("Traduce la modalidad del backend a la modalidad de la UI", () => {
    const exclusive = mapServiceRecordToUi(
      createRecord({ metadata: { modality: "EXCLUSIVE_RESERVATION" } })
    );
    assert.equal(exclusive.modality, "FIXED_HOUR");
    assert.equal(exclusive.priceUnit, "HOUR");

    const perPerson = mapServiceRecordToUi(createRecord({ metadata: {} }));
    assert.equal(perPerson.modality, "PER_PERSON_HOUR");
    assert.equal(perPerson.priceUnit, "PERSON_HOUR");
  });

  test("Aplica una imagen de respaldo si el backend no expone image_url", () => {
    const service = mapServiceRecordToUi(createRecord({ image_url: "   " }));
    assert.ok(service.image.startsWith("/"));
  });

  test("Marcar is_active=false produce estado INACTIVE", () => {
    const service = mapServiceRecordToUi(createRecord({ is_active: false }));
    assert.equal(service.status, "INACTIVE");
  });
});

describe("Integración servicios: construcción del payload", () => {
  test("resolveCategoryId asocia cada categoría de la UI a su id del backend", () => {
    assert.equal(resolveCategoryId("POOL", CATEGORIES), "cat-pool");
    assert.equal(resolveCategoryId("SOCCER_LARGE", CATEGORIES), "cat-court");
    assert.equal(resolveCategoryId("SOCCER_MICRO", CATEGORIES), "cat-court");
    assert.equal(resolveCategoryId("MULTI_COURT", CATEGORIES), "cat-court");
    assert.equal(resolveCategoryId("GYM", CATEGORIES), "cat-gym");
    assert.equal(resolveCategoryId("WET_AREA", CATEGORIES), "cat-wet");
  });

  test("buildServiceMutationPayload traduce la modalidad de la UI al backend", () => {
    const payload = buildServiceMutationPayload(
      {
        id: "srv-1",
        name: "  Cancha  ",
        category: "SOCCER_LARGE",
        description: " Desc ",
        price: 40000,
        priceUnit: "HOUR",
        modality: "FIXED_HOUR",
        capacity: 22,
        status: "ACTIVE",
        schedule: { open: "08:00", close: "17:00", closedDays: [1] },
        image: "/cancha-11.jpeg",
        resource: "Cancha",
      },
      CATEGORIES
    );

    assert.equal(payload.category_id, "cat-court");
    assert.equal(payload.name, "Cancha");
    assert.equal(payload.description, "Desc");
    assert.equal(payload.modality, "EXCLUSIVE_RESERVATION");
    assert.equal(payload.price, 40000);
  });

  test("buildServiceMutationPayload falla si la categoría no existe en el backend", () => {
    assert.throws(
      () =>
        buildServiceMutationPayload(
          {
            id: "srv-1",
            name: "X",
            category: "POOL",
            description: "",
            price: 1,
            priceUnit: "PERSON_HOUR",
            modality: "PER_PERSON_HOUR",
            capacity: 1,
            status: "ACTIVE",
            schedule: { open: "08:00", close: "17:00", closedDays: [] },
            image: "",
            resource: "",
          },
          []
        ),
      /No se encontró la categoría/
    );
  });
});
