"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Waves,
  Baby,
  Trophy,
  Goal,
  Activity,
  Dumbbell,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Banknote,
  AlertCircle,
  Clock,
  Heart,
  ShoppingCart,
  X,
  ArrowUpRight,
  Check,
  ShieldCheck,
  MapPin,
  Calendar,
  Minus,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FacilityItem, BookingPayload } from '../types';
import { useCart } from './Cart/CartContext';

export type { FacilityItem, BookingPayload };

export const FACILITIES_DATA: FacilityItem[] = [
  {
    id: 'adult-pools',
    name: 'Adult Pools (1, 2 & 3)',
    sport: 'Natación Olímpica & Recuperación',
    category: 'piscinas',
    icon: Waves,
    rate: '$2.000 COP / hora',
    rateType: 'Por persona',
    numericRate: 2000,
    capacity: '50 personas / piscina / hora',
    rules: 'Menores de edad en piscinas deben estar acompañados por un adulto. Niños con estatura superior a 1 metro pagan entrada.',
    description: 'Tres piscinas climatizadas de estándar semiolímpico para entrenamiento de resistencia, nado libre y terapias acuáticas.',
    primaryColor: '#7AA5BF',
    secondaryColor: '#A0C3D9',
    badge: 'Acuático',
    image: '/piscina-adultos.jpeg'
  },
  {
    id: 'kids-pool',
    name: 'Kids Pool 1 (Piscina Infantil 1)',
    sport: 'Zona Infantil & Recreación',
    category: 'piscinas',
    icon: Baby,
    rate: '$2.000 COP / hora',
    rateType: 'Por persona',
    numericRate: 2000,
    capacity: '50 personas / piscina / hora',
    rules: 'Menores de edad en piscinas deben estar acompañados por un adulto. Niños con estatura superior a 1 metro pagan entrada.',
    description: 'Piscina de baja profundidad con supervisión continua de salvavidas, fuentes dinámicas y temperatura controlada.',
    primaryColor: '#A0C3D9',
    secondaryColor: '#7AA5BF',
    badge: 'Kids Zone',
    image: '/piscina-ninos.jpeg'
  },
  {
    id: 'large-soccer',
    name: 'Large Soccer Field (Cancha Fútbol Grande)',
    sport: 'Fútbol 11 Profesional',
    category: 'canchas',
    icon: Trophy,
    rate: '$140.000 COP / hora',
    rateType: 'Reserva Exclusiva',
    numericRate: 140000,
    capacity: '11 vs 11 (Cancha Completa)',
    rules: 'Uso obligatorio de calzado para césped sintético. Prohibido el ingreso con taches metálicos y alimentos al terreno.',
    description: 'Gramado sintético de última generación con certificación FIFA Quality Pro, iluminación LED para juego nocturno y graderías.',
    primaryColor: '#4C591C',
    secondaryColor: '#667302',
    badge: 'Fútbol 11',
    image: '/cancha-11.jpeg'
  },
  {
    id: 'micro-soccer',
    name: 'Micro-soccer Field 5v5 (Cancha Microfútbol)',
    sport: 'Fútbol Rápido 5v5',
    category: 'canchas',
    icon: Goal,
    rate: '$80.000 COP / hora',
    rateType: 'Reserva Exclusiva',
    numericRate: 80000,
    capacity: '5 vs 5 (Cancha Completa)',
    rules: 'Uso de calzado multitache o suela plana deportiva. Llegar 10 minutos antes del inicio del turno reservado.',
    description: 'Cancha perimetrada de alto impacto para juego rápido y dinámico. Césped de absorción con caucho granulado premium.',
    primaryColor: '#667302',
    secondaryColor: '#B0BF3F',
    badge: 'Microfútbol 5v5',
    image: '/cancha-micro.jpeg'
  },
  {
    id: 'multisport-court',
    name: 'Multisport Court (Cancha Polideportiva)',
    sport: 'Vóley & Baloncesto',
    category: 'canchas',
    icon: Activity,
    rate: '$70.000 COP / hora',
    rateType: 'Reserva Exclusiva',
    numericRate: 70000,
    capacity: 'Basketball or Volleyball',
    rules: 'Se requiere calzado deportivo de suela limpia no abrasiva. La reserva incluye balones y postes reglamentarios.',
    description: 'Piso amortiguado de poliuretano multideportivo con demarcación profesional para voleibol, básquetbol y balonmano.',
    primaryColor: '#B0BF3F',
    secondaryColor: '#D5D96A',
    badge: 'Polideportivo',
    image: '/polideportiva.jpeg'
  },
  {
    id: 'gym-1',
    name: 'Gym (Gimnasio 1)',
    sport: 'Fuerza & Rendimiento',
    category: 'gimnasio',
    icon: Dumbbell,
    rate: '$2.000 COP / hora',
    rateType: 'Por persona',
    numericRate: 2000,
    capacity: '20 pax / hora',
    rules: 'Toalla de mano y calzado deportivo cerrados indispensables. Descargar discos y mancuernas al finalizar cada serie.',
    description: 'Área de musculación con máquinas Hammer Strength, peso libre olímpico, racks de sentadillas y zona cardiovascular.',
    primaryColor: '#A68660',
    secondaryColor: '#D5D96A',
    badge: 'Fitness Club',
    image: '/gym.jpeg'
  },
  {
    id: 'wet-zone',
    name: 'Wet Zone / Sauna (Zona Húmeda)',
    sport: 'Contraste, Sauna & Relax',
    category: 'zona-humeda',
    icon: Sparkles,
    rate: '$4.000 COP / hora',
    rateType: 'Por persona',
    numericRate: 4000,
    capacity: '10 pax / hora',
    rules: 'Ducha previa obligatoria. No ingresar con dispositivos electrónicos. Tiempo máximo continuo sugerido en sauna: 15 minutos.',
    description: 'Sauna finlandés de madera de cedro, turco a vapor húmedo aromatizado con eucalipto y tinas de inmersión en frío.',
    primaryColor: '#73553C',
    secondaryColor: '#A68660',
    badge: 'Spa & Sauna',
    image: '/sauna.jpeg'
  }
];

