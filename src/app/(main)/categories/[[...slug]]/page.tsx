'use client'; // Transformer en Client Component pour utiliser les hooks

import { use, useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProductCard, { ProductCardSkeleton } from '@/components/shared/ProductCard';
import FiltersSidebar from '@/components/features/product-listing/FiltersSidebar'; // Import du nouveau composant
import { AlertTriangle, Info, PanelLeftOpen, Search as SearchIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICategory } from '@/models/CategoryModel';
import { IBrand } from '@/models/BrandModel';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Types } from 'mongoose';
import { Input } from "@/components/ui/input"; // Ajout de l'Input pour la recherche
import { useSession } from 'next-auth/react'; // Ajout de useSession
import type { LeanCategory, LeanBrand, DisplayProductCardProps, FiltersState } from './types'; // Import types

// DIAGNOSTIC: Fonctions avec logs de performance
/** Fetches all categories. */
async function getAllCategories(): Promise<ICategory[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${apiUrl}/categories`, { cache: 'force-cache' });
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data = await res.json();
    return data.categories || [];
}

// Modifié pour accepter categorySlug
/** Fetches brands, optionally filtered by categorySlug. */
async function fetchFilteredBrands(categorySlug?: string): Promise<IBrand[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    let url = `${apiUrl}/brands`;
    if (categorySlug) url += `?categorySlug=${categorySlug}`;
    const res = await fetch(url, { cache: 'default' });
    if (!res.ok) throw new Error('Failed to fetch brands');
    const data = await res.json();
    return data.brands || [];
}

/** Fetches products based on applied filters. */
async function getFilteredProducts(filters: FiltersState): Promise<DisplayProductCardProps[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("Configuration error: NEXT_PUBLIC_API_URL is not defined.");

    let fetchUrl = `${apiUrl}/products`;
    const queryParams = new URLSearchParams();
    if (filters.categorySlug?.trim()) queryParams.append('categorySlug', filters.categorySlug);
    if (filters.brandSlugs?.length) queryParams.append('brandSlugs', filters.brandSlugs.join(','));
    if (filters.searchQuery?.trim()) queryParams.append('search', filters.searchQuery.trim());
    if (queryParams.toString()) fetchUrl += `?${queryParams.toString()}`;

    const res = await fetch(fetchUrl, { cache: 'default' });
    if (!res.ok) throw new Error(`Failed to fetch products. Status: ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return [];

    const productsFromApi: (import('@/models/ProductModel').IProductModel & { _id: string; sellerOffers?: import('@/models/ProductBaseModel').IProductBase[] })[] = data.data;

    return productsFromApi.map((product) => {
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
    });
}

// DIAGNOSTIC: Fonction pour charger les favoris utilisateur
/** Fetches IDs of user's favorite products. */
async function fetchUserFavorites(): Promise<string[]> {
    const response = await fetch('/api/favorites', { cache: 'default' });
    if (response.ok) {
        const favoriteItems: { id: string }[] = await response.json();
        return favoriteItems.map(fav => fav.id);
    }
    return [];
}

/**
 * Calculates the ancestor path for a given category slug.
 * @param categorySlug The current category's slug.
 * @param categories Array of all available categories.
 * @returns An array of ancestor category IDs (strings).
 */
