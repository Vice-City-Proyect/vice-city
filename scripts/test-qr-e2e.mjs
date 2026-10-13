/**
 * Prueba de punta a punta del Escáner QR (HU13 - VCP-57) contra el servidor y la base REALES.
 *
 * Qué hace, a la vista:
 *   1. Crea datos de prueba marcados con una etiqueta TEST-HU13-E2E-xxxxxx (usuarios, reservas y tickets).
 *   2. Inicia sesión de verdad (NextAuth) como QR_VALIDATOR y como TICKET_SELLER.
 *   3. Ejecuta cada caso de la HU contra http://localhost:3000 e imprime petición y respuesta.
 *   4. Consulta la base para comprobar lo que quedó escrito (tickets, access_logs, audit_logs).
 *   5. Borra todos los datos que creó (usa --keep para conservarlos).
 *
 * Uso (en dos terminales):
 *   Terminal 1:  npm run dev
 *   Terminal 2:  npm run test:qr:e2e            (o: npm run test:qr:e2e -- --keep)
 *
 * Escribe y borra filas en la base configurada en .env (Supabase compartida): solo toca filas propias.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { checkMaintenanceDay } from "../src/features/services/utils/colombian-holidays.util.ts";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const KEEP = process.argv.includes("--keep");
const TAG = `TEST-HU13-E2E-${crypto.randomBytes(3).toString("hex")}`;
const slug = TAG.toLowerCase();
const prisma = new PrismaClient();

// ---------- presentación ----------
const col = (n) => (s) => `\x1b[${n}m${s}\x1b[0m`;
const green = col(32), red = col(31), yellow = col(33), cyan = col(36), dim = col(2), bold = col(1);
let passed = 0, failed = 0, skipped = 0;
const step = (t) => console.log(`\n${bold(cyan(`── ${t}`))}`);
const info = (t) => console.log(dim(`   ${t}`));
function check(titulo, ok, detalle = "") {
  if (ok) { passed++; console.log(`   ${green("✔")} ${titulo}${detalle ? dim(`  → ${detalle}`) : ""}`); }
  else { failed++; console.log(`   ${red("✖")} ${titulo}${detalle ? red(`  → ${detalle}`) : ""}`); }
}
const skip = (titulo, motivo) => { skipped++; console.log(`   ${yellow("○")} ${titulo}${dim(`  (omitido: ${motivo})`)}`); };

// ---------- utilidades ----------
const BOGOTA_OFFSET_MS = -5 * 3600e3;
const bogotaDate = (d) => new Date(d.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
const bogotaTime = (d) => new Date(d.getTime() + BOGOTA_OFFSET_MS).toISOString().slice(11, 16);

function cookieJar() {
  const m = new Map();
  return {
    absorb(res) {
      for (const sc of res.headers.getSetCookie?.() ?? []) {
        const [kv] = sc.split(";");
        const i = kv.indexOf("=");
        m.set(kv.slice(0, i), kv.slice(i + 1));
      }
    },
    header: () => [...m].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}

async function login(email, password) {
  const jar = cookieJar();
  const r1 = await fetch(`${BASE}/api/auth/csrf`);
  jar.absorb(r1);
  const { csrfToken } = await r1.json();
  const r2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header() },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
  });
  jar.absorb(r2);
  return jar;
}

async function http(jar, method, path, { body, headers } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(jar ? { cookie: jar.header() } : {}), "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* sin cuerpo */ }
  const short = path.length > 62 ? `${path.slice(0, 40)}…${path.slice(-18)}` : path;
  console.log(dim(`   ${method.padEnd(4)} ${short}  →  ${res.status}${json?.error ? ` ${json.error}` : ""}`));
  return { status: res.status, json, data: json?.data };
}

// ---------- datos de prueba ----------
const created = { users: [], bookings: [], tickets: [] };

async function mkUser(roleName, suffix, fullName, passwordHash) {
  const role = await prisma.roles.findFirst({ where: { name: { equals: roleName, mode: "insensitive" } } });
  if (!role) throw new Error(`No existe el rol '${roleName}' en la tabla roles`);
  const u = await prisma.users.create({
    data: {
      role_id: role.id,
      email: `${slug}-${suffix}@vicecity-test.com`,
      full_name: `${TAG} ${fullName}`,
      password_hash: passwordHash,
      is_active: true,
      metadata: { test: TAG },
    },
  });
  created.users.push(u.id);
  return u;
}