const TIME_SLOTS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM"
];

// Stepper personalizado y de alto estándar visual
interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  unit: string;
}

function NumberStepper({ label, value, onChange, min = 1, max = 99, unit }: NumberStepperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-xs font-bold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <div className="flex items-center justify-between p-1 rounded-2xl bg-club-surface border border-text-main/20 shadow-xs">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-club-accent hover:bg-club-bg hover:text-club-primary active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label={`Disminuir ${label}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex items-baseline gap-1 font-sans">
          <span className="font-display font-black text-lg text-club-accent">
            {value}
          </span>
          <span className="text-xs text-text-muted font-bold">
            {unit}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-club-accent hover:bg-club-bg hover:text-club-primary active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// FACILITY DETAIL COMPONENT (Dynamic Booking & Real-Time Price Calculator)
// ============================================================================
interface FacilityDetailModalProps {
  facility: FacilityItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (payload: BookingPayload) => void;
}

export function FacilityDetailModal({
  facility,
  isOpen,
  onClose,
  onAddToCart
}: FacilityDetailModalProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [added, setAdded] = useState(false);

  // Estados de reserva interactiva
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('09:00 AM');
  const [hours, setHours] = useState(1);
  const [people, setPeople] = useState(1);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!facility) return null;

  const IconComponent = facility.icon;
  const isExclusive = facility.rateType.toLowerCase().includes('exclusiva');

  // Máxima capacidad dinámica a partir del texto
  const maxCapacity = (() => {
    const match = facility.capacity.match(/\d+/);
    return match ? parseInt(match[0], 10) : 50;
  })();

  // Cálculo Dinámico de Tarifa Total
  const calculatedTotal = isExclusive
    ? facility.numericRate * hours
    : facility.numericRate * hours * people;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);

  const handleAddToCart = () => {
    const payload: BookingPayload = {
      facility,
      selectedDate,
      selectedTime,
      hours,
      people: isExclusive ? 1 : people,
      totalPrice: calculatedTotal,
      isExclusive
    };

    if (onAddToCart) {
      onAddToCart(payload);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-10">
          {/* Backdrop con Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 25 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-club-surface border border-text-main/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] z-10"
            style={{
              backgroundColor: 'var(--color-club-surface, #FFFFFF)',
            }}
          >
            {/* Botón de Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-club-surface/90 text-club-accent hover:bg-black/10 transition-colors shadow-md border border-text-main/10 focus:outline-none focus:ring-2 focus:ring-club-primary"
              aria-label="Cerrar detalle"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Layout E-Commerce de 2 Columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Columna Izquierda: Imagen Grande a Altura Completa */}
              <div className="relative min-h-[320px] md:min-h-[620px] w-full bg-club-bg overflow-hidden flex flex-col justify-end p-6 sm:p-8">
                <Image
                  src={facility.image}
                  alt={facility.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15" />

                <div className="relative z-10 text-white">
                  <span
                    className="inline-block px-3.5 py-1.5 rounded-full text-xs font-sans font-bold uppercase tracking-wider mb-3 shadow-md backdrop-blur-md"
                    style={{ backgroundColor: facility.primaryColor }}
                  >
                    {facility.badge}
                  </span>
                  <p className="font-display font-black text-2xl uppercase tracking-wide text-white drop-shadow-md">
                    {facility.sport}
                  </p>
                  <p className="font-sans text-xs text-white/80 flex items-center gap-1.5 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-club-primary" />
                    Vice City Iguana Club • Arena Principal
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Información & Acciones Dinámicas */}
              <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-club-surface">
                <div>
                  {/* Header: Título a la izquierda, Ícono del Deporte al extremo superior derecho */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className="font-sans text-xs uppercase tracking-widest text-text-muted font-bold block mb-1">
                        {isExclusive ? 'Reserva de Cancha Exclusiva' : 'Acceso Por Persona'}
                      </span>
                      <h2
                        className="text-2xl sm:text-3xl font-display font-black text-club-accent uppercase leading-tight"
                        style={{ fontFamily: "'Zalando Sans Expanded', system-ui, sans-serif" }}
                      >
                        {facility.name}
                      </h2>
                    </div>

                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md border border-text-main/10 transition-transform duration-300 hover:scale-105"
                      style={{
                        backgroundColor: 'var(--color-club-bg, #ECEBE1)',
                        color: facility.primaryColor
                      }}
                    >
                      <IconComponent className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>

                  {/* Precio Dinámico en Tiempo Real */}
                  <div className="mb-5 p-4 rounded-2xl bg-club-bg/70 border border-text-main/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span
                        className="text-3xl sm:text-4xl font-display font-black text-club-accent tracking-tight block"
                        style={{ fontFamily: "'Zalando Sans Expanded', system-ui, sans-serif" }}
                      >
                        {formatCurrency(calculatedTotal)}
                      </span>
                      <span className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider block mt-0.5">
                        Total calculado • <span className="text-text-main font-semibold">Tarifa base: {facility.rate}</span>
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-club-surface border border-text-main/10 text-xs font-sans font-bold text-text-main shadow-xs">
                      {isExclusive ? (
                        <span>{hours} {hours === 1 ? 'hora reservada' : 'horas reservadas'}</span>
                      ) : (
                        <span>{hours}h × {people} {people === 1 ? 'persona' : 'personas'}</span>
                      )}
                    </div>
                  </div>

                  {/* Separador Horizontal */}
                  <hr
                    className="border-t mb-5 opacity-30"
                    style={{ borderColor: facility.primaryColor }}
                  />

                  {/* FORMULARIO DINÁMICO DE RESERVA */}
                  <div className="space-y-4 mb-6">
                    {/* Fila 1: Selector de Fecha y Hora */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. Date Picker */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-club-primary" />
                          <span>Fecha</span>
                        </label>
                        <input
                          type="date"
                          value={selectedDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full h-12 px-3.5 rounded-2xl bg-club-surface border border-text-main/20 text-club-accent font-sans text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-club-primary shadow-xs transition-all cursor-pointer"
                        />
                      </div>

                      {/* 2. Time Selector (8:00 AM - 5:00 PM) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-sans text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-brand-blue" />
                          <span>Hora de Entrada</span>
                        </label>
                        <div className="relative">
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full h-12 px-3.5 pr-8 rounded-2xl bg-club-surface border border-text-main/20 text-club-accent font-sans text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-club-primary shadow-xs appearance-none cursor-pointer"
                          >
                            {TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot} className="bg-club-surface text-club-accent py-1">
                                {slot}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Steppers Condicionales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Horas (para ambos tipos) */}
                      <NumberStepper
                        label="Horas de Reserva"
                        value={hours}
                        onChange={setHours}
                        min={1}
                        max={8}
                        unit={hours === 1 ? 'hora' : 'horas'}
                      />

                      {/* Personas: solo se muestra en Type A ("Por persona") */}
                      {!isExclusive ? (
                        <NumberStepper
                          label="Número de Personas"
                          value={people}
                          onChange={setPeople}
                          min={1}
                          max={maxCapacity}
                          unit={people === 1 ? 'persona' : 'personas'}
                        />
                      ) : (
                        <div className="flex flex-col justify-end">
                          <div className="p-3 rounded-2xl bg-brand-blue-light/15 border border-brand-blue/20 flex items-center gap-2 text-xs font-sans text-brand-blue font-bold">
                            <ShieldCheck className="w-4 h-4 shrink-0 text-brand-blue" />
                            <span>Cancha Completa Exclusiva (Sin límite de jugadores)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Área de Acción: ADD TO CART + Botón Favoritos (Heart) */}
                  <div className="flex items-center gap-3 mb-6">
                    {/* Botón ADD TO CART */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 py-4 px-6 rounded-2xl font-sans font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:-translate-y-0.5 active:scale-[0.98] text-white cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-club-accent, #000000)',
                        boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.25)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-club-primary, #B0BF3F)';
                        e.currentTarget.style.color = 'var(--color-btn-text, #FFFFFF)';
                        e.currentTarget.style.boxShadow = '0 12px 30px -5px rgba(176, 191, 63, 0.45)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-club-accent, #000000)';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(0, 0, 0, 0.25)';
                      }}
                    >
                      {added ? (
                        <>
                          <Check className="w-5 h-5 text-club-primary animate-bounce" />
                          <span>¡AGREGADO AL CARRITO!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          <span>ADD TO CART • {formatCurrency(calculatedTotal)}</span>
                        </>
                      )}
                    </button>

                    {/* Botón Secundario Outline con Ícono de Corazón */}
                    <button
                      type="button"
                      onClick={() => setIsFavorite(!isFavorite)}
                      className="p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-club-primary active:scale-90 cursor-pointer"
                      style={{
                        borderColor: isFavorite ? '#D5D96A' : 'rgba(76, 89, 28, 0.2)',
                        backgroundColor: isFavorite ? 'rgba(213, 217, 106, 0.15)' : 'transparent',
                        color: isFavorite ? '#B0BF3F' : 'var(--color-text-main, #4C591C)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#B0BF3F';
                        e.currentTarget.style.backgroundColor = 'rgba(176, 191, 63, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isFavorite ? '#D5D96A' : 'rgba(76, 89, 28, 0.2)';
                        e.currentTarget.style.backgroundColor = isFavorite ? 'rgba(213, 217, 106, 0.15)' : 'transparent';
                      }}
                      aria-label="Agregar a favoritos"
                    >
                      <Heart
                        className={`w-5 h-5 transition-transform duration-300 ${
                          isFavorite ? 'fill-[#B0BF3F] scale-110' : 'hover:scale-110'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bloque de Descripción Detallada */}
                  <div
                    className="p-5 rounded-2xl border space-y-3 font-sans text-xs"
                    style={{
                      backgroundColor: 'var(--color-club-bg, #ECEBE1)',
                      borderColor: 'rgba(76, 89, 28, 0.12)'
                    }}
                  >
                    <p className="text-text-main leading-relaxed font-light text-xs sm:text-sm">
                      {facility.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-text-main/10">
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 shrink-0 text-brand-blue mt-0.5" />
                        <div>
                          <span className="font-bold text-text-main uppercase block">Capacidad:</span>
                          <span className="text-text-muted">{facility.capacity}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 shrink-0 text-brand-green-dark mt-0.5" />
                        <div>
                          <span className="font-bold text-text-main uppercase block">Horario:</span>
                          <span className="text-text-muted">8:00 AM to 5:00 PM (America/Bogota)</span>
                        </div>
                      </div>
                    </div>

                    {facility.rules && (
                      <div className="pt-3 border-t border-text-main/10 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-brand-brown mt-0.5" />
                        <div>
                          <span className="font-bold text-text-main uppercase block">Reglas de Ingreso:</span>
                          <span className="text-text-muted leading-relaxed">{facility.rules}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 text-xs text-text-muted">
                  <ShieldCheck className="w-4 h-4 text-club-primary" />
                  <span>Reserva directa garantizada por Vice City Iguana Club</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MAIN FACILITIES SLIDER COMPONENT
// ============================================================================
interface FacilitiesSliderProps {
  onAddToCart?: (payload: BookingPayload) => void;
}

export function FacilitiesSlider({ onAddToCart }: FacilitiesSliderProps = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityItem | null>(null);
  const { addBookingToCart } = useCart();

  const handleAddToCart = onAddToCart || addBookingToCart;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <>
      <section id="facilities" className="relative py-20 bg-club-surface/40 border-y border-text-main/10 overflow-hidden">
        {/* Glow ambiental de fondo */}
        <div className="absolute -top-32 left-1/3 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-brand-yellow/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Cabecera del Slider y Controles */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-club-surface border border-text-main/10 shadow-xs mb-3">
                <span className="w-2 h-2 rounded-full bg-club-primary animate-ping" />
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-text-muted">
                  Vice City Iguana Club
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-black text-club-accent uppercase tracking-tight">
                Instalaciones <span className="text-club-primary">Destacadas</span>
              </h2>
              <p className="font-sans text-base md:text-lg text-text-muted mt-2 max-w-xl font-light">
                Descubre cada escenario deportivo. Haz clic en <span className="font-bold text-text-main">Ver Info</span> para conocer detalles completos, horarios y reservar tu cupo.
              </p>
            </div>

            {/* Horario y Botones de Navegación del Carrusel */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-bold bg-brand-blue-light/20 text-brand-blue px-4 py-2.5 rounded-full border border-brand-blue/20 shadow-xs">
                <Clock className="w-4 h-4 text-brand-blue" />
                <span>Open 8:00 AM - 5:00 PM Daily</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  className="p-3.5 rounded-full bg-club-surface text-club-accent border border-text-main/15 hover:border-club-primary hover:bg-club-primary/10 transition-all duration-300 shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-club-primary cursor-pointer"
                  aria-label="Ver anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  className="p-3.5 rounded-full bg-club-surface text-club-accent border border-text-main/15 hover:border-club-primary hover:bg-club-primary/10 transition-all duration-300 shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-club-primary cursor-pointer"
                  aria-label="Ver siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Carrusel Deslizable */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FACILITIES_DATA.map((facility) => {
              const Icon = facility.icon;

              return (
                <article
                  key={facility.id}
                  className="group relative flex-none w-[85vw] sm:w-[350px] lg:w-[380px] snap-start rounded-3xl bg-club-surface border border-text-main/10 flex flex-col justify-between overflow-hidden transition-all duration-500 hover:-translate-y-3"
                  style={{
                    boxShadow: '0 8px 30px -10px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      '0 25px 50px -12px var(--color-shadow-color, rgba(232, 76, 123, 0.08)), 0 0 0 1px rgba(176, 191, 63, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 30px -10px rgba(0,0,0,0.05)';
                  }}
                >
                  {/* Portada con Imagen y Badges */}
                  <div className="relative h-56 w-full overflow-hidden bg-club-bg">
                    <Image
                      src={facility.image}
                      alt={facility.name}
                      fill
                      sizes="(max-width: 640px) 85vw, (max-width: 1024px) 350px, 380px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    />

                    {/* Gradiente Protector para Contraste */}
                    <div className="absolute inset-0 bg-gradient-to-t from-club-surface via-black/10 to-black/30" />

                    {/* Ícono de Actividad Superior Izquierdo con Micro-animación de Pulso */}
                    <div
                      className="absolute top-4 left-4 z-10 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md bg-club-surface/90 border border-white/40 shadow-md transition-transform duration-300 group-hover:scale-110"
                      style={{ color: facility.primaryColor }}
                    >
                      <Icon className="w-6 h-6 transition-transform duration-300 group-hover:animate-pulse" />
                    </div>

                    {/* Badge de Categoría Deportiva */}
                    <span
                      className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-wider text-white shadow-xs backdrop-blur-md"
                      style={{ backgroundColor: facility.primaryColor }}
                    >
                      {facility.badge}
                    </span>
                  </div>

                  {/* Contenido de la Tarjeta */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="font-sans text-xs uppercase tracking-widest text-text-muted font-bold block mb-1">
                        {facility.sport}
                      </span>
                      <h3 className="text-xl md:text-2xl font-display font-black text-club-accent uppercase leading-tight mb-4 group-hover:text-club-primary transition-colors">
                        {facility.name}
                      </h3>

                      {/* Especificaciones de Tarifa y Capacidad */}
                      <div className="space-y-3 pt-3 border-t border-text-main/10 font-sans">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-club-primary" />
                            Tarifa:
                          </span>
                          <div className="text-right">
                            <span className="font-black text-text-main">{facility.rate}</span>
                            <span className="text-xs text-text-muted block">({facility.rateType})</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-muted flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-blue" />
                            Capacidad:
                          </span>
                          <span className="font-bold text-text-main">{facility.capacity}</span>
                        </div>
                      </div>

                      {/* Reglas Específicas de Entrada (si aplican) */}
                      {facility.rules && (
                        <div className="mt-4 p-3 rounded-xl bg-club-bg/70 border border-text-main/10 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-brand-brown shrink-0 mt-0.5" />
                          <p className="font-sans text-xs text-text-muted leading-relaxed line-clamp-2">
                            {facility.rules}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer de la Tarjeta con Botón "Ver Info" */}
                    <div className="pt-6 mt-6 border-t border-text-main/10 flex items-center justify-between gap-4">
                      {/* Línea de Acento Dinámico */}
                      <div
                        className="h-1.5 w-12 rounded-full transition-all duration-500 group-hover:w-20"
                        style={{ backgroundColor: facility.primaryColor }}
                      />

                      {/* Botón Premium "Ver Info" */}
                      <button
                        type="button"
                        onClick={() => setSelectedFacility(facility)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-wider bg-club-accent text-btn-text hover:bg-club-primary transition-all duration-300 shadow-md hover:shadow-[0_4px_15px_rgba(176,191,63,0.3)] hover:-translate-y-0.5 active:scale-95 group/btn cursor-pointer"
                        style={{
                          backgroundColor: 'var(--color-club-accent, #000000)',
                          color: 'var(--color-btn-text, #FFFFFF)',
                        }}
                      >
                        <span>Ver Info</span>
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modal / Dialog de Detalle de Instalación */}
      <FacilityDetailModal
        key={selectedFacility?.id || 'none'}
        facility={selectedFacility}
        isOpen={Boolean(selectedFacility)}
        onClose={() => setSelectedFacility(null)}
        onAddToCart={handleAddToCart}
      />
    </>
  );
}

export default FacilitiesSlider;
