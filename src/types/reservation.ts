import type { ServiceCategory } from './service';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'CONFIRMED';

export type HoldState = 'NONE' | 'ACTIVE' | 'EXPIRED';

export type ReservationType = 'NORMAL' | 'FULL_POOL';

export type AccessStatus = 'NOT_ENTERED' | 'INSIDE' | 'EXITED';

export type DiscountType = 'NONE' | 'WEDNESDAY' | 'FULL_POOL';

export type QrStatus =
  | 'VALID'
  | 'USED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'OUTSIDE_TIME'
  | 'NOT_FOUND';

export type WristbandColor = 'BLUE' | 'PURPLE' | 'GREEN' | 'RED';

export interface Reservation {
  id: string;
  code: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  resource: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  hours: number;
  basePrice: number;
  discountType: DiscountType;
  discountPercent: number;
  total: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  holdState: HoldState;
  holdExpiresAt: string | null;
  type: ReservationType;
  accessStatus: AccessStatus;
  qrStatus: QrStatus;
  wristbandColor: WristbandColor;
  createdBy: 'WEB' | 'POS';
}
