import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/features/landing/components/Hero';
import { Pools } from '@/features/landing/components/Pools';
import { Facilities } from '@/features/landing/components/Facilities';
import { Location } from '@/features/landing/components/Location';
import { CTA } from '@/features/landing/components/CTA';

export default function Home() {
  return (
    <div className="min-h-screen bg-club-bg text-text-main flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Pools />
        <Facilities />
        <Location />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