function getCategoryAncestors(categorySlug: string | undefined, categories: ICategory[]): string[] {
    if (!categorySlug || categories.length === 0) return [];
    const ancestors: string[] = [];
    let currentCategory = categories.find(c => c.slug === categorySlug);

    while (currentCategory?.parent) { // Added optional chaining for safety
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

// Pour [[...slug]], params est { slug?: string[] }
interface CategoryPageProps {
    params: Promise<{ slug?: string[] }>;
}

/**
 * CategoryPage: Displays a list of products based on selected categories, brands, and search queries.
 * Features a filter sidebar, product grid, and handles loading/error states.
 */
export default function CategoryPage({ params: paramsPromise }: CategoryPageProps) {
    const params = use(paramsPromise);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [isPending, startTransition] = useTransition();

    // Centralized state for current filters based on URL
    const [currentFilters, setCurrentFilters] = useState<FiltersState>(() => {
        const categorySlugFromUrl = params.slug?.[0];
        const brandSlugsFromUrl = searchParams.get('brands')?.split(',').filter(Boolean) || [];
        const searchQueryFromUrl = searchParams.get('search') || '';
        return {
            categorySlug: categorySlugFromUrl,
            brandSlugs: brandSlugsFromUrl,
            searchQuery: searchQueryFromUrl,
        };
    });

    // State for fetched data
    const [products, setProducts] = useState<DisplayProductCardProps[]>([]);
    const [allCategories, setAllCategories] = useState<ICategory[]>([]);
    const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]);
    const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

    // UI and loading states
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(currentFilters.searchQuery || '');

    // Memoized derived state
    const currentCategoryObject = useMemo(() =>
        allCategories.find(cat => cat.slug === currentFilters.categorySlug)
        , [currentFilters.categorySlug, allCategories]);

    const activeCategoryAncestors = useMemo(() =>
        getCategoryAncestors(currentFilters.categorySlug, allCategories)
        , [currentFilters.categorySlug, allCategories]);

    // Main data loading effect, triggered by filter changes
    useEffect(() => {
        let isMounted = true;
        const loadAllData = async () => {
            const overallStart = Date.now();
            console.log(`[CLIENT-PERF] Starting loadAllData for filters:`, currentFilters);
            setIsLoading(true);
            setFetchError(null);

            try {
                // DIAGNOSTIC: Chargement en parallèle au lieu de séquentiel
                console.log(`[CLIENT-PERF] Starting Promise.allSettled...`);
                const promiseStart = Date.now();
                const [categoriesRes, brandsRes, productsRes, favoritesRes] = await Promise.allSettled([
                    getAllCategories(),
                    fetchFilteredBrands(currentFilters.categorySlug),
                    getFilteredProducts(currentFilters),
                    session?.user ? fetchUserFavorites() : Promise.resolve([])
                ]);
                console.log(`[CLIENT-PERF] Promise.allSettled completed: ${Date.now() - promiseStart}ms`);

                if (!isMounted) return;

                if (categoriesRes.status === 'fulfilled') setAllCategories(categoriesRes.value);
                else if (categoriesRes.status === 'rejected') throw categoriesRes.reason;

                if (brandsRes.status === 'fulfilled') setAvailableBrands(brandsRes.value);
                else if (brandsRes.status === 'rejected') throw brandsRes.reason;

                if (productsRes.status === 'fulfilled') setProducts(productsRes.value);
                else if (productsRes.status === 'rejected') throw productsRes.reason;

                if (favoritesRes.status === 'fulfilled') setFavoriteProductIds(favoritesRes.value);
                // No throw for favorites error, it's non-critical
                else if (favoritesRes.status === 'rejected') console.error("Failed to fetch favorites:", favoritesRes.reason);

            } catch (error: unknown) {
                console.error(`[CLIENT-ERROR] loadAllData error after ${Date.now() - overallStart}ms:`, error);
                const errorMessage = error instanceof Error ? error.message : "Erreur de chargement des données.";
                if (isMounted) setFetchError(errorMessage);
            } finally {
                if (isMounted) {
                    console.log(`[CLIENT-PERF] loadAllData completed: ${Date.now() - overallStart}ms total`);
                    setIsLoading(false);
                }
            }
        };
        loadAllData();
        return () => { isMounted = false; };
    }, [currentFilters, session?.user]);

    // Sync URL with component state (and vice-versa on initial load/navigation)
    useEffect(() => {
        const categorySlugFromUrl = params.slug?.[0];
        const brandSlugsFromUrl = searchParams.get('brands')?.split(',').filter(Boolean) || [];
        const searchQueryFromUrl = searchParams.get('search') || '';

        const urlFilters: FiltersState = {
            categorySlug: categorySlugFromUrl,
            brandSlugs: brandSlugsFromUrl,
            searchQuery: searchQueryFromUrl,
        };

        // Check if component state needs to update from URL (e.g. browser back/forward)
        if (JSON.stringify(urlFilters) !== JSON.stringify(currentFilters)) {
            setCurrentFilters(urlFilters);
            setSearchInputValue(urlFilters.searchQuery || '');
        }
    }, [pathname, searchParams, params.slug, currentFilters]); // Rerun when URL parts change

    // Update URL when filters change in the component (e.g. from sidebar interaction)
    const updateUrlFromFilters = useCallback((newFilters: FiltersState) => {
        const query = new URLSearchParams();
        if (newFilters.brandSlugs?.length) query.set('brands', newFilters.brandSlugs.join(','));
        if (newFilters.searchQuery?.trim()) query.set('search', newFilters.searchQuery.trim());

        const newPath = `/categories${newFilters.categorySlug ? `/${newFilters.categorySlug}` : ''}`;
        const finalUrl = `${newPath}${query.toString() ? `?${query.toString()}` : ''}`;

        // Use setTimeout to defer the navigation outside of render cycle
        setTimeout(() => {
            startTransition(() => {
                window.history.pushState(null, '', finalUrl);
                // Force a re-render by updating the search params
                router.refresh();
            });
        }, 0);
    }, [router, startTransition]);

    /**
     * Handles filter changes triggered by the FiltersSidebar or search input.
     * Updates the local filter state and then updates the URL.
     */
    const handleFiltersChange = useCallback((newFilterValues: Partial<FiltersState>) => {
        setCurrentFilters(prevFilters => {
            const updated: FiltersState = { ...prevFilters, ...newFilterValues };
            // If category changes, reset brands and search unless they are also part of this update
            if (newFilterValues.categorySlug !== undefined && prevFilters.categorySlug !== newFilterValues.categorySlug) {
                if (newFilterValues.brandSlugs === undefined) updated.brandSlugs = [];
                if (newFilterValues.searchQuery === undefined) updated.searchQuery = '';
            }

            // Schedule URL update for next tick to avoid calling during render
            setTimeout(() => updateUrlFromFilters(updated), 0);
            return updated;
        });
        if (window.innerWidth < 768) setIsSidebarOpenOnMobile(false);
    }, [updateUrlFromFilters]);

    /**
     * Handles the submission of the search form.
     */
    const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        handleFiltersChange({ searchQuery: searchInputValue.trim() });
    }, [searchInputValue, handleFiltersChange]);

    /**
     * Toggles a product's favorite status in the local state.
     */
    const handleFavoriteToggle = useCallback((productId: string, isFavorite: boolean) => {
        setFavoriteProductIds(prevIds =>
            isFavorite ? [...prevIds, productId] : prevIds.filter(id => id !== productId)
        );
    }, []);

    const pageTitle = currentCategoryObject?.name ||
        (currentFilters.categorySlug ? currentFilters.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Catalogue des produits");
    const currentSearchTerm = currentFilters.searchQuery;

    return (
        <div className="container mx-auto px-2 sm:px-4 py-8">
            {/* Bouton pour ouvrir la sidebar sur mobile */}
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
                        allCategories={allCategories as LeanCategory[]}
                        allBrands={availableBrands as LeanBrand[]}
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

                        {/* Barre de recherche */}
                        <form onSubmit={handleSearchSubmit} className="mt-4 mb-6 flex w-full max-w-lg items-center space-x-2">
                            <Input
                                type="search"
                                placeholder={currentCategoryObject ? `Rechercher dans ${currentCategoryObject.name}...` : "Rechercher des produits..."}
                                value={searchInputValue}
                                onChange={(e) => setSearchInputValue(e.target.value)}
                                className="flex-1"
                                aria-label="Rechercher des produits"
                                disabled={isLoading || isPending}
                            />
                            <Button type="submit" disabled={isLoading || isPending}>
                                {(isLoading && currentFilters.searchQuery) || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                                Rechercher
                            </Button>
                        </form>

                        {!isLoading && products.length > 0 && !currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{products.length} produits trouvés dans cette catégorie.</p>}
                        {!isLoading && products.length > 0 && currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{products.length} produits trouvés pour &quot;{currentSearchTerm}&quot; {currentCategoryObject ? `dans ${currentCategoryObject.name}` : ''}.</p>}
                        {!isLoading && products.length === 0 && currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">Aucun produit trouvé pour &quot;{currentSearchTerm}&quot; {currentCategoryObject ? `dans ${currentCategoryObject.name}` : ''}.</p>}
                        {isLoading && currentFilters.searchQuery && <p className="text-muted-foreground mt-1 text-sm sm:text-base">Recherche de &quot;{currentFilters.searchQuery}&quot; en cours...</p>}
                        {isLoading && !currentFilters.searchQuery && <Skeleton className="h-6 w-1/3 sm:w-1/4 mt-2" />}
                    </div>

                    {fetchError && (
                        <div className="bg-destructive/10 border border-destructive text-destructive p-3 sm:p-4 rounded-md flex items-center">
                            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-sm sm:text-base">Erreur de chargement</h3>
                                <p className="text-xs sm:text-sm">{fetchError}. Veuillez réessayer plus tard.</p>
                            </div>
                        </div>
                    )}

                    {!isLoading && !fetchError && products.length === 0 && (
                        <div className="text-center py-8 sm:py-10">
                            <Info className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">
                                {currentSearchTerm ? `Aucun résultat pour "${currentSearchTerm}"` : "Aucun produit pour le moment"}
                            </h2>
                            <p className="text-muted-foreground text-sm sm:text-base">
                                {currentSearchTerm
                                    ? `Nous n'avons trouvé aucun produit correspondant à votre recherche ${currentCategoryObject ? `dans ${currentCategoryObject.name}` : ''}. Essayez avec d'autres mots-clés.`
                                    : `Aucun produit ne correspond à votre sélection de filtres ${currentCategoryObject ? `dans ${currentCategoryObject.name}` : ''}. Essayez d'élargir vos critères.`}
                            </p>
                            <Button asChild className="mt-4 sm:mt-6">
                                <Link href="/">Retour à l&apos;accueil</Link>
                            </Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <ProductCardSkeleton key={index} />
                            ))}
                        </div>
                    )}

                    {!isLoading && !fetchError && products.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    slug={product.slug}
                                    name={product.name}
                                    imageUrl={product.imageUrl}
                                    price={product.price}
                                    offerCount={product.offerCount}
                                    initialIsFavorite={favoriteProductIds.includes(product.id)}
                                    onFavoriteToggle={handleFavoriteToggle}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
} 