import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  mapServiceItemToClientItem,
  getFallbackImageForService,
} from "../../src/features/services/components/ClientServiceCard.tsx";

describe("Catálogo de clientes: Mapeo y adaptabilidad de datos reales", () => {
  const mockServiceItem = {
    id: "0420e420-e6a1-43cb-9d68-755c9a7740cd",
    category_id: "172842fe-0f4b-49a1-a2e7-dc864b940f0f",
    name: "Cancha Microfútbol",
    slug: "cancha-microfutbol",
    description: "Cancha sintética de microfútbol",
    price: 80000,
    currency: "COP",
    duration_minutes: 60,
    capacity: 11,
    image_url: null,
    is_active: true,
    category: {
      id: "172842fe-0f4b-49a1-a2e7-dc864b940f0f",
      name: "Canchas",
      slug: "canchas",
    },
  };

  test("Mapea campos de ServiceItem del backend al modelo de tarjeta de cliente", () => {
    const item = mapServiceItemToClientItem(mockServiceItem);

    assert.equal(item.id, "0420e420-e6a1-43cb-9d68-755c9a7740cd");
    assert.equal(item.title, "Cancha Microfútbol");
    assert.equal(item.description, "Cancha sintética de microfútbol");
    assert.equal(item.price, 80000);
    assert.equal(item.modality, "Por hora fija");
    assert.equal(item.capacityLabel, "11 jugadores");
    assert.equal(item.image, "/cancha-micro.jpeg");
    assert.equal(item.availability.tone, "success");
    assert.equal(item.availability.label, "Disponible hoy");
    assert.equal(item.categoryId, "172842fe-0f4b-49a1-a2e7-dc864b940f0f");
    assert.equal(item.categoryName, "Canchas");
  });

  test("Mapea modalidad y capacidad correctamente para servicios individuales", () => {
    const poolService = {
      id: "0a4a0a08-91be-4dc4-9bb3-270b306c2844",
      category_id: "c0577581-dece-4ce3-94f3-c6faeec935e8",
      name: "Piscina Adultos 1",
      slug: "piscina-adultos-1",
      description: "Piscina para adultos #1",
      price: 2000,
      currency: "COP",
      duration_minutes: 60,
      capacity: 50,
      image_url: null,
      is_active: true,
      category: {
        id: "c0577581-dece-4ce3-94f3-c6faeec935e8",
        name: "Piscinas",
        slug: "piscinas",
      },
    };

    const item = mapServiceItemToClientItem(poolService);

    assert.equal(item.modality, "Por persona y hora");
    assert.equal(item.capacityLabel, "50 personas / hora");
    assert.equal(item.image, "/piscina-adultos.jpeg");
  });

  test("Servicio inactivo se mapea con tono danger y etiqueta No disponible", () => {
    const inactiveService = {
      ...mockServiceItem,
      is_active: false,
    };

    const item = mapServiceItemToClientItem(inactiveService);
    assert.equal(item.availability.tone, "danger");
    assert.equal(item.availability.label, "No disponible");
  });

  test("Respeta image_url del backend si está configurada", () => {
    const customImageService = {
      ...mockServiceItem,
      image_url: "https://example.com/custom-court.jpg",
    };

    const item = mapServiceItemToClientItem(customImageService);
    assert.equal(item.image, "https://example.com/custom-court.jpg");
  });

  test("Resolución de imágenes de respaldo para todos los servicios del complejo", () => {
    assert.equal(getFallbackImageForService("piscina-ninos", "piscinas"), "/piscina-ninos.jpeg");
    assert.equal(getFallbackImageForService("piscina-adultos-1", "piscinas"), "/piscina-adultos.jpeg");
    assert.equal(getFallbackImageForService("cancha-futbol-grande", "canchas"), "/cancha-11.jpeg");
    assert.equal(getFallbackImageForService("cancha-microfutbol", "canchas"), "/cancha-micro.jpeg");
    assert.equal(getFallbackImageForService("cancha-multiple", "canchas"), "/polideportiva.jpeg");
    assert.equal(getFallbackImageForService("gimnasio", "gimnasio"), "/gym.jpeg");
    assert.equal(getFallbackImageForService("zona-humeda", "zona-humeda"), "/sauna.jpeg");
  });
});

