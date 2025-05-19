'use client'; // Transformer en Client Component pour utiliser les hooks

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/shared/ProductCard';
import FiltersSidebar from '@/components/shared/FiltersSidebar'; // Import du nouveau composant
import { AlertTriangle, Info, PanelLeftOpen, Search as SearchIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICategory } from '@/models/CategoryModel';
import { IBrand } from '@/models/BrandModel';
import { IProductModel } from '@/models/ProductModel'; // Utilisation de IProductModel
import { IOffer } from '@/models/OfferModel'; // Gardé pour la structure de ProductFromApi
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Types } from 'mongoose';
import { Input } from "@/components/ui/input"; // Ajout de l'Input pour la recherche

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
interface ProductFromApi extends Omit<IProductModel, '_id' | 'standardImageUrls' | 'slug' | 'title' | 'category' | 'brand'> {
    _id: string; // Doit être string après le fetch et .lean()
    title: string;
    slug?: string; // Slug est dans IProductModel
    standardImageUrls: string[];
    // category et brand sont des ObjectId dans IProductModel, on ne les attend pas directement ici pour l'affichage de la carte
    sellerOffers?: IOffer[];
}

interface FiltersState {
    categorySlug?: string;
    brandSlugs?: string[];
    searchQuery?: string; // Ajout pour la recherche textuelle
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

    const hasCategoryFilter = filters.categorySlug && filters.categorySlug.trim() !== '';
    const hasBrandFilters = filters.brandSlugs && filters.brandSlugs.length > 0;

