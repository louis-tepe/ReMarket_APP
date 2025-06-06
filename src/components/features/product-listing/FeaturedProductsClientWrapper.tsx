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

// Hook personnalisé pour gérer l'hydratation
function useIsClient() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return isClient;
}

export default function FeaturedProductsClientWrapper({ initialProducts }: FeaturedProductsClientWrapperProps) {
    const isClient = useIsClient();
    const { data: session, status } = useSession();
    const [productsToDisplay, setProductsToDisplay] = useState<ProductCardProps[]>(initialProducts);
    const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

    useEffect(() => {
        setProductsToDisplay(initialProducts);
    }, [initialProducts]);

    useEffect(() => {
        // Ne charger les favoris que si on est côté client et que la session est authentifiée
        if (isClient && status === 'authenticated' && session?.user) {
            fetchUserFavorites().then(setFavoriteProductIds);
        } else if (isClient && status === 'unauthenticated') {
            setFavoriteProductIds([]);
        }
    }, [isClient, session, status]);

    const handleFavoriteToggle = useCallback((productId: string, isFavorite: boolean) => {
        if (!isClient) return; // Éviter les actions avant l'hydratation

        setFavoriteProductIds(prevIds =>
            isFavorite
                ? prevIds.includes(productId) ? prevIds : [...prevIds, productId]
                : prevIds.filter(id => id !== productId)
        );
    }, [isClient]);

    if (!productsToDisplay || productsToDisplay.length === 0) {
        return <p className="text-center text-muted-foreground">Aucun produit vedette à afficher pour le moment.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsToDisplay.map((product) => (
                <ProductCard
                    key={product.id}
                    {...product}
                    initialIsFavorite={isClient ? favoriteProductIds.includes(product.id) : false}
                    onFavoriteToggle={handleFavoriteToggle}
                />
            ))}
        </div>
    );
} 