async function mkTicket(label, clientId, startAt, endAt, services, avoid = new Set()) {
  for (const svc of services) {
    if (avoid.has(svc.id)) continue;
    try {
      const b = await prisma.bookings.create({
        data: {
          user_id: clientId, service_id: svc.id, start_at: startAt, end_at: endAt,
          total_amount: 1000, status: "confirmed", notes: TAG, metadata: { test: TAG },
        },
      });
      created.bookings.push(b.id);
      const code = crypto.randomUUID().replace(/-/g, "").toUpperCase();
      const t = await prisma.tickets.create({
        data: {
          booking_id: b.id, code, holder_name: `${TAG} Cliente`, status: "valid",
          valid_from: startAt, valid_until: endAt, metadata: { test: TAG },
        },
      });
      created.tickets.push(t.id);
      info(`${label.padEnd(26)} ${svc.name.padEnd(22)} ${bogotaDate(startAt)} ${bogotaTime(startAt)}–${bogotaTime(endAt)} (Bogotá)  código ${code.slice(0, 8)}…`);
      return { code, id: t.id, serviceId: svc.id, serviceName: svc.name };
    } catch {
      // el servicio ya tiene una reserva que se solapa (restricción de exclusión): probar con otro
    }
  }
  throw new Error(`No se pudo crear la reserva de prueba '${label}': todos los servicios tienen reservas que se solapan`);
}

async function cleanup() {
  step("Limpieza: borrando los datos de prueba");
  const { users, bookings, tickets } = created;
  await prisma.audit_logs.deleteMany({ where: { OR: [{ entity_id: { in: tickets } }, { user_id: { in: users } }] } });
  await prisma.access_logs.deleteMany({ where: { OR: [{ ticket_id: { in: tickets } }, { scanned_by: { in: users } }] } });
  await prisma.bookings.deleteMany({ where: { id: { in: bookings } } }); // borra tickets en cascada
  await prisma.users.deleteMany({ where: { id: { in: users } } });
  const left = await prisma.users.count({ where: { id: { in: users } } }) + await prisma.tickets.count({ where: { id: { in: tickets } } });
  check("Datos de prueba eliminados de la base", left === 0, left === 0 ? "no queda ninguna fila" : `${left} filas sin borrar`);
}

