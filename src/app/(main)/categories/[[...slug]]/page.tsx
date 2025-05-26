'use client'; // Transformer en Client Component pour utiliser les hooks

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProductCard, { ProductCardSkeleton } from '@/components/shared/ProductCard';
import FiltersSidebar from '@/components/features/product-listing/FiltersSidebar'; // Import du nouveau composant
import { AlertTriangle, Info, PanelLeftOpen, Search as SearchIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICategory } from '@/models/CategoryModel';
import { IBrand } from '@/models/BrandModel';
import { IProductModel } from '@/models/ProductModel'; // Utilisation de IProductModel
import { IProductBase as IOffer } from '@/models/ProductBaseModel'; // Modifié pour utiliser IProductBase
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Types } from 'mongoose';
import { Input } from "@/components/ui/input"; // Ajout de l'Input pour la recherche
import { useSession } from 'next-auth/react'; // Ajout de useSession

// Définition du type LeanCategory (identique à celui dans FiltersSidebar.tsx)
interface LeanCategory {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    description?: string;
    depth: number;
    parent?: Types.ObjectId | string;
    isLeafNode: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

// Définition du type LeanBrand (pour correspondre à FiltersSidebar.tsx)
interface LeanBrand {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    categories?: (Types.ObjectId | string)[];
    createdAt: Date | string;
    updatedAt: Date | string;
}

// Type attendu par ProductCard, adapté pour inclure le nombre d'offres et le prix de départ
interface DisplayProductCardProps {
    id: string;
    slug: string; // Sera l'ID du ProductModel pour le lien
    name: string;
    imageUrl?: string;
    price: number;
    offerCount?: number; // Optionnel, si on veut l'afficher
}

// Structure de données attendue de l'API des produits filtrés
// interface ProductFromApi extends Omit<IProductModel, '_id' | 'standardImageUrls' | 'slug' | 'title' | 'category' | 'brand'> {\n// _id: string; // Doit être string après le fetch et .lean()\n// title: string;\n// slug?: string; // Slug est dans IProductModel\n// standardImageUrls: string[];\n//     // category et brand sont des ObjectId dans IProductModel, on ne les attend pas directement ici pour l'affichage de la carte\n// sellerOffers?: IOffer[];\n// }\n

interface FiltersState {
    categorySlug?: string;
    brandSlugs?: string[];
    searchQuery?: string; // Ajout pour la recherche textuelle
}

// DIAGNOSTIC: Fonctions avec logs de performance
async function getAllCategories(): Promise<ICategory[]> {
    const startTime = Date.now();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    console.log(`[CLIENT-PERF] Starting categories fetch...`);

    const res = await fetch(`${apiUrl}/categories`, {
        cache: 'force-cache' // Cache navigateur au lieu de Next.js cache
    });
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data = await res.json();
    console.log(`[CLIENT-PERF] Categories fetch completed: ${Date.now() - startTime}ms`);
    return data.categories || [];
}

// Modifié pour accepter categorySlug
async function fetchFilteredBrands(categorySlug?: string): Promise<IBrand[]> {
    const startTime = Date.now();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    let url = `${apiUrl}/brands`;
    if (categorySlug) {
        url += `?categorySlug=${categorySlug}`;
    }
    console.log(`[CLIENT-PERF] Starting brands fetch for category: ${categorySlug}`);

    const res = await fetch(url, {
        cache: 'default' // Cache navigateur par défaut
    });
    if (!res.ok) throw new Error('Failed to fetch brands');
    const data = await res.json();
    console.log(`[CLIENT-PERF] Brands fetch completed: ${Date.now() - startTime}ms`);
    return data.brands || [];
}

async function getFilteredProducts(filters: FiltersState): Promise<DisplayProductCardProps[]> {
    const startTime = Date.now();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        throw new Error("Configuration error: NEXT_PUBLIC_API_URL is not defined.");
    }

    let fetchUrl = `${apiUrl}/products`;
    const queryParams = new URLSearchParams();

    if (filters.categorySlug?.trim()) {
        queryParams.append('categorySlug', filters.categorySlug);
    }
    if (filters.brandSlugs?.length) {
        queryParams.append('brandSlugs', filters.brandSlugs.join(','));
    }
    if (filters.searchQuery?.trim()) {
        queryParams.append('search', filters.searchQuery.trim());
    }

    if (queryParams.toString()) {
        fetchUrl += `?${queryParams.toString()}`;
    }

    console.log(`[CLIENT-PERF] Starting products fetch: ${fetchUrl}`);

