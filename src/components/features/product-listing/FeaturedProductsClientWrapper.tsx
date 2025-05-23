'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ProductCard, { ProductCardProps } from '@/components/shared/ProductCard';

interface FeaturedProductsClientWrapperProps {
    initialProducts: ProductCardProps[];
}

async function fetchUserFavorites(): Promise<string[]> {
    try {
        const response = await fetch('/api/favorites');
        if (response.ok) {
            const favoriteItems: ProductCardProps[] = await response.json();
            return favoriteItems.map(fav => fav.id);
        }
        console.warn("FeaturedProductsClientWrapper: Impossible de charger les favoris.");
    } catch (error) {
        console.error("FeaturedProductsClientWrapper: Erreur lors du fetch des favoris:", error);
    }
    return [];
}

export default function FeaturedProductsClientWrapper({ initialProducts }: FeaturedProductsClientWrapperProps) {
    const { data: session } = useSession();
    const [productsToDisplay, setProductsToDisplay] = useState<ProductCardProps[]>(initialProducts);
    const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

    useEffect(() => {
        setProductsToDisplay(initialProducts);
    }, [initialProducts]);

    useEffect(() => {
        if (session?.user) {
            fetchUserFavorites().then(setFavoriteProductIds);
        } else {
            setFavoriteProductIds([]);
        }
    }, [session]);

    const handleFavoriteToggle = useCallback((productId: string, isFavorite: boolean) => {
        setFavoriteProductIds(prevIds =>
            isFavorite
                ? prevIds.includes(productId) ? prevIds : [...prevIds, productId]
                : prevIds.filter(id => id !== productId)
        );
    }, []);

    if (!productsToDisplay || productsToDisplay.length === 0) {
        return <p className="text-center text-muted-foreground">Aucun produit vedette à afficher pour le moment.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsToDisplay.map((product) => (
                <ProductCard
                    key={product.id}
                    {...product}
                    initialIsFavorite={favoriteProductIds.includes(product.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                />
            ))}
        </div>
    );
} 