// ---------- recorrido ----------
async function main() {
  console.log(bold(`\nEscáner QR (HU13) — prueba de punta a punta`));
  info(`Servidor: ${BASE}   Etiqueta de datos: ${TAG}${KEEP ? "   (se conservarán: --keep)" : ""}`);

  step("1. Comprobaciones previas");
  let ping;
  try { ping = await http(null, "GET", "/api/qr/PREFLIGHT0000"); }
  catch { throw new Error(`El servidor no responde en ${BASE}. Inícialo en otra terminal con: npm run dev`); }
  check("Sin sesión, el endpoint responde 401", ping.status === 401,
    ping.status === 403 ? "devolvió 403: el middleware no resuelve la sesión (bug de HU08)" : `HTTP ${ping.status}`);
  const falsa = await http(null, "GET", "/api/qr/PREFLIGHT0000", { headers: { "x-user-role": "QR_VALIDATOR", "x-user-id": crypto.randomUUID() } });
  check("Un rol falsificado por cabecera sigue dando 401", falsa.status === 401, `HTTP ${falsa.status}`);

  step("2. Creación de datos de prueba (usuarios, reservas y tickets)");
  const password = crypto.randomBytes(9).toString("base64url") + "9aA!";
  const hash = await bcrypt.hash(password, 10);
  const validador = await mkUser("qr_validator", "validador", "Validador QR", hash);
  const taquilla = await mkUser("ticket_seller", "taquilla", "Vendedor", hash);
  const cliente = await mkUser("customer", "cliente", "Cliente", hash);
  info(`Usuarios: validador (qr_validator), taquilla (ticket_seller) y cliente (customer)`);

  const services = await prisma.services.findMany({ where: { is_active: true }, orderBy: { name: "asc" } });
  const now = Date.now();
  const manana = new Date(now + 24 * 3600e3);
  const A = await mkTicket("A: dentro de su franja", cliente.id, new Date(now - 2 * 60e3), new Date(now + 58 * 60e3), services);
  const B = await mkTicket("B: para escaneo simultáneo", cliente.id, new Date(now - 2 * 60e3), new Date(now + 58 * 60e3), services, new Set([A.serviceId]));
  const C = await mkTicket("C: reserva de mañana", cliente.id, new Date(`${bogotaDate(manana)}T10:00:00-05:00`), new Date(`${bogotaDate(manana)}T11:00:00-05:00`), services);
  const D = await mkTicket("D: franja ya terminada", cliente.id, new Date(now - 180 * 60e3), new Date(now - 120 * 60e3), services);

  const hoy = bogotaDate(new Date());
  const mantenimiento = checkMaintenanceDay(hoy);
  if (mantenimiento.isMaintenance) info(`HOY (${hoy}) ES DÍA DE MANTENIMIENTO: se comprobará el bloqueo en lugar del ingreso.`);

  step("3. Inicio de sesión real (NextAuth)");
  const jVal = await login(validador.email, password);
  const jTaq = await login(taquilla.email, password);
  info("Sesiones iniciadas como QR_VALIDATOR y TICKET_SELLER");

  step("4. Permisos");
  const rTaq = await http(jTaq, "GET", `/api/qr/${A.code}`);
  check("TICKET_SELLER no puede consultar un QR", rTaq.status === 403, `HTTP ${rTaq.status}`);
  const rTaqPost = await http(jTaq, "POST", `/api/qr/${A.code}/entry`);
  check("TICKET_SELLER no puede confirmar un ingreso", rTaqPost.status === 403, `HTTP ${rTaqPost.status}`);

  step("5. Consulta del QR (GET /api/qr/{code})");
  const gA = await http(jVal, "GET", `/api/qr/${A.code}`);
  const d = gA.data;
  check("Devuelve cliente, servicio, fecha, hora y estado", gA.status === 200 && !!d?.customer?.fullName && !!d?.service?.name && !!d?.schedule?.startTime && d?.status === "VALID",
    d ? `${d.customer.fullName} · ${d.service.name} · ${d.schedule.date} ${d.schedule.startTime}–${d.schedule.endTime} · ${d.status}` : `HTTP ${gA.status}`);
  if (mantenimiento.isMaintenance) {
    check("En día de mantenimiento no permite el ingreso", d?.accessValidation?.canEnter === false && d?.accessValidation?.reasonCode === "MAINTENANCE_DAY_CLOSED", d?.accessValidation?.reasonCode);
  } else {
    check("Dentro de la franja permite el ingreso", d?.accessValidation?.canEnter === true, `${d?.accessValidation?.reasonCode}${d?.accessValidation?.isLateEntry ? " (tardío)" : ""}`);
  }
  const gC = await http(jVal, "GET", `/api/qr/${C.code}`);
  check("QR de otra fecha: no permite el ingreso", gC.status === 200 && gC.data?.accessValidation?.canEnter === false, gC.data?.accessValidation?.reasonCode);
  const gD = await http(jVal, "GET", `/api/qr/${D.code}`);
  check("QR con la franja ya terminada: no permite el ingreso", gD.status === 200 && gD.data?.accessValidation?.canEnter === false, gD.data?.accessValidation?.reasonCode);
  const g404 = await http(jVal, "GET", `/api/qr/${"F".repeat(32)}`);
  check("QR inexistente: 404 con mensaje claro", g404.status === 404 && !!g404.json?.message, g404.json?.message);
  const g400 = await http(jVal, "GET", `/api/qr/abc!`);
  check("Código con formato inválido: 400", g400.status === 400, g400.json?.message);

  step("6. Confirmar ingreso (POST /api/qr/{code}/entry)");
  let successB = null;
  if (mantenimiento.isMaintenance) {
    const pA = await http(jVal, "POST", `/api/qr/${A.code}/entry`);
    check("En día de mantenimiento el ingreso es rechazado (422)", pA.status === 422 && pA.json?.error === "MAINTENANCE_DAY_CLOSED", `HTTP ${pA.status} ${pA.json?.error ?? ""}`);
    skip("Marcar USED, reingreso y escaneos simultáneos", "hoy es día de mantenimiento; vuelve a ejecutarlo otro día");
  } else {
    const pA = await http(jVal, "POST", `/api/qr/${A.code}/entry`, { body: { accessPoint: "Torniquete E2E" } });
    check("Permitir ingreso marca el ticket como USED", pA.status === 200 && pA.data?.status === "USED", `HTTP ${pA.status} · ${pA.data?.status ?? pA.json?.error}`);
    const pA2 = await http(jVal, "POST", `/api/qr/${A.code}/entry`);
    check("Un reingreso del mismo QR es rechazado (409)", pA2.status === 409 && pA2.json?.error === "ALREADY_USED", pA2.json?.message);
    const gA2 = await http(jVal, "GET", `/api/qr/${A.code}`);
    check("Al consultarlo de nuevo figura como USED y sin acceso", gA2.data?.status === "USED" && gA2.data?.accessValidation?.canEnter === false, gA2.data?.accessValidation?.reasonCode);

    info("Dos escaneos del MISMO QR lanzados a la vez:");
    const [x, y] = await Promise.all([
      http(jVal, "POST", `/api/qr/${B.code}/entry`, { body: { accessPoint: "Torniquete A" } }),
      http(jVal, "POST", `/api/qr/${B.code}/entry`, { body: { accessPoint: "Torniquete B" } }),
    ]);
    const statuses = [x.status, y.status].sort();
    check("Solo uno marca el ingreso (200) y el otro es rechazado (409)", statuses[0] === 200 && statuses[1] === 409, `resultados: ${statuses.join(" y ")}`);
    successB = true;
  }
  const pC = await http(jVal, "POST", `/api/qr/${C.code}/entry`);
  check("Confirmar un QR de otra fecha es rechazado (422)", pC.status === 422, pC.json?.message);
  const pD = await http(jVal, "POST", `/api/qr/${D.code}/entry`);
  check("Confirmar un QR con la franja terminada es rechazado (422)", pD.status === 422, pD.json?.message);

  step("7. Verificación directa en la base de datos");
  const ids = [A.id, B.id, C.id, D.id];
  const dbT = Object.fromEntries((await prisma.tickets.findMany({ where: { id: { in: ids } } })).map((t) => [t.id, t]));
  const accessLogs = await prisma.access_logs.findMany({ where: { ticket_id: { in: ids } }, orderBy: { created_at: "asc" } });
  const audit = await prisma.audit_logs.findMany({ where: { entity: "tickets", entity_id: { in: ids } } });
  if (!mantenimiento.isMaintenance) {
    check("tickets.status = 'used' (minúscula, como exige la base) en A y B", dbT[A.id].status === "used" && dbT[B.id].status === "used", `A=${dbT[A.id].status}, B=${dbT[B.id].status}`);
    check("Los tickets C y D siguen en 'valid'", dbT[C.id].status === "valid" && dbT[D.id].status === "valid");
    check("access_logs: exactamente 1 ingreso 'granted' por ticket A y B",
      accessLogs.filter((l) => l.ticket_id === A.id && l.result === "granted").length === 1 && accessLogs.filter((l) => l.ticket_id === B.id && l.result === "granted").length === 1);
    check("audit_logs: 1 evento TICKET_ENTRY_CONFIRMED por ticket A y B, a nombre del validador",
      audit.length === 2 && audit.every((a) => a.action === "TICKET_ENTRY_CONFIRMED" && a.user_id === validador.id), `${audit.length} eventos`);
  } else {
    check("tickets siguen en 'valid' (nadie ingresó)", ids.every((i) => dbT[i].status === "valid"));
  }
  check("Los intentos denegados también quedan en access_logs ('denied')", accessLogs.some((l) => l.result === "denied"), `${accessLogs.filter((l) => l.result === "denied").length} intentos denegados`);
  console.log(dim("\n   access_logs registrados:"));
  const nombre = { [A.id]: "A", [B.id]: "B", [C.id]: "C", [D.id]: "D" };
  for (const l of accessLogs) console.log(dim(`     ticket ${nombre[l.ticket_id]}  ${l.result.padEnd(7)} ${String(l.reason).padEnd(22)} ${l.access_point}`));
}

let fatal = null;
try { await main(); }
catch (e) { fatal = e; console.log(`\n${red("✖ Error:")} ${e.message}`); failed++; }
finally {
  try {
    if (!KEEP && created.users.length) await cleanup();
    else if (KEEP) console.log(dim(`\n   Datos conservados con la etiqueta ${TAG}.`));
  } catch (e) { console.log(red(`   No se pudo limpiar: ${e.message}`)); failed++; }
  await prisma.$disconnect();
}

console.log(`\n${bold("Resumen:")} ${green(`${passed} correctas`)}  ${failed ? red(`${failed} con error`) : "0 con error"}  ${skipped ? yellow(`${skipped} omitidas`) : ""}\n`);
process.exit(failed ? 1 : 0);
