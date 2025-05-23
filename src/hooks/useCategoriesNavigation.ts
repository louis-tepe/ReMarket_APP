import { useState, useEffect } from 'react';

interface CategoryFromAPI {
    _id: string;
    name: string;
    slug: string;
    depth: number;
    isLeafNode: boolean;
}

interface UseCategoriesNavigationReturn {
    categories: CategoryFromAPI[];
    isLoading: boolean;
    error: string | null;
}

export function useCategoriesNavigation(): UseCategoriesNavigationReturn {
    const [categories, setCategories] = useState<CategoryFromAPI[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch("/api/categories?depth=0");
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: "Erreur lors de la récupération des catégories" }));
                    throw new Error(errorData.message || "Erreur inconnue du serveur");
                }
                const data = await response.json();
                if (data.success && Array.isArray(data.categories)) {
                    setCategories(data.categories);
                } else {
                    console.warn("Réponse API inattendue pour les catégories:", data);
                    setCategories([]);
                    if (!data.success) {
                        setError(data.message || "Format de réponse incorrect pour les catégories.");
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Une erreur inconnue est survenue lors du chargement des catégories.");
                console.error("Failed to fetch categories:", err);
                setCategories([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCategories();
    }, []);

    return { categories, isLoading, error };
} 