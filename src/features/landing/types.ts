import type React from 'react';

export interface FacilityItem {
  id: string;
  name: string;
  sport: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  rate: string;
  rateType: string;
  numericRate: number;
  capacity: string;
  rules?: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  badge: string;
  image: string;
}

export interface BookingPayload {
  facility: FacilityItem;
  selectedDate: string;
  selectedTime: string;
  hours: number;
  people: number;
  totalPrice: number;
  isExclusive: boolean;
}

export interface CartBookingItem {
  id: string;
  facilityId: string;
  facilityName: string;
  modalidad: string;
  date: string;
  time: string;
  hours: number;
  people?: number;
  rate: number;
  subtotal: number;
  icon?: React.ComponentType<{ className?: string }>;
  primaryColor?: string;
  image?: string;
}
