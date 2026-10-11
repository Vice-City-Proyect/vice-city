"use client";

import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/features/landing/components/Cart/CartContext';

interface HeaderProps {
  onOpenCart?: () => void;
  totalBookings?: number;
}

export function Header({ onOpenCart, totalBookings: propTotalBookings }: HeaderProps = {}) {
  const { totalBookings: contextTotalBookings, openCart } = useCart();
  const totalBookings = propTotalBookings !== undefined ? propTotalBookings : contextTotalBookings;
  const handleOpenCart = onOpenCart || openCart;

  return (
    <nav className="fixed w-full z-50 bg-club-bg/80 backdrop-blur-md border-b border-text-main/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-4xl" role="img" aria-label="Iguana">🦎</span>
            <span className="font-display font-black text-2xl tracking-tight text-club-accent uppercase">
              Vice City <span className="text-club-primary">Iguana</span>
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 font-bold text-sm tracking-widest uppercase">
            <a href="#facilities" className="hover:text-club-primary transition-colors">Facilities</a>
            <a href="#about" className="hover:text-club-primary transition-colors">About</a>
            <a href="#contact" className="hover:text-club-primary transition-colors">Contact</a>
          </div>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleOpenCart}
            className="relative p-3 rounded-full hover:bg-black/5 transition-colors"
            aria-label="Abrir carrito de compras"
          >
            <ShoppingCart className="w-6 h-6 text-club-accent" />
            {totalBookings > 0 && (
              <span className="absolute top-1 right-1 bg-club-primary text-btn-text text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-md">
                {totalBookings}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </nav>
  );
}

export default Header;
