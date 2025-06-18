'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { FeaturedProductData } from "@/services/core/product-service";
import FeaturedProductsClientWrapper from '@/components/features/product-listing/FeaturedProductsClientWrapper';
import { ProductCardProps } from '@/components/shared/ProductCard';
import { FeaturedProductsSkeleton } from './FeaturedProductsSkeleton';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';

function mapProductDataToCardProps(products: FeaturedProductData[]): ProductCardProps[] {
  return products.map(product => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price ?? 0,
  }));
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function FeaturedProductsList() {
    const { data, error } = useSWR<{ products: FeaturedProductData[] }>('/api/products/featured', fetcher);
    const { data: session } = useSession();

    if (error) {
        console.error("Error fetching featured products:", error);
        return <p className="text-center text-red-500">Impossible de charger les produits.</p>;
    }

    if (!data || !data.products) {
        return <FeaturedProductsSkeleton />;
    }

    const products = mapProductDataToCardProps(data.products);
    return <FeaturedProductsClientWrapper initialProducts={products} session={session} />;
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