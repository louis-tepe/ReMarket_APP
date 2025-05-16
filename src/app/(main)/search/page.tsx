'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Info, Loader2 } from "lucide-react";
import ProductCard, { ProductCardProps } from '@/components/shared/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchResultProduct extends ProductCardProps {
    // Étendre ProductCardProps si des champs supplémentaires sont nécessaires pour la recherche
    // Par exemple: offerCount?: number;
    additionalProperties?: Record<string, unknown>;
}

function SearchResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
    const [displayedQuery, setDisplayedQuery] = useState(searchParams.get('query') || '');
    const [results, setResults] = useState<SearchResultProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const currentQuery = searchParams.get('query') || '';
        setSearchQuery(currentQuery);
        setDisplayedQuery(currentQuery);

        if (currentQuery) {
            setIsLoading(true);
            setError(null);
            fetch(`/api/search?query=${encodeURIComponent(currentQuery)}`)
                .then(res => {
                    if (!res.ok) throw new Error('Erreur lors de la recherche.');
                    return res.json();
                })
                .then(data => {
                    if (data.success) {
                        setResults(data.data || []);
                    } else {
                        throw new Error(data.message || 'Erreur de recherche inconnue.');
                    }
                })
                .catch(err => {
                    console.error("Search error:", err);
                    setError(err.message);
                    setResults([]);
                })
                .finally(() => setIsLoading(false));
        } else {
            setResults([]);
            setIsLoading(false);
        }
    }, [searchParams]);

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (searchQuery.trim()) {
            params.set('query', searchQuery.trim());
        } else {
            params.delete('query');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <form onSubmit={handleSearchSubmit} className="flex w-full max-w-2xl mx-auto items-center space-x-2">
                    <Input
                        type="search"
                        name="queryInput"
                        placeholder="Rechercher un produit... (ex: iPhone 13, Samsung Galaxy)"
                        className="flex-1 text-base"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Rechercher un produit"
                    />
                    <Button type="submit" disabled={isLoading} aria-label="Lancer la recherche">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Rechercher</span>
                    </Button>
                </form>
            </div>

            {displayedQuery && !isLoading && (
                <h1 className="text-2xl font-bold mb-6">
                    Résultats pour : &quot;{displayedQuery}&quot;
                </h1>
            )}
            {isLoading && displayedQuery && (
                <h1 className="text-2xl font-bold mb-6">
                    Recherche en cours pour : &quot;{displayedQuery}&quot;...
                </h1>
            )}

            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, index) => (
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
            )}

            {!isLoading && error && (
                <div className="text-center py-10 bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
                    <Info className="mx-auto h-12 w-12 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Erreur de recherche</h2>
                    <p>{error}</p>
                </div>
            )}

            {!isLoading && !error && displayedQuery && results.length === 0 && (
                <div className="text-center py-10">
                    <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Aucun résultat</h2>
                    <p className="text-muted-foreground">Nous n&apos;avons trouvé aucun produit correspondant à &quot;{displayedQuery}&quot;.</p>
                    <p className="text-sm text-muted-foreground mt-1">Essayez avec d&apos;autres mots-clés ou vérifiez l&apos;orthographe.</p>
                </div>
            )}

            {!isLoading && !error && results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {results.map((product) => (
                        <ProductCard
                            key={product.id}
                            id={product.id}
                            slug={product.slug}
                            name={product.name}
                            imageUrl={product.imageUrl}
                            price={product.price}
                        />
                    ))}
                </div>
            )}

            {!isLoading && !error && !displayedQuery && results.length === 0 && (
                <div className="text-center py-10">
                    <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Prêt à trouver votre perle ?</h2>
                    <p className="text-muted-foreground">Utilisez la barre de recherche ci-dessus pour commencer.</p>
                </div>
            )}
        </div>
    );
}

// La page principale utilise Suspense pour gérer les paramètres de recherche qui sont asynchrones au premier chargement
export default function SearchPage() {
    return (
        <Suspense fallback={<SearchPageInitialSkeleton />}>
            <SearchResultsContent />
        </Suspense>
    );
}

function SearchPageInitialSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex w-full max-w-2xl mx-auto items-center space-x-2">
                    <Skeleton className="h-10 flex-1" /> {/* Input skeleton */}
                    <Skeleton className="h-10 w-28" /> {/* Button skeleton */}
                </div>
            </div>
            <div className="text-center py-10">
                <Loader2 className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                <h2 className="text-xl font-semibold mb-2">Chargement de la page de recherche...</h2>
            </div>
        </div>
    );
} 