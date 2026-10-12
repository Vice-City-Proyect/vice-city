import type { ServiceCategory } from '@/types/service';

export interface OccupancyItem {
  id: string;
  name: string;
  category: ServiceCategory;
  capacity: number;
  occupied: number;
}

export const MOCK_OCCUPANCY: OccupancyItem[] = [
  { id: 'occ-001', name: 'Piscina Adultos 1', category: 'POOL', capacity: 50, occupied: 32 },
  { id: 'occ-002', name: 'Piscina Adultos 2', category: 'POOL', capacity: 50, occupied: 47 },
  { id: 'occ-003', name: 'Piscina Adultos 3', category: 'POOL', capacity: 50, occupied: 12 },
  { id: 'occ-004', name: 'Piscina de Niños 1', category: 'POOL', capacity: 50, occupied: 28 },
  { id: 'occ-005', name: 'Fútbol grande', category: 'SOCCER_LARGE', capacity: 11, occupied: 11 },
  { id: 'occ-006', name: 'Microfútbol', category: 'SOCCER_MICRO', capacity: 11, occupied: 9 },
  { id: 'occ-007', name: 'Multipropósito', category: 'MULTI_COURT', capacity: 11, occupied: 6 },
  { id: 'occ-008', name: 'Gimnasio', category: 'GYM', capacity: 20, occupied: 14 },
  { id: 'occ-009', name: 'Zona húmeda', category: 'WET_AREA', capacity: 10, occupied: 4 },
];

export function occupancyPercent(item: OccupancyItem): number {
  return Math.round((item.occupied / item.capacity) * 100);
}
