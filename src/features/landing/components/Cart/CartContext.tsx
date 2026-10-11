"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CartBookingItem, BookingPayload } from '@/features/landing/types';

interface CartContextType {
  cart: CartBookingItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addBookingToCart: (booking: BookingPayload) => void;
  removeFromCart: (id: string) => void;
  updateHours: (id: string, delta: number) => void;
  totalCost: number;
  totalBookings: number;
  formatCOP: (amount: number) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartBookingItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addBookingToCart = useCallback((booking: BookingPayload) => {
    const isExclusive = booking.isExclusive;
    const newBooking: CartBookingItem = {
      id: `${booking.facility.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      facilityId: booking.facility.id,
      facilityName: booking.facility.name,
      modalidad: isExclusive ? 'Reserva Exclusiva' : 'Por persona / hora',
      date: booking.selectedDate,
      time: booking.selectedTime,
      hours: booking.hours,
      people: isExclusive ? undefined : booking.people,
      rate: booking.facility.numericRate,
      subtotal: booking.totalPrice,
      icon: booking.facility.icon,
      primaryColor: booking.facility.primaryColor,
      image: booking.facility.image
    };

    setCart((prev) => [newBooking, ...prev]);
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateHours = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newHours = Math.max(1, Math.min(8, item.hours + delta));
          const newSubtotal = item.people
            ? item.rate * newHours * item.people
            : item.rate * newHours;
          return { ...item, hours: newHours, subtotal: newSubtotal };
        }
        return item;
      })
    );
  }, []);

  const totalCost = useMemo(
    () => cart.reduce((acc, item) => acc + item.subtotal, 0),
    [cart]
  );

  const totalBookings = cart.length;

  const formatCOP = useCallback((amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      isCartOpen,
      setIsCartOpen,
      openCart,
      closeCart,
      addBookingToCart,
      removeFromCart,
      updateHours,
      totalCost,
      totalBookings,
      formatCOP
    }),
    [
      cart,
      isCartOpen,
      openCart,
      closeCart,
      addBookingToCart,
      removeFromCart,
      updateHours,
      totalCost,
      totalBookings,
      formatCOP
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
