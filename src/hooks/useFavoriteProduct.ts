'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface UseFavoriteProductProps {
    productId: string;
    initialIsFavorite?: boolean;
    onFavoriteToggle?: (productId: string, isFavorite: boolean) => void;
}

interface UseFavoriteProductReturn {
    isFavorite: boolean;
    isLoadingFavorite: boolean;
    toggleFavorite: () => Promise<void>;
    isInteractionDisabled: boolean;
}

export function useFavoriteProduct({
    productId,
    initialIsFavorite = false,
    onFavoriteToggle,
}: UseFavoriteProductProps): UseFavoriteProductReturn {
    const { data: session, status } = useSession();
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

    useEffect(() => {
        setIsFavorite(initialIsFavorite);
    }, [initialIsFavorite]);

    const isInteractionDisabled = status !== 'authenticated' || isLoadingFavorite;

    const toggleFavorite = useCallback(async () => {
        if (status !== 'authenticated' || !session?.user) {
            toast.info("Veuillez vous connecter pour gérer vos favoris.");
            return;
        }
        if (isLoadingFavorite) return;

        setIsLoadingFavorite(true);
        const newFavoriteStatus = !isFavorite;

        try {
            const response = await fetch('/api/favorites', {
                method: newFavoriteStatus ? 'POST' : 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erreur lors de la mise à jour des favoris');
            }

            setIsFavorite(newFavoriteStatus);
            toast.success(newFavoriteStatus ? "Ajouté aux favoris!" : "Retiré des favoris.");
            onFavoriteToggle?.(productId, newFavoriteStatus);
        } catch (error) {
            console.error("Erreur lors de la mise à jour des favoris:", error);
            toast.error(error instanceof Error ? error.message : "Une erreur s'est produite.");
            // Revert UI on error
            setIsFavorite(!newFavoriteStatus);
        } finally {
            setIsLoadingFavorite(false);
        }
    }, [status, session, isLoadingFavorite, isFavorite, productId, onFavoriteToggle]);

    return { isFavorite, isLoadingFavorite, toggleFavorite, isInteractionDisabled };
} 