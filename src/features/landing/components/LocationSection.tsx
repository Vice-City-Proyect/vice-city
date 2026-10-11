import React from 'react';
import { MapPin, Phone, Mail, Clock, ExternalLink, Navigation, Sparkles } from 'lucide-react';

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/Barranquilla,+Atlantico/@11.0360728,-74.8588019,3a,75y,214.57h,66.51t/data=!3m7!1e1!3m5!1sZuYgzAOgzKtuH8XmsxZbhg!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D23.493691345148335%26panoid%3DZuYgzAOgzKtuH8XmsxZbhg%26yaw%3D214.57016449338013!7i13312!8i6656!4m6!3m5!1s0x8ef42d44d12ae605:0x2633844581b917b2!8m2!3d11.0041072!4d-74.8069813!16zL20vMDJiODRi?entry=ttu&g_ep=EgoyMDI2MDkzMC4wIKXMDSoASAFQAw%3D%3D";

const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125322.44173169824!2d-74.8741049925232!3d11.00410717208493!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42d44d12ae605%3A0x2633844581b917b2!2sBarranquilla%2C%20Atl%C3%A1ntico!5e0!3m2!1ses!2sco!4v1710000000000!5m2!1ses!2sco";

export function LocationSection() {
  return (
    <section 
      id="contact" 
      className="relative py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-club-bg via-club-bg to-brand-blue-light/25 overflow-hidden"
      style={{ backgroundColor: 'var(--color-club-bg, #ECEBE1)' }}
    >
      {/* Decorative ambient gradients */}
      <div 
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-40" 
        style={{ backgroundColor: 'var(--color-brand-blue-light, #A0C3D9)' }}
      />
      <div 
        className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-30" 
        style={{ backgroundColor: 'var(--color-club-primary, #B0BF3F)' }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Information */}
          <div className="flex flex-col space-y-8 font-sans">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-club-surface/90 border border-text-main/15 shadow-xs text-xs font-bold uppercase tracking-widest text-text-main mb-4">
                <Sparkles className="w-3.5 h-3.5 text-club-primary" />
                <span>Club House & Sede Principal</span>
              </div>

              <h2 
                className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95]"
                style={{ 
                  fontFamily: "var(--font-display, 'Zalando Sans Expanded', sans-serif)", 
                  color: 'var(--color-text-main, #4C591C)' 
                }}
              >
                Ubicación
              </h2>
            </div>

            <p 
              className="text-base sm:text-lg leading-relaxed font-normal"
              style={{ 
                fontFamily: "var(--font-sans, 'Zalando Sans', sans-serif)", 
                color: 'var(--color-text-muted, #826E77)' 
              }}
            >
              Situado en el epicentro deportivo y de mayor exclusividad de Barranquilla, Vice City Iguana Club ofrece un entorno de alto rendimiento, privacidad absoluta y acceso fluido para atletas, socios y visitantes. Nuestras instalaciones cuentan con parqueadero privado, seguridad 24/7 y servicios de hospitality de primera categoría.
            </p>

            {/* Contact & Address Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div 
                className="p-5 rounded-2xl border border-text-main/10 shadow-xs backdrop-blur-xs transition-transform duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--color-club-surface, #FFFFFF)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-club-primary/20 text-text-main">
                    <MapPin className="w-5 h-5 text-text-main" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Dirección</span>
                </div>
                <p className="text-sm font-bold text-club-accent">Cra. 53 # 106 - 280</p>
                <p className="text-xs text-text-muted">Barranquilla, Atlántico • Colombia</p>
              </div>

              <div 
                className="p-5 rounded-2xl border border-text-main/10 shadow-xs backdrop-blur-xs transition-transform duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--color-club-surface, #FFFFFF)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-blue-light/30 text-text-main">
                    <Clock className="w-5 h-5 text-text-main" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Horario</span>
                </div>
                <p className="text-sm font-bold text-club-accent">Lunes a Domingo</p>
                <p className="text-xs text-text-muted">8:00 AM – 5:00 PM (UTC-5)</p>
              </div>

              <div 
                className="p-5 rounded-2xl border border-text-main/10 shadow-xs backdrop-blur-xs transition-transform duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--color-club-surface, #FFFFFF)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-yellow/30 text-text-main">
                    <Phone className="w-5 h-5 text-text-main" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Teléfono & Concierge</span>
                </div>
                <a 
                  href="tel:+573009123456" 
                  className="text-sm font-bold text-club-accent hover:text-club-primary transition-colors block"
                >
                  +57 (300) 912-3456
                </a>
                <p className="text-xs text-text-muted">Atención VIP inmediata</p>
              </div>

              <div 
                className="p-5 rounded-2xl border border-text-main/10 shadow-xs backdrop-blur-xs transition-transform duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--color-club-surface, #FFFFFF)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-green-dark/15 text-text-main">
                    <Mail className="w-5 h-5 text-text-main" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Email Directo</span>
                </div>
                <a 
                  href="mailto:concierge@vicecityiguana.club" 
                  className="text-sm font-bold text-club-accent hover:text-club-primary transition-colors truncate block"
                >
                  concierge@vicecityiguana.club
                </a>
                <p className="text-xs text-text-muted">Membresías & eventos privados</p>
              </div>
            </div>

            {/* Quick Actions / Highlights */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold tracking-wide uppercase text-text-muted">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-club-surface/60 border border-text-main/10">
                <Navigation className="w-3.5 h-3.5 text-club-primary" />
                Valet Parking Exclusivo
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-club-surface/60 border border-text-main/10">
                <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                Canchas & Zonas Climatizadas
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Map */}
          <div className="relative group">
            <div 
              className="relative w-full h-112.5 sm:h-125 rounded-3xl p-2.5 overflow-hidden transition-all duration-500 ease-out group-hover:scale-[1.015] border border-text-main/10"
              style={{ 
                backgroundColor: 'var(--color-club-surface, #FFFFFF)',
                boxShadow: '0 24px 60px -12px var(--color-shadow-color, rgba(232, 76, 123, 0.15))'
              }}
            >
              {/* Google Maps iFrame */}
              <iframe
                title="Vice City Iguana Club - Barranquilla Location"
                src={GOOGLE_MAPS_EMBED_URL}
                className="w-full h-full rounded-2xl border-0 filter contrast-[1.02] saturate-[1.05]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              {/* Status Pill Overlay (Top Left) */}
              <div className="absolute top-6 left-6 z-20 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-club-surface/90 backdrop-blur-md border border-text-main/15 shadow-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-club-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-club-primary" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-club-accent">
                    Barranquilla, CO
                  </span>
                </div>
              </div>

              {/* Crucial Action: "Abrir en Google Maps" Overlay Button (Bottom Right) */}
              <div className="absolute bottom-6 right-6 z-20">
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir ubicación en Google Maps"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm text-btn-text shadow-xl hover:shadow-[0_12px_28px_rgba(176,191,63,0.45)] transition-all duration-300 transform group-hover:-translate-y-0.5 hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'var(--color-club-primary, #B0BF3F)' }}
                >
                  <MapPin className="w-4 h-4 text-btn-text fill-btn-text/20" />
                  <span>Abrir en Google Maps</span>
                  <ExternalLink className="w-4 h-4 text-btn-text transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default LocationSection;
