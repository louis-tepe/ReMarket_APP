"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton"; // Pour l'état de chargement

// Interface pour la structure d'une catégorie (doit correspondre à ce que l'API retourne)
interface Category {
    _id: string; // ou id si l'API le transforme
    name: string;
    slug: string;
    // Ajoutez d'autres champs si nécessaire, par ex. iconUrl
}

export default function Header() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch("/api/categories");
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Erreur lors de la récupération des catégories");
                }
                const data = await response.json();
                setCategories(data.categories || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Une erreur inconnue est survenue");
                console.error("Failed to fetch categories:", err);
                setCategories([]); // S'assurer que categories est un tableau vide en cas d'erreur
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, []);

    return (
        <header className="bg-background border-b sticky top-0 z-50">
            <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold text-primary">
                    ReMarket
                </Link>

                {/* Navigation des catégories */}
                <div className="hidden md:flex items-center space-x-6">
                    {isLoading && (
                        <>
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-28" />
                        </>
                    )}
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    {!isLoading && !error && categories.length === 0 && (
                        <p className="text-sm text-muted-foreground">Aucune catégorie à afficher.</p>
                    )}
                    {!isLoading && !error && categories.length > 0 && categories.map((category) => (
                        <Link
                            key={category._id}
                            href={`/categories/${category.slug}`}
                            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            {category.name}
                        </Link>
                    ))}
                </div>

                {/* Actions utilisateur (placeholder) */}
                {/* TODO: Ajouter des icônes/liens pour la recherche, le panier, le profil utilisateur */}
                <div className="flex items-center space-x-4">
                    {/* <Button variant="ghost" size="icon"> <Search className="h-5 w-5" /> </Button> */}
                    {/* <Button variant="ghost" size="icon"> <ShoppingCart className="h-5 w-5" /> </Button> */}
                    {/* <Button>Se connecter</Button> */}
                </div>
            </nav>
        </header>
    );
} 