export interface CatalogItem {
  id: string;
  title: string;
  description: string;
  price: number;
  modality: string;
  capacityLabel: string;
  resources: string[];
  image: string;
  availability: { label: string; tone: 'success' | 'pending' | 'danger' };
}

export const CLIENT_CATALOG: CatalogItem[] = [
  {
    id: 'cat-pools-adults',
    title: 'Piscinas de adultos',
    description: 'Tres piscinas semiolímpicas de adultos con carriles de nado.',
    price: 2000,
    modality: 'Por persona y hora',
    capacityLabel: '50 personas por piscina / hora',
    resources: ['Piscina Adultos 1', 'Piscina Adultos 2', 'Piscina Adultos 3'],
    image: '/piscina-adultos.jpeg',
    availability: { label: 'Disponible hoy', tone: 'success' },
  },
  {
    id: 'cat-pool-kids',
    title: 'Piscina de niños',
    description: 'Piscina infantil con profundidad reducida y zona de supervisión.',
    price: 2000,
    modality: 'Por persona y hora',
    capacityLabel: '50 personas / hora',
    resources: ['Piscina de Niños 1'],
    image: '/piscina-ninos.jpeg',
    availability: { label: 'Cupos limitados', tone: 'pending' },
  },
  {
    id: 'cat-soccer-large',
    title: 'Fútbol grande',
    description: 'Cancha de fútbol 11 con césped artificial e iluminación.',
    price: 140000,
    modality: 'Por hora fija',
    capacityLabel: '11 jugadores',
    resources: ['Cancha de Fútbol 11'],
    image: '/cancha-11.jpeg',
    availability: { label: 'Disponible hoy', tone: 'success' },
  },
  {
    id: 'cat-soccer-micro',
    title: 'Microfútbol',
    description: 'Cancha de microfútbol para partidos 5 vs 5.',
    price: 80000,
    modality: 'Por hora fija',
    capacityLabel: '11 jugadores',
    resources: ['Cancha de Microfútbol'],
    image: '/cancha-micro.jpeg',
    availability: { label: 'Sin franjas libres hoy', tone: 'danger' },
  },
  {
    id: 'cat-multi-court',
    title: 'Multipropósito',
    description: 'Cancha polideportiva para básquet, micro y voleibol.',
    price: 70000,
    modality: 'Por hora fija',
    capacityLabel: '11 jugadores',
    resources: ['Cancha Multipropósito'],
    image: '/polideportiva.jpeg',
    availability: { label: 'Disponible hoy', tone: 'success' },
  },
  {
    id: 'cat-gym',
    title: 'Gimnasio',
    description: 'Zona de entrenamiento con máquinas y pesas libres.',
    price: 2000,
    modality: 'Por persona y hora',
    capacityLabel: '20 personas / hora',
    resources: ['Gimnasio 1'],
    image: '/gym.jpeg',
    availability: { label: 'Disponible hoy', tone: 'success' },
  },
  {
    id: 'cat-wet-area',
    title: 'Zona húmeda',
    description: 'Sauna, vapor y área de descanso para recuperación.',
    price: 4000,
    modality: 'Por persona y hora',
    capacityLabel: '10 personas / hora',
    resources: ['Zona Húmeda'],
    image: '/sauna.jpeg',
    availability: { label: 'Cupos limitados', tone: 'pending' },
  },
];
