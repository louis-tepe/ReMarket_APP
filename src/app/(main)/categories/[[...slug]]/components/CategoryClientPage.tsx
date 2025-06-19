'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard, { ProductCardSkeleton } from '@/components/shared/ProductCard';
import FiltersSidebar from '@/components/features/product-listing/FiltersSidebar';
import { AlertTriangle, Info, PanelLeftOpen, Search as SearchIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from "@/components/ui/input";
import { useSession } from 'next-auth/react';
import type { LeanBrand } from '@/types/brand';
import type { LeanCategory } from '@/types/category';

interface FiltersState {
    categorySlug?: string;
    brandSlugs?: string[];
    searchQuery?: string;
}

interface InitialProduct {
    _id: string;
    slug: string;
    title: string;
    standardImageUrls?: string[];
    minPrice?: number;
}

interface CategoryClientPageProps {
    initialProducts: InitialProduct[];
    allRootCategories: LeanCategory[];
    currentCategory: LeanCategory | null;
    currentCategoryChildren: LeanCategory[];
    breadcrumbs: LeanCategory[];
    allBrands: LeanBrand[];
    slug?: string[];
}

async function fetchUserFavorites(): Promise<string[]> {
    const response = await fetch('/api/favorites', { cache: 'default' });
    if (response.ok) {
        const favoriteItems: { id: string }[] = await response.json();
        return favoriteItems.map(fav => fav.id);
    }
    return [];
}

export default function CategoryClientPage({
    initialProducts,
    allRootCategories,
    currentCategory,
    currentCategoryChildren,
    breadcrumbs,
    allBrands,
    slug
}: CategoryClientPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [isPending, startTransition] = useTransition();

    const [currentFilters, setCurrentFilters] = useState<FiltersState>(() => {
        const categorySlugFromUrl = slug?.slice(-1)[0];
        const brandSlugsFromUrl = searchParams.get('brands')?.split(',').filter(Boolean) || [];
        const searchQueryFromUrl = searchParams.get('search') || '';
        return {
            categorySlug: categorySlugFromUrl,
            brandSlugs: brandSlugsFromUrl,
            searchQuery: searchQueryFromUrl,
        };
    });

    const products = useMemo(() =>
        initialProducts.map((product) => ({
            id: product._id.toString(),
            slug: product.slug || product._id.toString(),
            name: product.title,
            imageUrl: product.standardImageUrls?.[0],
            minPrice: product.minPrice,
        })), [initialProducts]);
        
    const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(currentFilters.searchQuery || '');

    useEffect(() => {
        if (session?.user) {
            fetchUserFavorites().then(setFavoriteProductIds).catch(() => setFetchError("Impossible de charger vos favoris."));
        }
    }, [session?.user]);
    
    const updateUrl = useCallback((newFilters: FiltersState) => {
        let pathname: string;
        const query: { brands?: string; search?: string } = {};

        if (newFilters.categorySlug) {
            // Reconstruct the full path from breadcrumbs + the new slug if it's not already the last one
            const lastBreadcrumbSlug = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].slug : undefined;
            let slugPath = breadcrumbs.map(b => b.slug).join('/');
            if (newFilters.categorySlug !== lastBreadcrumbSlug) {
                 // This logic might need refinement depending on how categories are structured
                 // For now, assuming breadcrumbs are always correct up to the parent
                 const parentPath = breadcrumbs.map(b => b.slug).join('/');
                 slugPath = parentPath ? `${parentPath}/${newFilters.categorySlug}` : newFilters.categorySlug;
            }
             pathname = `/categories/${slugPath}`;
        } else {
            pathname = '/categories';
        }

        if (newFilters.brandSlugs?.length) {
            query.brands = newFilters.brandSlugs.join(',');
        }
        if (newFilters.searchQuery?.trim()) {
            query.search = newFilters.searchQuery.trim();
        }
        
        startTransition(() => {
            // @ts-expect-error Typed routes are not yet fully supported with dynamic pathnames.
            router.push({ pathname, query }, { scroll: false });
        });
    }, [router, breadcrumbs]);

    const handleFiltersChange = useCallback((newFilterValues: Partial<FiltersState>) => {
        const updatedFilters = { ...currentFilters, ...newFilterValues };
        
        if (newFilterValues.categorySlug !== undefined && currentFilters.categorySlug !== newFilterValues.categorySlug) {
            updatedFilters.brandSlugs = [];
            updatedFilters.searchQuery = '';
            setSearchInputValue('');
        }
        
        setCurrentFilters(updatedFilters);
        updateUrl(updatedFilters);

        if (window.innerWidth < 768) setIsSidebarOpenOnMobile(false);
    }, [currentFilters, updateUrl]);

    const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedSearch = searchInputValue.trim();
        if (currentFilters.searchQuery !== trimmedSearch) {
            handleFiltersChange({ searchQuery: trimmedSearch });
        }
    }, [searchInputValue, handleFiltersChange, currentFilters.searchQuery]);

    const handleFavoriteToggle = useCallback((productId: string, isFavorite: boolean) => {
        setFavoriteProductIds(prevIds =>
            isFavorite ? [...prevIds, productId] : prevIds.filter(id => id !== productId)
        );
    }, []);

    const pageTitle = currentCategory?.name || "Catalogue des produits";
    const currentSearchTerm = searchParams.get('search') || '';

    return (
        <div className="container mx-auto px-2 sm:px-4 py-8">
            <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSidebarOpenOnMobile(true)}
                className="md:hidden fixed top-20 left-4 z-30 h-10 w-10 shadow-md"
            >
                <PanelLeftOpen className="h-5 w-5" />
            </Button>
            <div className={cn("flex flex-col md:flex-row md:gap-8 lg:gap-10")}>
                <div className={cn(
                    "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden",
                    isSidebarOpenOnMobile ? "block" : "hidden"
                )} onClick={() => setIsSidebarOpenOnMobile(false)}></div>

                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0",
                    isSidebarOpenOnMobile ? "translate-x-0 w-full max-w-xs sm:max-w-sm" : "-translate-x-full"
                )}>
                    <FiltersSidebar
                        allRootCategories={allRootCategories}
                        currentCategory={currentCategory}
                        currentCategoryChildren={currentCategoryChildren}
                        breadcrumbs={breadcrumbs}
                        allBrands={allBrands}
                        activeBrandSlugs={currentFilters.brandSlugs || []}
                        onFiltersChange={handleFiltersChange}
                        basePath="/categories"
                    />
                </div>
                <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0"></div>

                <main className="flex-1 pt-4 md:pt-0">
                    <div className="mb-6 md:mb-8 p-4 border rounded-lg shadow-sm">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{pageTitle}</h1>
                        <form onSubmit={handleSearchSubmit} className="mt-4 mb-6 flex w-full max-w-lg items-center space-x-2">
                            <Input
                                type="search"
                                placeholder={currentCategory ? `Rechercher dans ${currentCategory.name}...` : "Rechercher des produits..."}
                                value={searchInputValue}
                                onChange={(e) => setSearchInputValue(e.target.value)}
                                className="flex-1"
                                aria-label="Rechercher des produits"
                                disabled={isPending}
                            />
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                                Rechercher
                            </Button>
                        </form>
                        {isPending && <p className="text-muted-foreground mt-1 text-sm sm:text-base">Mise à jour des résultats...</p>}
                        {!isPending && products.length > 0 && !currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{products.length} produits trouvés.</p>}
                        {!isPending && products.length > 0 && currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{products.length} résultats pour &quot;{currentSearchTerm}&quot;.</p>}
                        {!isPending && products.length === 0 && <p className="text-muted-foreground mt-1 text-sm sm:text-base">Aucun produit ne correspond à vos critères.</p>}
                    </div>

                    {fetchError && (
                        <div className="bg-destructive/10 border border-destructive text-destructive p-3 sm:p-4 rounded-md flex items-center">
                            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Erreur de chargement</p>
                                <p className="text-sm">{fetchError}</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                        {isPending ? (
                            Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)
                        ) : (
                            products.map(product => (
                                <ProductCard
                                    key={product.id}
                                    {...product}
                                    initialIsFavorite={favoriteProductIds.includes(product.id)}
                                    onFavoriteToggle={handleFavoriteToggle}
                                />
                            ))
                        )}
                    </div>
                    
                    {!isPending && products.length === 0 && !fetchError && (
                        <div className="text-center py-10 sm:py-16 px-4">
                            <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Essayez d&apos;ajuster vos filtres ou votre recherche pour trouver ce que vous cherchez.
                            </p>
                            <Button variant="outline" className="mt-6" onClick={() => handleFiltersChange({ categorySlug: undefined, brandSlugs: [], searchQuery: '' })}>
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
} 