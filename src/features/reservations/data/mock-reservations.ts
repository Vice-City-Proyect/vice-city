import type {
  AccessStatus,
  DiscountType,
  HoldState,
  PaymentStatus,
  QrStatus,
  Reservation,
  ReservationStatus,
  ReservationType,
} from '@/types/reservation';
import type { ServiceCategory } from '@/types/service';
import { toISODate } from '@/lib/format';
import { addHours, FULL_POOL_DISCOUNT, HOLD_MINUTES, isWednesday, WEDNESDAY_DISCOUNT } from '@/lib/schedule';

const UNITS: Record<ServiceCategory, { price: number; perPerson: boolean }> = {
  POOL: { price: 2000, perPerson: true },
  SOCCER_LARGE: { price: 140000, perPerson: false },
  SOCCER_MICRO: { price: 80000, perPerson: false },
  MULTI_COURT: { price: 70000, perPerson: false },
  GYM: { price: 2000, perPerson: true },
  WET_AREA: { price: 4000, perPerson: true },
};

const WRISTBANDS: Record<ServiceCategory, Reservation['wristbandColor']> = {
  POOL: 'BLUE',
  WET_AREA: 'PURPLE',
  GYM: 'RED',
  SOCCER_LARGE: 'GREEN',
  SOCCER_MICRO: 'GREEN',
  MULTI_COURT: 'GREEN',
};

interface MockReservationInput {
  code: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  resource: string;
  daysFromToday: number;
  startTime: string;
  hours: number;
  guests: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  holdState?: HoldState;
  type?: ReservationType;
  accessStatus?: AccessStatus;
  createdBy?: 'WEB' | 'POS';
}

function datePlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function resolveQrStatus(input: {
  status: ReservationStatus;
  holdState: HoldState;
}): QrStatus {
  if (input.status === 'CANCELLED') return 'CANCELLED';
  if (input.holdState === 'EXPIRED') return 'EXPIRED';
  if (input.status === 'FINISHED') return 'USED';
  return 'VALID';
}

function buildReservation(input: MockReservationInput): Reservation {
  const unit = UNITS[input.category];
  const date = datePlus(input.daysFromToday);
  const type: ReservationType = input.type ?? 'NORMAL';
  const holdState: HoldState = input.holdState ?? 'NONE';

  const basePrice = unit.perPerson
    ? unit.price * input.hours * input.guests
    : unit.price * input.hours;

  let discountType: DiscountType = 'NONE';
  if (type === 'FULL_POOL') discountType = 'FULL_POOL';
  else if (isWednesday(date)) discountType = 'WEDNESDAY';

  const discountPercent =
    discountType === 'NONE'
      ? 0
      : discountType === 'FULL_POOL'
        ? FULL_POOL_DISCOUNT
        : WEDNESDAY_DISCOUNT;
  const total = Math.round(basePrice * (1 - discountPercent / 100));

  return {
    id: input.code.toLowerCase(),
    code: input.code,
    clientId: input.clientId,
    clientName: input.clientName,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    category: input.category,
    resource: input.resource,
    date,
    startTime: input.startTime,
    endTime: addHours(input.startTime, input.hours),
    guests: input.guests,
    hours: input.hours,
    basePrice,
    discountType,
    discountPercent,
    total,
    status: input.status,
    paymentStatus: input.paymentStatus,
    holdState,
    holdExpiresAt:
      holdState === 'ACTIVE'
        ? new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString()
        : null,
    type,
    accessStatus: input.accessStatus ?? 'NOT_ENTERED',
    qrStatus: resolveQrStatus({ status: input.status, holdState }),
    wristbandColor: WRISTBANDS[input.category],
    createdBy: input.createdBy ?? 'WEB',
  };
}

const CLIENT_ID = 'usr-101';
const CLIENT_NAME = 'Laura Mendoza';

