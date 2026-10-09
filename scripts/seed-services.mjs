/**
 * Script de Inicialización y Verificación de Datos Iniciales (RN-004 / SRS v1.1)
 *
 * Siembra las 4 categorías base y los servicios oficiales del complejo Vice City
 * respetando las capacidades, duraciones, precios e identificadores del SRS.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const INITIAL_CATEGORIES = [
  {
    name: "Piscinas",
    slug: "piscinas",
    description: "Zona de piscinas recreativas y deportivas",
    sort_order: 1,
  },
  {
    name: "Canchas",
    slug: "canchas",
    description: "Canchas deportivas sintéticas y múltiples",
    sort_order: 2,
  },
  {
    name: "Gimnasio",
    slug: "gimnasio",
    description: "Área de acondicionamiento físico y pesas",
    sort_order: 3,
  },
  {
    name: "Zona Húmeda",
    slug: "zona-humeda",
    description: "Sauna, turco y jacuzzi de relajación",
    sort_order: 4,
  },
];

export const INITIAL_SERVICES = [
  // Categoría: Piscinas
  {
    category_slug: "piscinas",
    name: "Piscina Adultos 1",
    slug: "piscina-adultos-1",
    description: "Piscina para adultos #1",
    price: 2000,
    duration_minutes: 60,
    capacity: 50,
    metadata: { modality: "PER_PERSON_HOUR", category: "pools" },
  },
  {
    category_slug: "piscinas",
    name: "Piscina Adultos 2",
    slug: "piscina-adultos-2",
    description: "Piscina para adultos #2",
    price: 2000,
    duration_minutes: 60,
    capacity: 50,
    metadata: { modality: "PER_PERSON_HOUR", category: "pools" },
  },
  {
    category_slug: "piscinas",
    name: "Piscina Adultos 3",
    slug: "piscina-adultos-3",
    description: "Piscina para adultos #3",
    price: 2000,
    duration_minutes: 60,
    capacity: 50,
    metadata: { modality: "PER_PERSON_HOUR", category: "pools" },
  },
  {
    category_slug: "piscinas",
    name: "Piscina Niños",
    slug: "piscina-ninos",
    description: "Piscina recreativa infantil",
    price: 2000,
    duration_minutes: 60,
    capacity: 50,
    metadata: { modality: "PER_PERSON_HOUR", category: "pools" },
  },
  // Categoría: Canchas
  {
    category_slug: "canchas",
    name: "Cancha Fútbol Grande",
    slug: "cancha-futbol-grande",
    description: "Cancha de fútbol 11 profesional",
    price: 140000,
    duration_minutes: 60,
    capacity: 11,
    metadata: { modality: "EXCLUSIVE_RESERVATION", category: "courts" },
  },
  {
    category_slug: "canchas",
    name: "Cancha Microfútbol",
    slug: "cancha-microfutbol",
    description: "Cancha sintética de microfútbol",
    price: 80000,
    duration_minutes: 60,
    capacity: 11,
    metadata: { modality: "EXCLUSIVE_RESERVATION", category: "courts" },
  },
  {
    category_slug: "canchas",
    name: "Cancha Múltiple",
    slug: "cancha-multiple",
    description: "Cancha polideportiva (baloncesto, voleibol)",
    price: 70000,
    duration_minutes: 60,
    capacity: 11,
    metadata: { modality: "EXCLUSIVE_RESERVATION", category: "courts" },
  },
  // Categoría: Gimnasio
  {
    category_slug: "gimnasio",
    name: "Gimnasio",
    slug: "gimnasio",
    description: "Acceso al gimnasio con máquinas y pesas",
    price: 2000,
    duration_minutes: 60,
    capacity: 20,
    metadata: { modality: "PER_PERSON_HOUR", category: "gym" },
  },
  // Categoría: Zona Húmeda
  {
    category_slug: "zona-humeda",
    name: "Zona Húmeda",
    slug: "zona-humeda",
    description: "Acceso a sauna, turco y jacuzzi",
    price: 4000,
    duration_minutes: 60,
    capacity: 10,
    metadata: { modality: "PER_PERSON_HOUR", category: "wet_area" },
  },
];

export async function seedCategoriesAndServices() {
  console.log("🌱 Sembrando categorías iniciales (RN-004)...");
  const categoryMap = new Map();

  for (const cat of INITIAL_CATEGORIES) {
    const upserted = await prisma.categories.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        sort_order: cat.sort_order,
        is_active: true,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sort_order: cat.sort_order,
        is_active: true,
      },
    });
    categoryMap.set(cat.slug, upserted.id);
    console.log(`   ✅ Categoría: ${upserted.name} (${upserted.slug})`);
  }

  console.log("\n🌱 Sembrando servicios iniciales (RN-004)...");
  for (const srv of INITIAL_SERVICES) {
    const categoryId = categoryMap.get(srv.category_slug);
    if (!categoryId) continue;

    const upserted = await prisma.services.upsert({
      where: { slug: srv.slug },
      update: {
        category_id: categoryId,
        name: srv.name,
        description: srv.description,
        price: srv.price,
        duration_minutes: srv.duration_minutes,
        capacity: srv.capacity,
        is_active: true,
        metadata: srv.metadata,
      },
      create: {
        category_id: categoryId,
        name: srv.name,
        slug: srv.slug,
        description: srv.description,
        price: srv.price,
        duration_minutes: srv.duration_minutes,
        capacity: srv.capacity,
        is_active: true,
        metadata: srv.metadata,
      },
    });
    console.log(`   ✅ Servicio: ${upserted.name} [Aforo: ${upserted.capacity}, Precio: $${upserted.price}]`);
  }

  console.log("\n🎉 Siembra completada exitosamente.");
}

// Si se ejecuta directamente desde línea de comandos
if (process.argv[1]?.endsWith("seed-services.mjs")) {
  seedCategoriesAndServices()
    .catch((e) => {
      console.error("❌ Error sembrando servicios:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
