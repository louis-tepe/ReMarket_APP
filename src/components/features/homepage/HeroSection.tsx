import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="py-12 md:py-20 lg:py-28 bg-gradient-to-b from-background to-secondary dark:from-gray-900 dark:to-gray-800/60">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-6">
          ReMarket: Le Seconde Main, <span className="text-primary">Standardisé et Simplifié</span>.
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-3xl mx-auto">
          Découvrez des produits d&apos;occasion de qualité, présentés de manière uniforme. Achetez et vendez sans tracas, ReMarket s&apos;occupe de tout.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/categories">Trouver une perle</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/account/sell">Vendre un article</Link>
          </Button>
        </div>
      </div>
    </section>
  );
} 