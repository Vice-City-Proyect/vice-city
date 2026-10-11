import React from 'react';
import { MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer id="about" className="bg-club-accent text-club-bg py-16 border-t-8 border-club-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl" role="img" aria-label="Iguana">🦎</span>
            <span className="font-display font-black text-2xl tracking-tight uppercase">
              Vice City Iguana
            </span>
          </div>
          <p className="text-text-muted max-w-sm mb-6">
            The premier destination for athletes and fitness enthusiasts demanding the absolute best.
          </p>
          <div className="flex items-center gap-2 text-sm text-brand-blue-light">
            <MapPin className="w-4 h-4" />
            <span>America/Bogota Timezone (UTC-5)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <div>
            <h4 className="font-bold uppercase tracking-widest mb-4 text-brand-yellow">Operations</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>Monday - Sunday</li>
              <li>8:00 AM - 5:00 PM</li>
              <li>Holidays included</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest mb-4 text-brand-yellow">Policies</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><a href="#" className="hover:text-white transition-colors">Booking Rules</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cancellation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-white/10 text-sm text-center text-text-muted">
        © 2026 Vice City Iguana Club. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
