'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Clock, MapPin, Percent } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { COMPLEX_HOURS } from '../data/facilities';

const SLIDES = [
  {
    src: '/Lucia_Caminos_gym.jpg',
    alt: 'Gimnasio Vice City Iguana Club',
    position: 'object-top', // Changed to object-top to ensure the upper part isn't cut by navbar
  },
  {
    src: '/falcao-james-ramos.jpg',
    alt: 'Cancha de fútbol Vice City',
    position: 'object-[center_25%]', // Bias towards top to avoid cutting heads
  },
  {
    src: '/piscina-adultos-image-2.jpg',
    alt: 'Piscina para adultos Vice City',
    position: 'object-center', // Pools look good centered
  },
  {
    src: '/volley-image-2.jpg',
    alt: 'Cancha de volleyball Vice City',
    position: 'object-[center_25%]', // Bias towards top for player action
  },
];

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Este temporizador se reinicia automáticamente cada vez que cambia el slide
    // permitiendo que al hacer clic manual se "pause" temporalmente el automático.
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentSlide]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section className="group relative flex min-h-[90vh] items-center overflow-hidden pb-16 pt-28 lg:pb-24 lg:pt-36">
      {/* Auto-playing Image Slider */}
      <div className="absolute inset-0 bg-black">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'z-0 opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              className={`object-cover ${slide.position}`}
            />
          </div>
        ))}
        {/* Lighter Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />
      </div>

      {/* Manual Navigation Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-md transition-all hover:bg-white/20 group-hover:opacity-100 sm:left-8"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-md transition-all hover:bg-white/20 group-hover:opacity-100 sm:right-8"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Hero Content */}
      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-auto max-w-3xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-club-primary" />
            Complejo deportivo · Barranquilla
          </span>

          <h1 className="mb-6 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl drop-shadow-lg">
            Entrena. Compite.{' '}
            <span className="text-club-primary">Vive el deporte.</span>
          </h1>

          <p className="mb-9 max-w-2xl text-base leading-relaxed text-white/95 sm:text-lg drop-shadow-md">
            Piscinas semiolímpicas, canchas de fútbol 11 y microfútbol, cancha polideportiva,
            gimnasio y zona húmeda con sauna. Todo tu entrenamiento en un solo complejo.
          </p>

          <div className="mb-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#reservas" size="lg">
              Book Your Court
              <ChevronRight className="h-5 w-5" />
            </ButtonLink>
            <ButtonLink href="#instalaciones" size="lg" variant="light">
              Ver instalaciones
            </ButtonLink>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-white/20 pt-6 text-xs font-semibold uppercase tracking-wider text-white/95 sm:grid-cols-3 drop-shadow-md">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-club-primary" />
              {COMPLEX_HOURS}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-club-primary" />
              Barranquilla, Colombia
            </span>
            <span className="flex items-center gap-2">
              <Percent className="h-4 w-4 shrink-0 text-club-primary" />
              20% de descuento los miércoles
            </span>
          </div>
        </div>
      </div>

      {/* Slide Dot Indicators */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center gap-3">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'w-8 bg-club-primary' : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}