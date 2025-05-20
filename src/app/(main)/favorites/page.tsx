'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart as HeartIcon, Info } from "lucide-react";
import ProductCard, { ProductCardProps } from '@/components/shared/ProductCard'; // Assurez-vous que le chemin est correct
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

async function fetchFavoriteProducts(): Promise<ProductCardProps[]> {
    // console.log("Appel à fetchFavoriteProducts pour récupérer les favoris via API"); // Commenté pour moins de verbosité
    try {
        const response = await fetch('/api/favorites');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error('Erreur API lors de la récupération des favoris:', errorData.message);
            throw new Error(`Impossible de charger les favoris: ${errorData.message || 'Erreur serveur'}`);
        }
        const favorites: ProductCardProps[] = await response.json();
        return favorites;
    } catch (error) {
        console.error("Erreur dans fetchFavoriteProducts:", error);
        throw error;
    }
}

function FavoritesPageSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-0 overflow-hidden shadow-sm flex flex-col">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-4 flex-grow flex flex-col">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-1" />
                        <div className="mt-auto pt-3 flex justify-between items-center">
                            <Skeleton className="h-7 w-1/3" />
                            <Skeleton className="h-9 w-1/4" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState<ProductCardProps[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        fetchFavoriteProducts()
            .then(data => setFavorites(data))
            .catch(err => {
                console.error("Erreur chargement favoris:", err);
                setError("Impossible de charger vos favoris pour le moment.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleFavoriteToggled = useCallback((productId: string, isFavorite: boolean) => {
        // Sur la page des favoris, si un produit n'est plus un favori (isFavorite == false),
        // nous le retirons de la liste.
        if (!isFavorite) {
            setFavorites(prevFavorites => prevFavorites.filter(fav => fav.id !== productId));
        }
        // Si isFavorite est true, cela ne devrait pas arriver depuis un clic sur ProductCard
        // car il serait déjà favori. On pourrait re-fetch pour être sûr, mais pour l'UI
        // c'est surtout la suppression qui importe ici.
    }, []);

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold flex items-center">
                    <HeartIcon className="mr-3 h-8 w-8 text-primary" />
                    Mes Favoris
                </h1>
                {/* Option: Bouton pour vider les favoris ou autre action */}
            </div>

            {isLoading && <FavoritesPageSkeleton />}

            {!isLoading && error && (
                <div className="text-center py-10 bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
                    <Info className="mx-auto h-12 w-12 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
                    <p>{error}</p>
                </div>
            )}

            {!isLoading && !error && favorites.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-muted rounded-lg">
                    <HeartIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Votre liste de favoris est vide</h2>
                    <p className="text-muted-foreground mb-6">
                        Parcourez nos produits et cliquez sur le petit cœur pour les ajouter ici.
                    </p>
                    <Button asChild>
                        <Link href="/search">Découvrir les produits</Link>
                    </Button>
                </div>
            )}

            {!isLoading && !error && favorites.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {favorites.map(product => (
                        <ProductCard
                            key={product.id}
                            {...product}
                            initialIsFavorite={true} // Toujours vrai sur cette page
                            onFavoriteToggle={handleFavoriteToggled}
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 