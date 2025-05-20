import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Repeat, PackageCheck } from 'lucide-react'; // Icônes pour la section explicative
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchFeaturedProductData } from "@/lib/product-service"; // Importer la fonction directe
import FeaturedProductsClientWrapper from '@/components/shared/FeaturedProductsClientWrapper';
import { ProductCardProps } from '@/components/shared/ProductCard'; // Importé pour le type de getFeaturedProducts

// Fonction pour récupérer les produits vedettes côté serveur
async function getFeaturedProducts(): Promise<ProductCardProps[]> {
  try {
    const products = await fetchFeaturedProductData();
    // Mapper `ProductData` vers `ProductCardProps` si nécessaire ici, ou s'assurer qu'ils sont compatibles.
    // Pour l'instant, on suppose qu'ils sont compatibles ou que fetchFeaturedProductData retourne déjà ProductCardProps.
    return products as ProductCardProps[]; // Cast explicite si nécessaire, ou mapper les champs.
  } catch (error: unknown) {
    console.error("Error fetching featured products directly:", error);
    if (error instanceof Error && error.cause) {
      console.error("Cause of error:", error.cause);
    }
    return [];
  }
}

// FeaturedProductsList est un Server Component qui passe les données au Client Component Wrapper
async function FeaturedProductsList() {
  const products = await getFeaturedProducts();
  return <FeaturedProductsClientWrapper initialProducts={products} />;
}

function FeaturedProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border rounded-lg p-0 overflow-hidden shadow-sm">
          <Skeleton className="aspect-square w-full bg-gray-200" />
          <div className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2 bg-gray-200" />
            <Skeleton className="h-4 w-1/2 mb-3 bg-gray-200" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-1/3 bg-gray-200" />
              <Skeleton className="h-8 w-1/4 bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* Section Hero */}
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
              <Link href="/sell">Vendre un article</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section Produits Vedettes */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">Nos Pépites du Moment</h2>
          <Suspense fallback={<FeaturedProductsSkeleton />}>
            <FeaturedProductsList />
          </Suspense>
          <div className="text-center mt-10">
            <Button variant="outline" asChild>
              <Link href="/categories">Voir tous les produits</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section Comment ça marche ? (Concept ReMarket) */}
      <section id="comment-ca-marche" className="py-12 md:py-16 bg-muted/50 dark:bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">ReMarket Simplifie le Seconde Main</h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-12">
            Nous standardisons l&apos;expérience d&apos;achat et de vente pour vous offrir la qualité du neuf, au prix de l&apos;occasion. Pas de contact direct, pas de tracas.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 bg-background dark:bg-gray-800/50 rounded-lg shadow-sm">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <PackageCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Vendez Facilement</h3>
              <p className="text-sm text-muted-foreground">
                Soumettez votre produit. Notre IA l&apos;analyse et le liste. Une fois vendu, envoyez-le simplement à notre point relais.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-background dark:bg-gray-800/50 rounded-lg shadow-sm">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Achetez en Confiance</h3>
              <p className="text-sm text-muted-foreground">
                Trouvez votre bonheur parmi des annonces standardisées. Chaque article est vérifié avant de vous être expédié.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-background dark:bg-gray-800/50 rounded-lg shadow-sm">
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <Repeat className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Processus Simplifié</h3>
              <p className="text-sm text-muted-foreground">
                ReMarket gère la logistique et la communication. Plus besoin de négocier ou de rencontrer des inconnus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TODO: Ajouter d'autres sections: Catégories populaires, Témoignages, etc. */}
    </>
  );
}
