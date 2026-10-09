export type ServiceCategory =
  | 'POOL'
  | 'SOCCER_LARGE'
  | 'SOCCER_MICRO'
  | 'MULTI_COURT'
  | 'GYM'
  | 'WET_AREA';

export type BookingModality = 'PER_PERSON_HOUR' | 'FIXED_HOUR';

export type ServiceStatus = 'ACTIVE' | 'INACTIVE';

export type PriceUnit = 'PERSON_HOUR' | 'HOUR';

export interface ServiceSchedule {
  open: string;
  close: string;
  closedDays: number[];
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  price: number;
  priceUnit: PriceUnit;
  modality: BookingModality;
  capacity: number;
  status: ServiceStatus;
  schedule: ServiceSchedule;
  image: string;
  resource: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}
