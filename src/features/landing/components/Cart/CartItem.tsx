"use client";

import React from 'react';
import Image from 'next/image';
import { Trophy, Calendar, Clock, Users, Trash2, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CartBookingItem } from '@/features/landing/types';

interface CartItemProps {
  item: CartBookingItem;
  onRemove: (id: string) => void;
  onUpdateHours: (id: string, delta: number) => void;
  formatCOP: (amount: number) => string;
}

export function CartItem({ item, onRemove, onUpdateHours, formatCOP }: CartItemProps) {
  const IconComponent = item.icon || Trophy;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={item.id}
      className="bg-club-bg/40 p-4 sm:p-5 rounded-2xl border border-text-main/10 flex flex-col gap-3.5 transition-all hover:border-club-primary/30 relative group"
    >
      {/* Top: Thumbnail, Title, Badge & Delete */}
      <div className="flex items-start gap-3.5">
        {/* Thumbnail / Icon */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-club-bg shrink-0 border border-text-main/10">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.facilityName}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : null}
          <div
            className="absolute top-1 left-1 p-1 rounded-md backdrop-blur-md bg-white/90 shadow-xs"
            style={{ color: item.primaryColor || '#B0BF3F' }}
          >
            <IconComponent className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider text-white shadow-xs"
              style={{ backgroundColor: item.primaryColor || '#B0BF3F' }}
            >
              {item.modalidad}
            </span>
          </div>
          <h4 className="font-display font-black text-base text-club-accent uppercase leading-snug line-clamp-1">
            {item.facilityName}
          </h4>

          {/* Schedule & Attendance metadata */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-muted font-sans">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-club-primary" />
              {item.date}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-brand-blue" />
              {item.time}
            </span>
            {item.people && (
              <span className="flex items-center gap-1 font-medium text-text-main">
                <Users className="w-3.5 h-3.5 text-brand-green-dark" />
                {item.people} {item.people === 1 ? 'persona' : 'personas'}
              </span>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
          aria-label="Eliminar reserva"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom: Hours adjuster and Subtotal */}
      <div className="flex items-center justify-between pt-3 border-t border-text-main/10 font-sans">
        {/* Stepper de Horas */}
        <div className="flex items-center gap-2 bg-club-surface px-2 py-1 rounded-xl border border-text-main/15 shadow-xs">
          <button
            onClick={() => onUpdateHours(item.id, -1)}
            disabled={item.hours <= 1}
            className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-club-accent disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Disminuir horas"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-display font-black text-xs text-club-accent px-1">
            {item.hours} {item.hours === 1 ? 'hr' : 'hrs'}
          </span>
          <button
            onClick={() => onUpdateHours(item.id, 1)}
            disabled={item.hours >= 8}
            className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-club-accent disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Aumentar horas"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subtotal */}
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
            Subtotal
          </span>
          <span className="text-lg font-display font-black text-club-accent">
            {formatCOP(item.subtotal)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default CartItem;