const INPUTS: MockReservationInput[] = [
  {
    code: 'VC-2401',
    clientId: CLIENT_ID,
    clientName: CLIENT_NAME,
    serviceId: 'srv-001',
    serviceName: 'Piscina Adultos 1',
    category: 'POOL',
    resource: 'Piscina Adultos 1',
    daysFromToday: 0,
    startTime: '10:00',
    hours: 2,
    guests: 2,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
  },
  {
    code: 'VC-2402',
    clientId: CLIENT_ID,
    clientName: CLIENT_NAME,
    serviceId: 'srv-008',
    serviceName: 'Gimnasio 1',
    category: 'GYM',
    resource: 'Gimnasio 1',
    daysFromToday: 2,
    startTime: '08:00',
    hours: 1,
    guests: 1,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    holdState: 'ACTIVE',
  },
  {
    code: 'VC-2403',
    clientId: CLIENT_ID,
    clientName: CLIENT_NAME,
    serviceId: 'srv-007',
    serviceName: 'Cancha Multipropósito',
    category: 'MULTI_COURT',
    resource: 'Cancha Multipropósito',
    daysFromToday: 5,
    startTime: '15:00',
    hours: 2,
    guests: 10,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
  },
  {
    code: 'VC-2380',
    clientId: CLIENT_ID,
    clientName: CLIENT_NAME,
    serviceId: 'srv-005',
    serviceName: 'Cancha de Fútbol Grande',
    category: 'SOCCER_LARGE',
    resource: 'Cancha de Fútbol 11',
    daysFromToday: -3,
    startTime: '14:00',
    hours: 2,
    guests: 11,
    status: 'FINISHED',
    paymentStatus: 'CONFIRMED',
    accessStatus: 'EXITED',
  },
  {
    code: 'VC-2361',
    clientId: CLIENT_ID,
    clientName: CLIENT_NAME,
    serviceId: 'srv-009',
    serviceName: 'Zona Húmeda / Sauna',
    category: 'WET_AREA',
    resource: 'Zona Húmeda',
    daysFromToday: -7,
    startTime: '11:00',
    hours: 1,
    guests: 2,
    status: 'CANCELLED',
    paymentStatus: 'PENDING',
    holdState: 'EXPIRED',
  },
  {
    code: 'VC-2404',
    clientId: 'usr-102',
    clientName: 'Jorge Salazar',
    serviceId: 'srv-002',
    serviceName: 'Piscina Adultos 2',
    category: 'POOL',
    resource: 'Piscina Adultos 2',
    daysFromToday: 0,
    startTime: '09:00',
    hours: 2,
    guests: 4,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
    accessStatus: 'INSIDE',
  },
  {
    code: 'VC-2405',
    clientId: 'usr-103',
    clientName: 'María Fernanda Ruiz',
    serviceId: 'srv-006',
    serviceName: 'Cancha de Microfútbol',
    category: 'SOCCER_MICRO',
    resource: 'Cancha de Microfútbol',
    daysFromToday: 0,
    startTime: '14:00',
    hours: 2,
    guests: 10,
    status: 'IN_PROGRESS',
    paymentStatus: 'CONFIRMED',
    accessStatus: 'INSIDE',
  },
  {
    code: 'VC-2406',
    clientId: 'usr-104',
    clientName: 'Andrés Castillo',
    serviceId: 'srv-007',
    serviceName: 'Cancha Multipropósito',
    category: 'MULTI_COURT',
    resource: 'Cancha Multipropósito',
    daysFromToday: 1,
    startTime: '09:00',
    hours: 3,
    guests: 8,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    holdState: 'ACTIVE',
  },
  {
    code: 'VC-2407',
    clientId: 'usr-105',
    clientName: 'Patricia Gómez',
    serviceId: 'srv-003',
    serviceName: 'Piscina Adultos 3',
    category: 'POOL',
    resource: 'Piscina Adultos 3',
    daysFromToday: 3,
    startTime: '08:00',
    hours: 9,
    guests: 40,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
    type: 'FULL_POOL',
  },
  {
    code: 'VC-2408',
    clientId: 'usr-106',
    clientName: 'Ricardo Núñez',
    serviceId: 'srv-005',
    serviceName: 'Cancha de Fútbol Grande',
    category: 'SOCCER_LARGE',
    resource: 'Cancha de Fútbol 11',
    daysFromToday: 2,
    startTime: '16:00',
    hours: 1,
    guests: 11,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    holdState: 'EXPIRED',
  },
  {
    code: 'VC-2409',
    clientId: 'usr-107',
    clientName: 'Diana Torres',
    serviceId: 'srv-004',
    serviceName: 'Piscina de Niños 1',
    category: 'POOL',
    resource: 'Piscina de Niños 1',
    daysFromToday: 4,
    startTime: '10:00',
    hours: 3,
    guests: 6,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
  },
  {
    code: 'VC-2410',
    clientId: 'usr-108',
    clientName: 'Camilo Herrera',
    serviceId: 'srv-008',
    serviceName: 'Gimnasio 1',
    category: 'GYM',
    resource: 'Gimnasio 1',
    daysFromToday: 0,
    startTime: '16:00',
    hours: 1,
    guests: 3,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
    accessStatus: 'NOT_ENTERED',
  },
  {
    code: 'VC-2411',
    clientId: 'usr-109',
    clientName: 'Sofía Ramírez',
    serviceId: 'srv-009',
    serviceName: 'Zona Húmeda / Sauna',
    category: 'WET_AREA',
    resource: 'Zona Húmeda',
    daysFromToday: 1,
    startTime: '13:00',
    hours: 2,
    guests: 4,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
  },
  {
    code: 'VC-2372',
    clientId: 'usr-110',
    clientName: 'Felipe Ospino',
    serviceId: 'srv-001',
    serviceName: 'Piscina Adultos 1',
    category: 'POOL',
    resource: 'Piscina Adultos 1',
    daysFromToday: -1,
    startTime: '08:00',
    hours: 4,
    guests: 5,
    status: 'FINISHED',
    paymentStatus: 'CONFIRMED',
    accessStatus: 'EXITED',
  },
  {
    code: 'VC-2355',
    clientId: 'usr-111',
    clientName: 'Valentina Duarte',
    serviceId: 'srv-006',
    serviceName: 'Cancha de Microfútbol',
    category: 'SOCCER_MICRO',
    resource: 'Cancha de Microfútbol',
    daysFromToday: -5,
    startTime: '17:00',
    hours: 2,
    guests: 9,
    status: 'CANCELLED',
    paymentStatus: 'PENDING',
    holdState: 'EXPIRED',
  },
  {
    code: 'VC-2412',
    clientId: 'usr-112',
    clientName: 'Sebastián Mora',
    serviceId: 'srv-005',
    serviceName: 'Cancha de Fútbol Grande',
    category: 'SOCCER_LARGE',
    resource: 'Cancha de Fútbol 11',
    daysFromToday: 6,
    startTime: '10:00',
    hours: 4,
    guests: 11,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
    createdBy: 'POS',
  },
  {
    code: 'VC-2413',
    clientId: 'usr-113',
    clientName: 'Daniela Ariza',
    serviceId: 'srv-002',
    serviceName: 'Piscina Adultos 2',
    category: 'POOL',
    resource: 'Piscina Adultos 2',
    daysFromToday: 7,
    startTime: '11:00',
    hours: 2,
    guests: 3,
    status: 'CONFIRMED',
    paymentStatus: 'CONFIRMED',
    createdBy: 'POS',
  },
  {
    code: 'VC-2349',
    clientId: 'usr-114',
    clientName: 'Óscar Bolívar',
    serviceId: 'srv-007',
    serviceName: 'Cancha Multipropósito',
    category: 'MULTI_COURT',
    resource: 'Cancha Multipropósito',
    daysFromToday: -8,
    startTime: '09:00',
    hours: 2,
    guests: 11,
    status: 'FINISHED',
    paymentStatus: 'CONFIRMED',
    accessStatus: 'EXITED',
  },
  {
    code: 'VC-2344',
    clientId: 'usr-115',
    clientName: 'Natalia Gutiérrez',
    serviceId: 'srv-003',
    serviceName: 'Piscina Adultos 3',
    category: 'POOL',
    resource: 'Piscina Adultos 3',
    daysFromToday: -10,
    startTime: '13:00',
    hours: 5,
    guests: 8,
    status: 'FINISHED',
    paymentStatus: 'CONFIRMED',
    accessStatus: 'EXITED',
  },
];

export const MOCK_RESERVATIONS: Reservation[] = INPUTS.map(buildReservation);
