'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ProductCard, { ProductCardProps } from '@/components/shared/ProductCard';

interface FeaturedProductsClientWrapperProps {
    initialProducts: ProductCardProps[];
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
            const fetchFavorites = async () => {
                try {
                    const response = await fetch('/api/favorites');
                    if (response.ok) {
                        // L'API /api/favorites retourne un tableau de ProductCardProps
                        const favoriteItems: ProductCardProps[] = await response.json();
                        setFavoriteProductIds(favoriteItems.map(fav => fav.id));
                    } else {
                        console.warn("FeaturedProductsClientWrapper: Impossible de charger les favoris.");
                        setFavoriteProductIds([]);
                    }
                } catch (error) {
                    console.error("FeaturedProductsClientWrapper: Erreur lors du fetch des favoris:", error);
                    setFavoriteProductIds([]);
                }
            };
            fetchFavorites();
        } else {
            setFavoriteProductIds([]); // Utilisateur non connecté, vider les favoris
        }
    }, [session]);

    const handleFavoriteToggle = useCallback((productId: string, isFavorite: boolean) => {
        setFavoriteProductIds(prevIds => {
            if (isFavorite) {
                return prevIds.includes(productId) ? prevIds : [...prevIds, productId];
            }
            return prevIds.filter(id => id !== productId);
        });
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