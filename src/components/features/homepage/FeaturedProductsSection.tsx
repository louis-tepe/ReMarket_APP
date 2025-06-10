import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { fetchFeaturedProductData, FeaturedProductData } from "@/services/core/product-service";
import FeaturedProductsClientWrapper from '@/components/features/product-listing/FeaturedProductsClientWrapper';
import { ProductCardProps } from '@/components/shared/ProductCard';
import { FeaturedProductsSkeleton } from './FeaturedProductsSkeleton';

function mapProductDataToCardProps(products: FeaturedProductData[]): ProductCardProps[] {
  return products.map(product => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price ?? 0,
  }));
}

async function getFeaturedProducts(): Promise<ProductCardProps[]> {
  try {
    const productsData = await fetchFeaturedProductData();
    return mapProductDataToCardProps(productsData);
  } catch (error: unknown) {
    console.error("Error fetching featured products for section:", error);
    return [];
  }
}

async function FeaturedProductsList() {
  const products = await getFeaturedProducts();
  return <FeaturedProductsClientWrapper initialProducts={products} />;
}

export function FeaturedProductsSection() {
  return (
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
  );
} 