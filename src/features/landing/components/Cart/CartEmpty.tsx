"use client";

import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface CartEmptyProps {
  onClose?: () => void;
}

export function CartEmpty({ onClose }: CartEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-text-muted text-center py-16">
      <div className="w-20 h-20 rounded-full bg-club-bg flex items-center justify-center mb-4 text-text-muted/40 border border-text-main/10">
        <ShoppingCart className="w-10 h-10" />
      </div>
      <p className="font-display font-black text-xl text-club-accent uppercase tracking-tight">
        Tu carrito está vacío
      </p>
      <p className="font-sans text-sm text-text-muted max-w-xs mt-1">
        Explora nuestras instalaciones destacadas y reserva tu cancha o pase de acceso.
      </p>
      <button
        onClick={onClose}
        className="mt-6 px-6 py-3 rounded-xl bg-club-primary text-btn-text font-sans font-bold text-xs uppercase tracking-wider hover:bg-brand-green-dark transition-all shadow-md active:scale-95"
      >
        Explorar Instalaciones
      </button>
    </div>
  );
}

export default CartEmpty;
