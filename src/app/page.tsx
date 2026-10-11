import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/features/landing/components/Hero';
import { FacilitiesSlider } from '@/features/landing/components/FacilitiesSlider';
import { LocationSection } from '@/features/landing/components/LocationSection';
import { Cart } from '@/features/landing/components/Cart/Cart';
import { CartProvider } from '@/features/landing/components/Cart/CartContext';

export default function Home() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-club-bg text-text-main font-sans selection:bg-club-primary selection:text-btn-text">
        <Header />
        <main>
          <Hero />
          <FacilitiesSlider />
          <LocationSection />
        </main>
        <Footer />
        <Cart />
      </div>
    </CartProvider>
  );
}
