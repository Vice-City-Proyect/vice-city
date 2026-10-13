import type { Facility } from '../types';

export const COMPLEX_HOURS = '8:00 AM – 5:00 PM';

export const POOLS: Facility[] = [
  {
    id: 'adult-pools',
    name: 'Piscinas de Adultos (1, 2 y 3)',
    sport: 'Nado libre y resistencia',
    badge: 'Semiolímpicas',
    image: '/piscina-adultos.jpeg',
    description:
      'Tres piscinas de estándar semiolímpico con carriles demarcados para nado libre y entrenamiento de resistencia.',
    rate: '$2.000 COP',
    rateType: 'por persona / hora',
    capacity: '50 personas por piscina / hora',
    rules:
      'Menores de edad deben estar acompañados por un adulto. Niños con estatura superior a 1 metro pagan entrada.',
    wristband: 'Pulsera azul',
  },
  {
    id: 'kids-pool',
    name: 'Piscina Infantil',
    sport: 'Zona infantil y recreación',
    badge: 'Kids Zone',
    image: '/piscina-ninos.jpeg',
    description:
      'Piscina de baja profundidad con supervisión continua de salvavidas, fuentes dinámicas y temperatura controlada para los más pequeños.',
    rate: '$2.000 COP',
    rateType: 'por persona / hora',
    capacity: '50 personas por piscina / hora',
    rules:
      'Los menores de edad deben ingresar acompañados por un adulto responsable en todo momento.',
    wristband: 'Pulsera azul',
  },
];

export const FACILITIES: Facility[] = [
  {
    id: 'large-soccer',
    name: 'Cancha de Fútbol 11',
    sport: 'Fútbol 11 profesional',
    badge: 'Fútbol 11',
    image: '/cancha-11.jpeg',
    description:
      'Gramado sintético de última generación con iluminación LED para juego nocturno y graderías perimetrales.',
    rate: '$140.000 COP',
    rateType: 'hora / cancha completa',
    capacity: '11 vs 11 jugadores',
    rules:
      'Uso obligatorio de calzado para césped sintético. Prohibido el ingreso con taches metálicos y alimentos al terreno.',
    wristband: 'Pulsera verde',
  },
  {
    id: 'micro-soccer',
    name: 'Cancha de Microfútbol',
    sport: 'Fútbol rápido 5v5',
    badge: 'Microfútbol',
    image: '/cancha-micro.jpeg',
    description:
      'Cancha perimetrada de alto impacto para juego rápido y dinámico, con absorbente de caucho granulado premium.',
    rate: '$80.000 COP',
    rateType: 'hora / cancha completa',
    capacity: '5 vs 5 jugadores',
    rules:
      'Uso de calzado multitache o suela plana deportiva. Llegar 10 minutos antes del inicio del turno reservado.',
    wristband: 'Pulsera verde',
  },
  {
    id: 'multisport-court',
    name: 'Cancha Polideportiva',
    sport: 'Voleibol y baloncesto',
    badge: 'Polideportivo',
    image: '/polideportiva.jpeg',
    description:
      'Piso multideportivo con demarcación oficial para voleibol, baloncesto y microfútbol recreativo.',
    rate: '$70.000 COP',
    rateType: 'hora / cancha completa',
    capacity: 'Equipos completos',
    rules:
      'Se requiere calzado deportivo de suela limpia no abrasiva. La reserva incluye balones y postes reglamentarios.',
    wristband: 'Pulsera verde',
  },
  {
    id: 'gym',
    name: 'Gimnasio',
    sport: 'Fuerza y acondicionamiento',
    badge: 'Fitness',
    image: '/gym.jpeg',
    description:
      'Zona de musculación con peso libre, mancuernas y barras, racks de sentadillas y máquinas de resistencia guiada.',
    rate: '$2.000 COP',
    rateType: 'por persona / hora',
    capacity: '20 personas / hora',
    rules:
      'Toalla de mano y calzado deportivo cerrado indispensables. Descargar discos y mancuernas al finalizar cada serie.',
    wristband: 'Pulsera roja',
  },
  {
    id: 'wet-zone',
    name: 'Zona Húmeda y Sauna',
    sport: 'Contraste, sauna y relax',
    badge: 'Spa & Sauna',
    image: '/sauna.jpeg',
    description:
      'Sauna de madera, baño turco a vapor y duchas de contraste para recuperación muscular y bienestar.',
    rate: '$4.000 COP',
    rateType: 'por persona / hora',
    capacity: '10 personas / hora',
    rules:
      'Ducha previa obligatoria. No ingresar con dispositivos electrónicos. Tiempo máximo continuo sugerido en sauna: 15 minutos.',
    wristband: 'Pulsera morada',
  },
];