    try {
        // DIAGNOSTIC: Pas de cache Next.js côté client
        const res = await fetch(fetchUrl, {
            cache: 'default' // Cache navigateur par défaut
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch products. Status: ${res.status}`);
        }
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) {
            return [];
        }

        const productsFromApi: (IProductModel & { _id: string; sellerOffers?: IOffer[] })[] = data.data;
        console.log(`[CLIENT-PERF] Products fetch completed: ${Date.now() - startTime}ms, found ${productsFromApi.length} products`);

        const mappedProducts = productsFromApi.map((product) => {
            const offers = product.sellerOffers || [];
            const cheapestOffer = offers.length > 0
                ? offers.reduce((min, p) => p.price < min.price ? p : min, offers[0])
                : null;

            const productSlugForLink = product.slug || product._id.toString();

            return {
                id: product._id.toString(),
                slug: productSlugForLink,
                name: product.title,
                imageUrl: product.standardImageUrls?.[0],
                price: cheapestOffer?.price || 0,
                offerCount: offers.length,
            };
        });

        console.log(`[CLIENT-PERF] Products mapping completed: ${Date.now() - startTime}ms total`);
        return mappedProducts;

    } catch (error) {
        console.error(`[CLIENT-ERROR] Error in getFilteredProducts after ${Date.now() - startTime}ms:`, error);
        return [];
    }
}

// DIAGNOSTIC: Fonction pour charger les favoris utilisateur
async function fetchUserFavorites(): Promise<string[]> {
    const startTime = Date.now();
    try {
        console.log(`[CLIENT-PERF] Starting favorites fetch...`);
        const response = await fetch('/api/favorites', {
            cache: 'default' // Cache navigateur par défaut
        });
        if (response.ok) {
            const favoriteItems: { id: string }[] = await response.json();
            console.log(`[CLIENT-PERF] Favorites fetch completed: ${Date.now() - startTime}ms`);
            return favoriteItems.map(fav => fav.id);
        }
        console.log(`[CLIENT-PERF] Favorites fetch failed (non-200): ${Date.now() - startTime}ms`);
        return [];
    } catch (error) {
        console.error(`[CLIENT-ERROR] Error fetching favorites after ${Date.now() - startTime}ms:`, error);
        return [];
    }
}

// Fonction pour trouver les ancêtres d'une catégorie
function getCategoryAncestors(categorySlug: string | undefined, categories: ICategory[]): string[] {
    if (!categorySlug || categories.length === 0) return [];
    const ancestors: string[] = [];
    let currentCategory = categories.find(c => c.slug === categorySlug);

    while (currentCategory && currentCategory.parent) {
        const parentIdStr = typeof currentCategory.parent === 'string'
            ? currentCategory.parent
            : (currentCategory.parent as Types.ObjectId).toString();

        const parentCategory = categories.find(c => {
            const currentParentId = typeof c._id === 'string' ? c._id : (c._id as Types.ObjectId).toString();
            return currentParentId === parentIdStr;
        });

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
export default function CategoryPage({ params: paramsPromise }: { params: Promise<{ slug?: string[] }> }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    // OPTIMISATION: État simplifié
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

    const [products, setProducts] = useState<DisplayProductCardProps[]>([]);
    const [allCategories, setAllCategories] = useState<ICategory[]>([]);
    const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]);
    const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(currentFilters.searchQuery || '');

    // OPTIMISATION: Mémorisation des calculs
    const currentCategoryObject = useMemo(() => {
        if (!currentFilters.categorySlug) return null;
        return allCategories.find(cat => cat.slug === currentFilters.categorySlug);
    }, [currentFilters.categorySlug, allCategories]);

    const activeCategoryAncestors = useMemo(() => {
        return getCategoryAncestors(currentFilters.categorySlug, allCategories);
    }, [currentFilters.categorySlug, allCategories]);

    // DIAGNOSTIC: useEffect unique pour charger toutes les données en parallèle
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
                const [categoriesData, brandsData, productsData, favoritesData] = await Promise.allSettled([
                    getAllCategories(),
                    fetchFilteredBrands(currentFilters.categorySlug),
                    getFilteredProducts(currentFilters),
                    session?.user ? fetchUserFavorites() : Promise.resolve([])
                ]);
                console.log(`[CLIENT-PERF] Promise.allSettled completed: ${Date.now() - promiseStart}ms`);

                if (!isMounted) return;

                // Traitement des résultats
                if (categoriesData.status === 'fulfilled') {
                    setAllCategories(categoriesData.value);
                }

                if (brandsData.status === 'fulfilled') {
                    setAvailableBrands(brandsData.value);
                }

                if (productsData.status === 'fulfilled') {
                    setProducts(productsData.value);
                }

                if (favoritesData.status === 'fulfilled') {
                    setFavoriteProductIds(favoritesData.value);
                }

                // Vérifier s'il y a eu des erreurs
                const errors = [categoriesData, brandsData, productsData, favoritesData]
                    .filter(result => result.status === 'rejected')
                    .map(result => (result as PromiseRejectedResult).reason.message);

                if (errors.length > 0) {
                    setFetchError(errors[0]); // Afficher la première erreur
                }

            } catch (error) {
                console.error(`[CLIENT-ERROR] loadAllData error after ${Date.now() - overallStart}ms:`, error);
                if (isMounted) {
                    setFetchError(error instanceof Error ? error.message : "Erreur de chargement.");
                }
            } finally {
                if (isMounted) {
                    console.log(`[CLIENT-PERF] loadAllData completed: ${Date.now() - overallStart}ms total`);
                    setIsLoading(false);
                }
            }
        };

        loadAllData();

        return () => {
            isMounted = false;
        };
    }, [currentFilters, session?.user]);

    // OPTIMISATION: Synchronisation URL simplifiée
    useEffect(() => {
        const categorySlugFromUrl = params.slug?.[0];
        const brandSlugsFromUrl = searchParams.get('brands')?.split(',').filter(Boolean) || [];
        const searchQueryFromUrl = searchParams.get('search') || '';

        const newFilters = {
            categorySlug: categorySlugFromUrl,
            brandSlugs: brandSlugsFromUrl,
            searchQuery: searchQueryFromUrl,
        };

        // Vérifier si les filtres ont vraiment changé
        const filtersChanged = (
            newFilters.categorySlug !== currentFilters.categorySlug ||
            JSON.stringify(newFilters.brandSlugs.sort()) !== JSON.stringify((currentFilters.brandSlugs || []).sort()) ||
            newFilters.searchQuery !== (currentFilters.searchQuery || '')
        );

        if (filtersChanged) {
            setCurrentFilters(newFilters);
            setSearchInputValue(newFilters.searchQuery || '');
        }
    }, [pathname, searchParams, params.slug, currentFilters]);

    const updateUrlWithFilters = useCallback((filters: FiltersState) => {
        const newSearchParams = new URLSearchParams();
        if (filters.brandSlugs?.length) {
            newSearchParams.set('brands', filters.brandSlugs.join(','));
        }
        if (filters.searchQuery?.trim()) {
            newSearchParams.set('search', filters.searchQuery.trim());
        }

        let newPathname = "/categories";
        if (filters.categorySlug) {
            newPathname += `/${filters.categorySlug}`;
        }

        const queryString = newSearchParams.toString();
        const finalUrl = `${newPathname}${queryString ? `?${queryString}` : ''}`;
        router.push(finalUrl as any, { scroll: false });
    }, [router]);

    const handleFiltersChange = useCallback((newFiltersFromSidebar: Partial<FiltersState>) => {
        setCurrentFilters(prevFilters => {
            const updatedFilters: FiltersState = { ...prevFilters };

            if (Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'categorySlug')) {
                updatedFilters.categorySlug = newFiltersFromSidebar.categorySlug;
            }
            if (Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'brandSlugs')) {
                updatedFilters.brandSlugs = newFiltersFromSidebar.brandSlugs;
            }
            if (Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'searchQuery')) {
                updatedFilters.searchQuery = newFiltersFromSidebar.searchQuery;
            }

            // Réinitialiser les autres filtres si la catégorie change
            if (prevFilters.categorySlug !== updatedFilters.categorySlug) {
                if (!Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'brandSlugs')) {
                    updatedFilters.brandSlugs = [];
                }
                if (!Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'searchQuery')) {
                    updatedFilters.searchQuery = '';
                }
            }

            // Mettre à jour l'URL
            updateUrlWithFilters(updatedFilters);
            return updatedFilters;
        });

        if (window.innerWidth < 768) {
            setIsSidebarOpenOnMobile(false);
        }
    }, [updateUrlWithFilters]);

    const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const newSearchQuery = searchInputValue.trim();
        const updatedFilters = {
            ...currentFilters,
            searchQuery: newSearchQuery
        };
        setCurrentFilters(updatedFilters);
        updateUrlWithFilters(updatedFilters);
    }, [searchInputValue, currentFilters, updateUrlWithFilters]);

    const handleFavoriteToggle = useCallback((productId: string, isFavorite: boolean) => {
        setFavoriteProductIds(prevIds => {
            if (isFavorite) {
                return prevIds.includes(productId) ? prevIds : [...prevIds, productId];
            }
            return prevIds.filter(id => id !== productId);
        });
    }, []);

    const pageTitle = currentCategoryObject ? currentCategoryObject.name : (currentFilters.categorySlug ? currentFilters.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Catalogue des produits");
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
                        allCategories={allCategories as unknown as LeanCategory[]}
                        allBrands={availableBrands as unknown as LeanBrand[]}
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
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && currentFilters.searchQuery ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
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