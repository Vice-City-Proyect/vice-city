export interface RevenuePoint {
  label: string;
  value: number;
}

export const REVENUE_PERIODS = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
] as const;

export type RevenuePeriod = (typeof REVENUE_PERIODS)[number]['value'];

export const MOCK_REVENUE: Record<RevenuePeriod, RevenuePoint[]> = {
  day: [
    { label: '08:00', value: 126000 },
    { label: '09:00', value: 184000 },
    { label: '10:00', value: 262000 },
    { label: '11:00', value: 218000 },
    { label: '12:00', value: 175000 },
    { label: '13:00', value: 240000 },
    { label: '14:00', value: 312000 },
    { label: '15:00', value: 286000 },
    { label: '16:00', value: 198000 },
  ],
  week: [
    { label: 'Lun', value: 0 },
    { label: 'Mar', value: 1420000 },
    { label: 'Mié', value: 1865000 },
    { label: 'Jue', value: 1540000 },
    { label: 'Vie', value: 2180000 },
    { label: 'Sáb', value: 2640000 },
    { label: 'Dom', value: 2310000 },
  ],
  month: [
    { label: 'Sem 1', value: 8420000 },
    { label: 'Sem 2', value: 9180000 },
    { label: 'Sem 3', value: 7960000 },
    { label: 'Sem 4', value: 10240000 },
  ],
  year: [
    { label: 'Ene', value: 24100000 },
    { label: 'Feb', value: 22800000 },
    { label: 'Mar', value: 26400000 },
    { label: 'Abr', value: 28900000 },
    { label: 'May', value: 31200000 },
    { label: 'Jun', value: 34800000 },
    { label: 'Jul', value: 36500000 },
    { label: 'Ago', value: 33700000 },
    { label: 'Sep', value: 30900000 },
    { label: 'Oct', value: 27400000 },
    { label: 'Nov', value: 0 },
    { label: 'Dic', value: 0 },
  ],
};

export const MOCK_RESERVATIONS_BY_SERVICE: RevenuePoint[] = [
  { label: 'Piscinas', value: 412 },
  { label: 'Fútbol grande', value: 96 },
  { label: 'Microfútbol', value: 128 },
  { label: 'Multipropósito', value: 114 },
  { label: 'Gimnasio', value: 268 },
  { label: 'Zona húmeda', value: 152 },
];

export const MOCK_REVENUE_DISTRIBUTION: RevenuePoint[] = [
  { label: 'Fútbol grande', value: 13440000 },
  { label: 'Microfútbol', value: 10240000 },
  { label: 'Piscinas', value: 8240000 },
  { label: 'Multipropósito', value: 7980000 },
  { label: 'Zona húmeda', value: 6080000 },
  { label: 'Gimnasio', value: 5360000 },
];

export const MOCK_REVENUE_SUMMARY = {
  totalRevenue: 51340000,
  totalReservations: 1170,
  topService: 'Cancha de Fútbol Grande',
  topDay: 'Sábado',
  averageOccupancy: 62,
};
