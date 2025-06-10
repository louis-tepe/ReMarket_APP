'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard, { ProductCardSkeleton } from '@/components/shared/ProductCard';
import FiltersSidebar from '@/components/features/product-listing/FiltersSidebar';
import { AlertTriangle, Info, PanelLeftOpen, Search as SearchIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Types } from 'mongoose';
import { Input } from "@/components/ui/input";
import { useSession } from 'next-auth/react';
import type { LeanCategory, LeanBrand, DisplayProductCardProps, FiltersState } from '../types';

interface InitialProduct {
    _id: Types.ObjectId | string;
    slug: string;
    title: string;
    standardImageUrls?: string[];
    sellerOffers?: { price: number }[];
}

interface CategoryClientPageProps {
    initialProducts: InitialProduct[];
    allCategories: LeanCategory[];
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

export default function CategoryClientPage({ initialProducts, allCategories, allBrands, slug }: CategoryClientPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [isPending, startTransition] = useTransition();

    const [currentFilters, setCurrentFilters] = useState<FiltersState>(() => {
        const categorySlugFromUrl = slug?.[0];
        const brandSlugsFromUrl = searchParams.get('brands')?.split(',').filter(Boolean) || [];
        const searchQueryFromUrl = searchParams.get('search') || '';
        return {
            categorySlug: categorySlugFromUrl,
            brandSlugs: brandSlugsFromUrl,
            searchQuery: searchQueryFromUrl,
        };
    });

    const [products] = useState<DisplayProductCardProps[]>(
        initialProducts.map((product) => {
            const offers = product.sellerOffers || [];
            const cheapestOffer = offers.length > 0 ? offers.reduce((min, p) => p.price < min.price ? p : min, offers[0]) : null;
            return {
                id: product._id.toString(),
                slug: product.slug || product._id.toString(),
                name: product.title,
                imageUrl: product.standardImageUrls?.[0],
                price: cheapestOffer?.price || 0,
                offerCount: offers.length,
            };
        })
    );
    const [availableBrands] = useState<LeanBrand[]>(allBrands);
    const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
    const [fetchError] = useState<string | null>(null);
    const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(currentFilters.searchQuery || '');

    const currentCategoryObject = useMemo(() =>
        allCategories.find(cat => cat.slug === currentFilters.categorySlug)
        , [currentFilters.categorySlug, allCategories]);
        
    const getCategoryAncestors = (categorySlug: string | undefined, categories: LeanCategory[]): string[] => {
        if (!categorySlug || categories.length === 0) return [];
        const ancestors: string[] = [];
        let currentCategory = categories.find(c => c.slug === categorySlug);

        while (currentCategory?.parent) {
            const parentIdStr = typeof currentCategory.parent === 'string'
                ? currentCategory.parent
                : (currentCategory.parent as Types.ObjectId).toString();

            const parentCategory = categories.find(c =>
                (typeof c._id === 'string' ? c._id : (c._id as Types.ObjectId).toString()) === parentIdStr
            );

            if (parentCategory) {
                ancestors.push(typeof parentCategory._id === 'string' ? parentCategory._id : (parentCategory._id as Types.ObjectId).toString());
                currentCategory = parentCategory;
            } else {
                break;
            }
        }
        return ancestors.reverse();
    }
    
    const activeCategoryAncestors = useMemo(() =>
        getCategoryAncestors(currentFilters.categorySlug, allCategories)
        , [currentFilters.categorySlug, allCategories]);

    useEffect(() => {
        // Fetch favorites on initial load if user is logged in
        if (session?.user) {
            fetchUserFavorites().then(setFavoriteProductIds);
        }
    }, [session?.user]);

    const updateUrlAndRefetch = useCallback((newFilters: FiltersState) => {
        const query = new URLSearchParams();
        if (newFilters.brandSlugs?.length) {
            query.set('brands', newFilters.brandSlugs.join(','));
        }
        if (newFilters.searchQuery?.trim()) {
            query.set('search', newFilters.searchQuery.trim());
        }

        const newPath = `/categories${newFilters.categorySlug ? `/${newFilters.categorySlug}` : ''}`;
        const finalUrl = `${newPath}${query.toString() ? `?${query.toString()}` : ''}`;
        
        // Update URL and let the server component handle data refetching via router.refresh()
        startTransition(() => {
            // Using window.history.pushState to avoid a full page reload, 
            // but relying on router.refresh() to re-run the server component's data fetching.
            window.history.pushState(null, '', finalUrl);
            router.refresh();
        });
    }, [router]);

    const handleFiltersChange = useCallback((newFilterValues: Partial<FiltersState>) => {
        const updatedFilters = { ...currentFilters, ...newFilterValues };
        
        // If category changes, reset brands and search query
        if (newFilterValues.categorySlug !== undefined && currentFilters.categorySlug !== newFilterValues.categorySlug) {
            updatedFilters.brandSlugs = [];
            updatedFilters.searchQuery = '';
            setSearchInputValue(''); // also reset input field
        }
        
        setCurrentFilters(updatedFilters);
        updateUrlAndRefetch(updatedFilters);

        if (window.innerWidth < 768) {
            setIsSidebarOpenOnMobile(false);
        }
    }, [currentFilters, updateUrlAndRefetch]);

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

    const pageTitle = currentCategoryObject?.name ||
        (currentFilters.categorySlug ? currentFilters.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Catalogue des produits");
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
                        allCategories={allCategories}
                        allBrands={availableBrands}
                        activeCategorySlug={currentFilters.categorySlug}
                        activeBrandSlugs={currentFilters.brandSlugs || []}
                        onFiltersChange={handleFiltersChange}
                        basePath="/categories"
                        currentCategoryAncestors={activeCategoryAncestors}
                    />
                </div>
                <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0"></div>

                <main className="flex-1 pt-4 md:pt-0">
                    <div className="mb-6 md:mb-8 p-4 border rounded-lg shadow-sm">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{pageTitle}</h1>

                        <form onSubmit={handleSearchSubmit} className="mt-4 mb-6 flex w-full max-w-lg items-center space-x-2">
                            <Input
                                type="search"
                                placeholder={currentCategoryObject ? `Rechercher dans ${currentCategoryObject.name}...` : "Rechercher des produits..."}
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