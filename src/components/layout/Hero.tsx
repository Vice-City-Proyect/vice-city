"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

// ── Shared ease ──────────────────────────────────────────────────────────────
const ease = [0.25, 0.1, 0.25, 1] as const;

// ── Animation variants ───────────────────────────────────────────────────────
const navVariant: Variants = {
  hidden: { opacity: 0, y: -12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const imageVariant: Variants = {
  hidden: { opacity: 0, scale: 1.04 },
  show: { opacity: 1, scale: 1, transition: { duration: 1.4, ease } },
};

const fadeUpVariant = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease, delay } },
});

// ── Services pill data ───────────────────────────────────────────────────────
const SERVICES = [
  { label: "Piscinas",    icon: "🏊" },
  { label: "Canchas",     icon: "⚽" },
  { label: "Gimnasio",    icon: "🏋️" },
  { label: "Zona Húmeda", icon: "♨️" },
] as const;

// ── Wednesday discount badge ─────────────────────────────────────────────────
function WednesdayBadge() {
  const day = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  ).getDay(); // 0=Sun … 3=Wed
  if (day !== 3) return null;
  return (
    <motion.div
      className="inline-flex items-center gap-2 px-3 py-1.5"
      style={{
        backgroundColor: "rgba(176,191,63,0.12)",
        border: "1px solid rgba(176,191,63,0.45)",
      }}
      variants={fadeUpVariant(0.48)}
      initial="hidden"
      animate="show"
    >
      <span
        className="text-[10px] font-black tracking-[0.25em] uppercase"
        style={{ color: "#B0BF3F" }}
      >
        Miércoles −20%
      </span>
      <span className="text-[10px] text-white/50 tracking-wider">en todas las reservas</span>
    </motion.div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Hero() {
  return (
    <section
      className="relative w-full overflow-hidden bg-[#080808]"
      style={{ minHeight: "100vh" }}
    >
      {/* ── Athlete image ──────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 z-0"
        variants={imageVariant}
        initial="hidden"
        animate="show"
      >
        <Image
          src="/hero-athlete.webp"
          alt="Atleta Vice City Iguana Club"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
      </motion.div>

      {/* ── Overlays ───────────────────────────────────────────────────────── */}
      {/* Izquierda negro → derecha transparente (la luz viene de la izq) */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.75) 35%, rgba(8,8,8,0.35) 65%, rgba(8,8,8,0.05) 100%)",
        }}
      />
      {/* Top vignette — navbar legibility */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,8,8,0.55) 0%, transparent 22%)",
        }}
      />
      {/* Bottom vignette — lower content legibility */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(8,8,8,0.88) 0%, transparent 42%)",
        }}
      />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <motion.nav
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-12 py-7"
        variants={navVariant}
        initial="hidden"
        animate="show"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="flex items-baseline">
          <span className="text-white font-black text-[15px] tracking-[0.18em] uppercase leading-none">
            Vice City
          </span>
          <span
            className="font-black text-[15px] tracking-[0.18em] uppercase italic ml-2 leading-none"
            style={{ color: "#B0BF3F" }}
          >
            Iguana Club
          </span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-9 text-[11px] font-semibold tracking-[0.2em] uppercase text-white/75">
          {(["Home", "Services", "About", "Contact"] as const).map((item) => (
            <li key={item}>
              <Link
                href={item === "Home" ? "/" : `#${item.toLowerCase()}`}
                className="relative pb-px transition-colors duration-200 hover:text-white"
                style={item === "Home" ? { color: "#ffffff" } : undefined}
              >
                {item}
                {item === "Home" && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ backgroundColor: "#B0BF3F" }}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <Link
          href="/client"
          className="hidden md:inline-flex items-center gap-2.5 border text-[11px] font-bold tracking-[0.18em] uppercase px-5 py-2.5 transition-all duration-200"
          style={{ borderColor: "#B0BF3F", color: "#B0BF3F" }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.backgroundColor = "#B0BF3F";
            el.style.color = "#080808";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.backgroundColor = "transparent";
            el.style.color = "#B0BF3F";
          }}
        >
          Book Your Court
          <span aria-hidden="true" className="text-base leading-none">→</span>
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-2 text-white"
          aria-label="Open menu"
        >
          <span className="block w-[22px] h-[1.5px] bg-white" />
          <span className="block w-[22px] h-[1.5px] bg-white" />
          <span className="block w-[14px] h-[1.5px] bg-white" />
        </button>
      </motion.nav>

      {/* ── Main headline ──────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 z-20 pointer-events-none select-none flex flex-col justify-center"
        aria-hidden="true"
      >
        <motion.span
          className="block w-px self-start ml-8 md:ml-12 mb-3"
          style={{ height: 44, backgroundColor: "rgba(176,191,63,0.45)" }}
          variants={fadeUpVariant(0.1)}
          initial="hidden"
          animate="show"
        />

        <motion.span
          className="block font-black uppercase leading-[0.88] tracking-[-0.02em] text-white pl-8 md:pl-12"
          style={{
            fontSize: "clamp(68px, 15vw, 196px)",
            textShadow: "0 2px 40px rgba(0,0,0,0.35)",
          }}
          variants={fadeUpVariant(0.22)}
          initial="hidden"
          animate="show"
        >
          PLAY
        </motion.span>

        <motion.span
          className="block font-black uppercase leading-[0.88] tracking-[-0.02em] pl-8 md:pl-12"
          style={{
            fontSize: "clamp(68px, 15vw, 196px)",
            color: "#B0BF3F",
            textShadow: "0 2px 60px rgba(176,191,63,0.15)",
          }}
          variants={fadeUpVariant(0.36)}
          initial="hidden"
          animate="show"
        >
          STRONG.
        </motion.span>
      </div>

      {/* ── Bottom-left: copy + wednesday badge + services + CTA ───────────── */}
      <div className="absolute bottom-8 md:bottom-12 left-8 md:left-12 z-30 flex flex-col gap-3 md:gap-3.5 max-w-sm">

        {/* Eyebrow */}
        <motion.p
          className="text-white/50 text-[10px] font-semibold tracking-[0.3em] uppercase"
          variants={fadeUpVariant(0.50)}
          initial="hidden"
          animate="show"
        >
          Premium Sports Experience
        </motion.p>

        {/* Tagline */}
        <motion.p
          className="text-white text-xl md:text-2xl font-light leading-[1.3]"
          variants={fadeUpVariant(0.58)}
          initial="hidden"
          animate="show"
        >
          Reserva tu espacio.<br />Llega y juega.
        </motion.p>

        {/* Wednesday discount badge — solo se muestra en miércoles */}
        <WednesdayBadge />

        {/* Services pills */}
        <motion.div
          className="flex flex-wrap gap-2"
          variants={fadeUpVariant(0.64)}
          initial="hidden"
          animate="show"
        >
          {SERVICES.map(({ label, icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold tracking-[0.15em] uppercase text-white/65"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </span>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={fadeUpVariant(0.74)}
          initial="hidden"
          animate="show"
        >
          <Link
            href="/client"
            className="inline-flex items-center gap-3 text-[11px] font-black tracking-[0.2em] uppercase px-6 py-[14px] w-fit transition-all duration-200"
            style={{ backgroundColor: "#B0BF3F", color: "#080808" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#ffffff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#B0BF3F";
            }}
          >
            Reservar Ahora
            <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </div>

      {/* ── Bottom-right: location + hours ─────────────────────────────────── */}
      <motion.div
        className="absolute bottom-8 md:bottom-12 right-8 md:right-12 z-30 text-right flex flex-col items-end gap-1"
        variants={fadeUpVariant(0.64)}
        initial="hidden"
        animate="show"
      >
        <p className="text-white/45 text-[10px] font-semibold tracking-[0.25em] uppercase">
          Barranquilla / Colombia
        </p>
        <p className="text-white/45 text-[10px] font-semibold tracking-[0.25em] uppercase">
          Abierto todos los días
        </p>
        <p
          className="text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5"
          style={{ color: "#B0BF3F" }}
        >
          8:00 AM – 5:00 PM
        </p>
        <div
          className="mt-2 h-px"
          style={{ width: 28, backgroundColor: "rgba(176,191,63,0.4)" }}
        />
      </motion.div>

    </section>
  );
}
