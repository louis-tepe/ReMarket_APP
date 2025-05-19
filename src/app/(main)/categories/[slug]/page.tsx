'use client'; // Transformer en Client Component pour utiliser les hooks

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/shared/ProductCard';
import FiltersSidebar from '@/components/shared/FiltersSidebar'; // Import du nouveau composant
import { AlertTriangle, Info, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICategory } from '@/models/CategoryModel';
import { IBrand } from '@/models/BrandModel';
import { IScrapedProduct } from '@/models/ScrapedProduct'; // Gardé pour la structure de ProductFromApi
import { IOffer } from '@/models/OfferModel'; // Gardé pour la structure de ProductFromApi
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
interface ProductFromApi extends IScrapedProduct { // Adapter si la structure de l'API /products change
    _id: string;
    sellerOffers?: IOffer[];
}

interface FiltersState {
    categorySlug?: string;
    brandSlugs?: string[];
}

// Simule la structure de l'API pour les catégories et marques
// Vous devrez les fetcher réellement dans useEffect
async function getAllCategories(): Promise<ICategory[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${apiUrl}/categories`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data = await res.json();
    return data.categories || [];
}

// Modifié pour accepter categorySlug
async function fetchFilteredBrands(categorySlug?: string): Promise<IBrand[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    let url = `${apiUrl}/brands`;
    if (categorySlug) {
        url += `?categorySlug=${categorySlug}`;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch brands');
    const data = await res.json();
    return data.brands || [];
}

async function getFilteredProducts(filters: FiltersState): Promise<DisplayProductCardProps[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        console.error("CRITICAL: NEXT_PUBLIC_API_URL is not defined.");
        throw new Error("Configuration error: NEXT_PUBLIC_API_URL is not defined.");
    }

    let fetchUrl = `${apiUrl}/products`;
    const queryParams = new URLSearchParams();
    if (filters.categorySlug) {
        queryParams.append('categorySlug', filters.categorySlug);
    }
    if (filters.brandSlugs && filters.brandSlugs.length > 0) {
        queryParams.append('brandSlugs', filters.brandSlugs.join(','));
    }

    if (queryParams.toString()) {
        fetchUrl += `?${queryParams.toString()}`;
    } else {
        fetchUrl = `${apiUrl}/products`; // Aucun filtre, fetch tous les produits
    }

    try {
        const res = await fetch(fetchUrl, { cache: 'no-store' });
        if (!res.ok) {
            const errorData = await res.text();
            console.error(`Failed to fetch products (${fetchUrl}): ${res.status} ${res.statusText}. Body: ${errorData}`);
            throw new Error(`Failed to fetch products. Status: ${res.status}`);
        }
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) {
            console.warn(`API (${fetchUrl}) did not return successful data:`, data.message || 'No data array');
            return [];
        }

        const productsFromApi: ProductFromApi[] = data.data;

        return productsFromApi.map((product) => {
            const offers = product.sellerOffers || [];
            const cheapestOffer = offers.length > 0
                ? offers.reduce((min, p) => p.price < min.price ? p : min, offers[0])
                : null;

            const productSlugForLink = product.slug || product._id;

            return {
                id: product._id,
                slug: productSlugForLink,
                name: product.title,
                imageUrl: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : undefined,
                price: cheapestOffer ? cheapestOffer.price : 0,
                offerCount: offers.length,
            };
        }).filter(p => p.price > 0 || p.offerCount === 0);

    } catch (error) {
        console.error(`Error in getFilteredProducts with URL ${fetchUrl}:`, error);
        return [];
    }
}

// Fonction pour trouver les ancêtres d'une catégorie
function getCategoryAncestors(categorySlug: string | undefined, categories: ICategory[]): string[] {
    if (!categorySlug) return [];
    const ancestors: string[] = [];
    let current = categories.find(c => c.slug === categorySlug);
    while (current && current.parent) {
        const parent = categories.find(c => c._id.toString() === current!.parent!.toString());
        if (parent) {
            ancestors.push(parent._id.toString());
            current = parent;
        } else {
            break;
        }
    }
    return ancestors.reverse(); // Pour avoir du plus haut au plus bas parent
}

// La prop `params` est maintenant typée comme une Promise par Next.js pour les Client Components
export default function CategoryPage({ params: paramsPromise }: { params: Promise<{ slug?: string }> }) {
    const params = use(paramsPromise); // Déballer la Promise params avec React.use()
    const initialCategorySlug = params.slug;
    const [currentFilters, setCurrentFilters] = useState<FiltersState>({ categorySlug: initialCategorySlug });

    const [products, setProducts] = useState<DisplayProductCardProps[]>([]);
    const [allCategories, setAllCategories] = useState<ICategory[]>([]);
    const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]); // Renommé allBrands en availableBrands

    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isLoadingFiltersData, setIsLoadingFiltersData] = useState(true); // État de chargement pour les filtres
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);

    const currentCategory = useMemo(() => {
        if (!currentFilters.categorySlug) return null;
        return allCategories.find(cat => cat.slug === currentFilters.categorySlug);
    }, [currentFilters.categorySlug, allCategories]);

    const currentCategoryAncestors = useMemo(() => {
        return getCategoryAncestors(currentFilters.categorySlug, allCategories);
    }, [currentFilters.categorySlug, allCategories]);

    // Fetch initial categories (once)
    useEffect(() => {
        async function loadInitialFilterData() {
            setIsLoadingFiltersData(true);
            try {
                const categoriesData = await getAllCategories();
                setAllCategories(categoriesData);
            } catch (error) {
                console.error("Failed to load initial categories:", error);
                setFetchError(error instanceof Error ? error.message : "Erreur de chargement des catégories.");
            } finally {
                setIsLoadingFiltersData(false);
            }
        }
        loadInitialFilterData();
    }, []);

    // Fetch brands when categorySlug filter changes
    useEffect(() => {
        async function loadBrandsForCategory() {
            if (isLoadingFiltersData && allCategories.length === 0) return; // Attendre que les catégories soient chargées pour éviter race condition
            // Mettre setIsLoadingFilters à true ici si on veut un indicateur pour les marques
            try {
                const brandsData = await fetchFilteredBrands(currentFilters.categorySlug);
                setAvailableBrands(brandsData);
            } catch (error) {
                console.error("Failed to load brands for category:", error);
                // Gérer l'erreur pour les marques spécifiquement si nécessaire
                setFetchError(error instanceof Error ? error.message : "Erreur de chargement des marques.");
            }
        }
        loadBrandsForCategory();
    }, [currentFilters.categorySlug, isLoadingFiltersData, allCategories]); // Dépend de categorySlug et isLoadingFilters

    const loadProducts = useCallback(async (filters: FiltersState) => {
        setIsLoadingProducts(true);
        setFetchError(null); // Réinitialiser l'erreur avant de fetcher les produits
        try {
            const fetchedProducts = await getFilteredProducts(filters);
            setProducts(fetchedProducts);
        } catch (error) {
            console.error("Failed to load products:", error);
            setFetchError(error instanceof Error ? error.message : "Erreur de chargement des produits.");
            setProducts([]);
        } finally {
            setIsLoadingProducts(false);
        }
    }, []);

    // Fetch products when filters change
    useEffect(() => {
        if (!isLoadingFiltersData) { // S'assurer que les données de filtres (au moins catégories) sont là
            loadProducts(currentFilters);
        }
    }, [currentFilters, loadProducts, isLoadingFiltersData]);

    const handleFiltersChange = useCallback((newFilters: FiltersState) => {
        setCurrentFilters(prev => {
            const updatedFilters = { ...prev, ...newFilters };
            // Si le slug de catégorie change, réinitialiser les marques sélectionnées
            // car les marques disponibles vont changer.
            if (prev.categorySlug !== updatedFilters.categorySlug) {
                updatedFilters.brandSlugs = [];
            }
            return updatedFilters;
        });
        // Fermer la sidebar sur mobile après un changement de filtre si elle était ouverte
        if (window.innerWidth < 768) { // md breakpoint
            setIsSidebarOpenOnMobile(false);
        }
    }, []);

    const pageTitle = currentCategory ? currentCategory.name : (initialCategorySlug ? initialCategorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Tous les produits");
    const isLoadingGlobal = isLoadingFiltersData || isLoadingProducts;

    return (
        <div className="container mx-auto px-2 sm:px-4 py-6">
            {/* Bouton pour ouvrir la sidebar sur mobile */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => setIsSidebarOpenOnMobile(true)}
                className="md:hidden fixed top-20 left-4 z-30 h-10 w-10 shadow-md"
            >
                <PanelLeftOpen className="h-5 w-5" />
            </Button>

            <div className={cn("flex flex-col md:flex-row md:gap-6 lg:gap-8")}>
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
                        initialCategorySlug={initialCategorySlug}
                        onFiltersChange={handleFiltersChange}
                        basePath="/categories"
                        currentCategoryAncestors={currentCategoryAncestors}
                    />
                </div>
                {/* Invisible div pour pousser le contenu quand la sidebar est sticky sur desktop */}
                <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0"></div>

                <main className="flex-1 pt-12 md:pt-0">
                    <div className="mb-6 md:mb-8">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{pageTitle}</h1>
                        {!isLoadingGlobal && products.length > 0 && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{products.length} produits trouvés</p>}
                        {isLoadingGlobal && <Skeleton className="h-6 w-1/3 sm:w-1/4 mt-2" />}
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

                    {!isLoadingGlobal && !fetchError && products.length === 0 && (
                        <div className="text-center py-8 sm:py-10">
                            <Info className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                            <h2 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Aucun produit pour le moment</h2>
                            <p className="text-muted-foreground text-sm sm:text-base">
                                Aucun produit ne correspond à votre sélection.
                                <br />Essayez d&apos;ajuster vos filtres ou explorez d&apos;autres catégories.
                            </p>
                            <Button asChild className="mt-4 sm:mt-6">
                                <Link href="/">Retour à l&apos;accueil</Link>
                            </Button>
                        </div>
                    )}

                    {isLoadingGlobal && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div key={index} className="space-y-2">
                                    <Skeleton className="h-40 sm:h-48 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoadingGlobal && !fetchError && products.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {products.map((product) => (
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
                </main>
            </div>
        </div>
    );
} 