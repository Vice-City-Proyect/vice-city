"use client";

import React from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-32 pb-24 lg:pt-44 lg:pb-36 overflow-hidden">
      {/* Full-bleed Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Lucia_Caminos_gym.jpg"
          alt="Vice City Iguana Club - High-Energy Training Facility"
          fill
          priority
          quality={90}
          className="object-cover object-center"
          sizes="100vw"
        />

        {/* Sleek Readability Overlays: Directional Vignette & Dark Contrast */}
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/70 to-black/35 md:to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/40" />

        {/* Subtle brand neon glow accent */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-club-primary/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Status / Feature Pill */}
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-bold tracking-widest uppercase mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-club-primary animate-pulse" />
              <span>Premium Sports Experience</span>
            </div>

            {/* Motivational Headline */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-display font-black text-white uppercase leading-[0.9] mb-8 drop-shadow-md">
              Unleash <br />
              <span className="text-club-primary drop-shadow-[0_0_35px_rgba(176,191,63,0.45)]">
                Your Potential
              </span>
            </h1>

            {/* Descriptive Subtext */}
            <p className="text-lg sm:text-xl md:text-2xl text-zinc-200 mb-10 max-w-2xl font-light font-sans leading-relaxed drop-shadow-sm">
              Elevate your game in a high-energy, elite athletic environment. From professional turf fields to Olympic-level pools, the arena is yours.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#facilities"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-club-primary text-btn-text rounded-full font-bold uppercase tracking-widest hover:bg-brand-green-dark transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(176,191,63,0.5)] hover:-translate-y-1 active:scale-95"
              >
                <span>Book Your Court</span>
                <ChevronRight className="w-5 h-5" />
              </a>
              <a
                href="#about"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/80 text-white rounded-full font-bold uppercase tracking-widest hover:bg-white hover:text-club-accent transition-all duration-300 active:scale-95"
              >
                <span>Club Details</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