    if (hasCategoryFilter) {
        queryParams.append('categorySlug', filters.categorySlug!);
    }
    if (hasBrandFilters) {
        queryParams.append('brandSlugs', filters.brandSlugs!.join(','));
    }
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        queryParams.append('search', filters.searchQuery.trim());
    }

    if (queryParams.toString()) {
        fetchUrl += `?${queryParams.toString()}`;
    } else {
        // Aucun filtre actif, l'URL reste /api/products pour tout récupérer
        console.log("[CategoryPage] Aucun filtre actif, appel de /api/products pour tous les produits.");
    }

    console.log("[CategoryPage] Fetching products from:", fetchUrl);

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

        // Assurons-nous que data.data est bien un tableau de IProductModel enrichi avec sellerOffers
        const productsFromApi: (IProductModel & { _id: string; sellerOffers?: IOffer[] })[] = data.data;

        return productsFromApi.map((product) => {
            const offers = product.sellerOffers || [];
            const cheapestOffer = offers.length > 0
                ? offers.reduce((min, p) => p.price < min.price ? p : min, offers[0])
                : null;

            // Utiliser product.slug s'il est défini, sinon _id.toString()
            // Cela suppose que IScrapedProduct a maintenant un champ slug?: string
            const productSlugForLink = product.slug || product._id.toString();

            return {
                id: product._id.toString(),
                slug: productSlugForLink,
                name: product.title, // Assumant que product.title existe sur IProductModel
                imageUrl: product.standardImageUrls && product.standardImageUrls.length > 0 ? product.standardImageUrls[0] : undefined,
                price: cheapestOffer ? cheapestOffer.price : 0,
                offerCount: offers.length,
            };
        }).filter(p => p.offerCount > 0);

    } catch (error) {
        console.error(`Error in getFilteredProducts with URL ${fetchUrl}:`, error);
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
    const initialCategorySlugFromUrl = params.slug?.[0]; // Slug venant de l'URL

    // currentFilters.categorySlug est la source de vérité pour la catégorie active
    const [currentFilters, setCurrentFilters] = useState<FiltersState>({ categorySlug: initialCategorySlugFromUrl });
    const [products, setProducts] = useState<DisplayProductCardProps[]>([]);
    const [allCategories, setAllCategories] = useState<ICategory[]>([]);
    const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]);

    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isLoadingFiltersData, setIsLoadingFiltersData] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(''); // État local pour l'input de recherche

    const currentCategoryObject = useMemo(() => {
        if (!currentFilters.categorySlug) return null;
        return allCategories.find(cat => cat.slug === currentFilters.categorySlug);
    }, [currentFilters.categorySlug, allCategories]);

    const activeCategoryAncestors = useMemo(() => {
        // Toujours calculer les ancêtres basé sur le currentFilters.categorySlug
        return getCategoryAncestors(currentFilters.categorySlug, allCategories);
    }, [currentFilters.categorySlug, allCategories]);

    // Effet pour mettre à jour currentFilters.categorySlug si l'URL slug change (navigation navigateur)
    useEffect(() => {
        if (initialCategorySlugFromUrl !== currentFilters.categorySlug) {
            setCurrentFilters(prev => ({ ...prev, categorySlug: initialCategorySlugFromUrl, brandSlugs: [], searchQuery: '' }));
            setSearchInputValue(''); // Réinitialiser aussi l'input de recherche
        }
    }, [initialCategorySlugFromUrl]); // Ne dépend que du slug de l'URL

    useEffect(() => {
        async function loadInitialCategories() {
            setIsLoadingFiltersData(true);
            try {
                const categoriesData = await getAllCategories();
                setAllCategories(categoriesData);
            } catch (error) {
                console.error("Failed to load initial categories:", error);
                setFetchError(error instanceof Error ? error.message : "Erreur de chargement des filtres.");
            } finally {
                setIsLoadingFiltersData(false);
            }
        }
        loadInitialCategories();
    }, []);

    useEffect(() => {
        async function loadBrandsForCategory() {
            if (currentFilters.categorySlug && isLoadingFiltersData && allCategories.length === 0) {
                return;
            }

            try {
                const brandsData = await fetchFilteredBrands(currentFilters.categorySlug);
                setAvailableBrands(brandsData);
            } catch (error) {
                console.error("Failed to load brands for category:", error);
                setFetchError(error instanceof Error ? error.message : "Erreur de chargement des marques.");
            }
        }
        if (!isLoadingFiltersData || !currentFilters.categorySlug) {
            loadBrandsForCategory();
        }
    }, [currentFilters.categorySlug, allCategories, isLoadingFiltersData]);

    const loadProducts = useCallback(async (filters: FiltersState) => {
        setIsLoadingProducts(true);
        setFetchError(null);
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

    useEffect(() => {
        if (!isLoadingFiltersData) {
            loadProducts(currentFilters);
        }
    }, [currentFilters, loadProducts, isLoadingFiltersData]);

    const handleFiltersChange = useCallback((newFiltersFromSidebar: Partial<FiltersState>) => {
        setCurrentFilters(prevFilters => {
            const updatedFilters = { ...prevFilters, ...newFiltersFromSidebar };
            // Si le slug de catégorie change via la sidebar, réinitialiser les marques sélectionnées
            // et s'assurer que le slug de la catégorie est bien celui de la sidebar.
            if (prevFilters.categorySlug !== newFiltersFromSidebar.categorySlug) {
                updatedFilters.brandSlugs = [];
                updatedFilters.searchQuery = ''; // Réinitialiser la recherche si la catégorie change
                setSearchInputValue(''); // Vider l'input de recherche
            }
            // Si newFiltersFromSidebar ne contient que brandSlugs, categorySlug reste celui de prevFilters.
            return updatedFilters;
        });
        if (window.innerWidth < 768) {
            setIsSidebarOpenOnMobile(false);
        }
    }, []);

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCurrentFilters(prevFilters => ({
            ...prevFilters,
            searchQuery: searchInputValue.trim()
        }));
    };

    const pageTitle = currentCategoryObject ? currentCategoryObject.name : (currentFilters.categorySlug ? currentFilters.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Catalogue des produits");
    const isLoadingGlobal = isLoadingFiltersData || isLoadingProducts;
    const currentSearchTerm = currentFilters.searchQuery;

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
                        activeCategorySlug={currentFilters.categorySlug} // Passe le slug de l'état de la page
                        onFiltersChange={handleFiltersChange}
                        basePath="/categories"
                        currentCategoryAncestors={activeCategoryAncestors} // Passe les ancêtres de la catégorie active
                    />
                </div>
                {/* Invisible div pour pousser le contenu quand la sidebar est sticky sur desktop */}
                <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0"></div>

                <main className="flex-1 pt-12 md:pt-0">
                    <div className="mb-6 md:mb-8">
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
                            <Button type="submit" disabled={isLoadingProducts}>
                                {isLoadingProducts && currentFilters.searchQuery ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                                Rechercher
                            </Button>
                        </form>

                        {!isLoadingGlobal && products.length > 0 && !currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{products.length} produits trouvés dans cette catégorie.</p>}
                        {!isLoadingGlobal && products.length > 0 && currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">{products.length} produits trouvés pour &quot;{currentSearchTerm}&quot; {currentCategoryObject ? `dans ${currentCategoryObject.name}` : ''}.</p>}
                        {!isLoadingGlobal && products.length === 0 && currentSearchTerm && <p className="text-muted-foreground mt-1 text-sm sm:text-base">Aucun produit trouvé pour &quot;{currentSearchTerm}&quot; {currentCategoryObject ? `dans ${currentCategoryObject.name}` : ''}.</p>}
                        {isLoadingGlobal && currentFilters.searchQuery && <p className="text-muted-foreground mt-1 text-sm sm:text-base">Recherche de &quot;{currentFilters.searchQuery}&quot; en cours...</p>}
                        {isLoadingGlobal && !currentFilters.searchQuery && <Skeleton className="h-6 w-1/3 sm:w-1/4 mt-2" />}
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