import { HeroSection } from '@/components/features/homepage/HeroSection';
import { FeaturedProductsSection } from '@/components/features/homepage/FeaturedProductsSection';
import { HowItWorksSection } from '@/components/features/homepage/HowItWorksSection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedProductsSection />
      <HowItWorksSection />
      {/* TODO: Ajouter d'autres sections: Catégories populaires, Témoignages, etc. */}
    </>
  );
}
