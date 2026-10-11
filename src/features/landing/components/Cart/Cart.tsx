"use client";

import React from 'react';
import { ShoppingCart, X, ArrowRight, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from './CartContext';
import { CartItem } from './CartItem';
import { CartEmpty } from './CartEmpty';

export { useCart, CartProvider } from './CartContext';
export { CartItem } from './CartItem';
export { CartEmpty } from './CartEmpty';

export function Cart() {
  const {
    cart,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateHours,
    totalCost,
    totalBookings,
    formatCOP
  } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={closeCart}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full sm:w-125 md:w-135 bg-club-surface shadow-2xl z-50 flex flex-col border-l border-text-main/10"
            style={{ backgroundColor: 'var(--color-club-surface, #FFFFFF)' }}
          >
            {/* Header */}
            <div className="p-6 border-b border-text-main/10 flex items-center justify-between bg-club-bg/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-club-primary/20 text-club-primary">
                  <ShoppingCart className="w-5 h-5 text-text-main" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-black uppercase text-club-accent tracking-tight">
                    Tus Reservas
                  </h2>
                  <span className="text-xs font-sans text-text-muted">
                    {totalBookings}{' '}
                    {totalBookings === 1
                      ? 'instalación seleccionada'
                      : 'instalaciones seleccionadas'}
                  </span>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="p-2.5 hover:bg-black/5 rounded-full transition-colors text-text-muted hover:text-club-accent focus:outline-none focus:ring-2 focus:ring-club-primary"
                aria-label="Cerrar carrito"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <CartEmpty onClose={closeCart} />
              ) : (
                cart.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onRemove={removeFromCart}
                    onUpdateHours={updateHours}
                    formatCOP={formatCOP}
                  />
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-6 bg-club-bg/80 border-t border-text-main/10 backdrop-blur-md">
                <div className="space-y-2 mb-5 font-sans">
                  <div className="flex justify-between items-center text-sm text-text-muted">
                    <span>Total de Reservas</span>
                    <span className="font-bold text-text-main">{totalBookings}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-text-main/10">
                    <span className="text-base font-display font-bold text-text-muted uppercase tracking-widest">
                      Total a Pagar
                    </span>
                    <span className="text-3xl font-display font-black text-club-accent">
                      {formatCOP(totalCost)}
                    </span>
                  </div>
                </div>

                <button className="w-full py-4 bg-club-accent text-btn-text font-sans font-bold uppercase tracking-widest text-sm rounded-2xl hover:bg-club-primary transition-all duration-300 shadow-xl hover:shadow-[0_10px_30px_rgba(176,191,63,0.4)] hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2">
                  <span>Continuar al Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-center text-text-muted mt-4 flex items-center justify-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Horario oficial: America/Bogota (8:00 AM - 5:00 PM)</span>
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default Cart;
