'use client'; // Transformer en Client Component pour utiliser les hooks

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/shared/ProductCard';
import FiltersSidebar from '@/components/shared/FiltersSidebar'; // Import du nouveau composant
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
    const res = await fetch(url, { next: { revalidate: 300 } });
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
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session } = useSession(); // Ajout pour la session utilisateur

    // Fonction pour initialiser les filtres depuis l'URL
    const getInitialFilters = useCallback(() => {
        const categorySlugFromUrl = params.slug?.[0];
        const brandSlugsFromUrl = searchParams.get('brands')?.split(',') || [];
        const searchQueryFromUrl = searchParams.get('search') || '';
        return {
            categorySlug: categorySlugFromUrl,
            brandSlugs: brandSlugsFromUrl.filter(b => b), // Filtrer les chaînes vides
            searchQuery: searchQueryFromUrl,
        };
    }, [params.slug, searchParams]);

    const [currentFilters, setCurrentFilters] = useState<FiltersState>(getInitialFilters);
    const [products, setProducts] = useState<DisplayProductCardProps[]>([]);
    const [allCategories, setAllCategories] = useState<ICategory[]>([]);
    const [availableBrands, setAvailableBrands] = useState<IBrand[]>([]);

    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isLoadingFiltersData, setIsLoadingFiltersData] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(currentFilters.searchQuery || '');
    const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]); // État pour les IDs des favoris

    const currentCategoryObject = useMemo(() => {
        if (!currentFilters.categorySlug) return null;
        return allCategories.find(cat => cat.slug === currentFilters.categorySlug);
    }, [currentFilters.categorySlug, allCategories]);

    const activeCategoryAncestors = useMemo(() => {
        // Toujours calculer les ancêtres basé sur le currentFilters.categorySlug
        return getCategoryAncestors(currentFilters.categorySlug, allCategories);
    }, [currentFilters.categorySlug, allCategories]);

    // Effet pour mettre à jour currentFilters si l'URL (pathname ou searchParams) change
    useEffect(() => {
        const filtersFromUrl = getInitialFilters();
        const needsUpdate = (
            filtersFromUrl.categorySlug !== currentFilters.categorySlug ||
            JSON.stringify(filtersFromUrl.brandSlugs.sort()) !== JSON.stringify((currentFilters.brandSlugs || []).sort()) ||
            filtersFromUrl.searchQuery !== (currentFilters.searchQuery || '')
        );

        if (needsUpdate) {
            setCurrentFilters(filtersFromUrl);
            // setSearchInputValue est maintenant géré par son propre useEffect ci-dessous
        }
    }, [pathname, searchParams, getInitialFilters, currentFilters.categorySlug, currentFilters.brandSlugs, currentFilters.searchQuery]);

    // Effet pour synchroniser searchInputValue avec currentFilters.searchQuery
    useEffect(() => {
        if (searchInputValue !== (currentFilters.searchQuery || '')) {
            setSearchInputValue(currentFilters.searchQuery || '');
        }
    }, [currentFilters.searchQuery, searchInputValue]); // searchInputValue ajouté aux dépendances

    // NOUVEAU: Effet pour charger les favoris de l'utilisateur
    useEffect(() => {
        if (session?.user) {
            const fetchUserFavorites = async () => {
                try {
                    const response = await fetch('/api/favorites');
                    if (response.ok) {
                        const favoriteItems: { id: string }[] = await response.json();
                        setFavoriteProductIds(favoriteItems.map(fav => fav.id));
                    } else {
                        console.warn("CategoryPage: Impossible de charger les favoris de l'utilisateur.");
                        setFavoriteProductIds([]);
                    }
                } catch (error) {
                    console.error("CategoryPage: Erreur lors du fetch des favoris:", error);
                    setFavoriteProductIds([]);
                }
            };
            fetchUserFavorites();
        } else {
            // Si l'utilisateur n'est pas connecté, s'assurer que la liste des favoris est vide
            setFavoriteProductIds([]);
        }
    }, [session]);

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
            // On attend que les catégories soient chargées pour éviter des appels inutiles si le slug est au chargement
            if (isLoadingFiltersData && allCategories.length === 0 && currentFilters.categorySlug) {
                return;
            }
            try {
                // fetchFilteredBrands gère déjà le cas où categorySlug est undefined pour toutes les marques
                const brandsData = await fetchFilteredBrands(currentFilters.categorySlug);
                setAvailableBrands(brandsData);
            } catch (error) {
                console.error("Failed to load brands for category:", error);
                setFetchError(error instanceof Error ? error.message : "Erreur de chargement des marques.");
            }
        }
        // Appeler si les catégories sont chargées, ou si on n'attend pas de slug de catégorie (pour charger toutes les marques)
        if (!isLoadingFiltersData) {
            loadBrandsForCategory();
        }
    }, [currentFilters.categorySlug, allCategories.length, isLoadingFiltersData]); // Dépend de la longueur pour réagir au chargement des catégories

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

    const updateUrlWithFilters = useCallback((filters: FiltersState) => {
        const newSearchParams = new URLSearchParams();
        if (filters.brandSlugs && filters.brandSlugs.length > 0) {
            newSearchParams.set('brands', filters.brandSlugs.join(','));
        }
        if (filters.searchQuery && filters.searchQuery.trim() !== '') {
            newSearchParams.set('search', filters.searchQuery.trim());
        }

        let newPathname = "/categories";
        if (filters.categorySlug) {
            newPathname += `/${filters.categorySlug}`;
        }

        const queryString = newSearchParams.toString();
        router.push(`${newPathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    }, [router]);

    // NOUVEAU: useEffect pour synchroniser currentFilters vers l'URL
    useEffect(() => {
        const newGeneratedPathname = currentFilters.categorySlug ? `/categories/${currentFilters.categorySlug}` : '/categories';
        const newGeneratedSearchParams = new URLSearchParams();
        if (currentFilters.brandSlugs && currentFilters.brandSlugs.length > 0) {
            newGeneratedSearchParams.set('brands', currentFilters.brandSlugs.join(','));
        }
        if (currentFilters.searchQuery && currentFilters.searchQuery.trim() !== '') {
            newGeneratedSearchParams.set('search', currentFilters.searchQuery.trim());
        }
        const newGeneratedQueryString = newGeneratedSearchParams.toString();

        // Comparer avec l'URL actuelle du navigateur
        const currentPathname = pathname; // Provient de usePathname()
        const currentQueryString = searchParams.toString(); // Provient de useSearchParams()

        if (currentPathname !== newGeneratedPathname || currentQueryString !== newGeneratedQueryString) {
            updateUrlWithFilters(currentFilters);
        }
    }, [currentFilters.categorySlug, currentFilters.brandSlugs, currentFilters.searchQuery, router, pathname, searchParams, updateUrlWithFilters, currentFilters]);

    const handleFiltersChange = useCallback((newFiltersFromSidebar: Partial<FiltersState>) => {
        setCurrentFilters(prevFilters => {
            const updatedFiltersResult: FiltersState = { ...prevFilters };

            // Appliquer les changements de la sidebar si les clés sont présentes dans newFiltersFromSidebar
            if (Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'categorySlug')) {
                updatedFiltersResult.categorySlug = newFiltersFromSidebar.categorySlug;
            }
            if (Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'brandSlugs')) {
                updatedFiltersResult.brandSlugs = newFiltersFromSidebar.brandSlugs;
            }
            if (Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'searchQuery')) {
                updatedFiltersResult.searchQuery = newFiltersFromSidebar.searchQuery;
            }

            // Si la catégorie a changé (y compris si elle a été effacée -> undefined)
            if (prevFilters.categorySlug !== updatedFiltersResult.categorySlug) {
                // Réinitialiser brandSlugs seulement si non explicitement fourni dans cette mise à jour
                if (!Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'brandSlugs')) {
                    updatedFiltersResult.brandSlugs = [];
                }
                // Réinitialiser searchQuery seulement si non explicitement fourni dans cette mise à jour
                if (!Object.prototype.hasOwnProperty.call(newFiltersFromSidebar, 'searchQuery')) {
                    updatedFiltersResult.searchQuery = '';
                }
            }
            return updatedFiltersResult;
        });
        if (window.innerWidth < 768) {
            setIsSidebarOpenOnMobile(false);
        }
    }, [setIsSidebarOpenOnMobile]);

    const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const newSearchQuery = searchInputValue.trim();
        setCurrentFilters(prevFilters => {
            const updatedFilters = {
                ...prevFilters,
                searchQuery: newSearchQuery
            };
            return updatedFilters;
        });
    }, [searchInputValue]);

    // NOUVEAU: Handler pour la mise à jour des favoris
    const handleFavoriteToggle = useCallback((productId: string, isFavorite: boolean) => {
        setFavoriteProductIds(prevIds => {
            if (isFavorite) {
                return prevIds.includes(productId) ? prevIds : [...prevIds, productId];
            }
            return prevIds.filter(id => id !== productId);
        });
    }, []);

    const pageTitle = currentCategoryObject ? currentCategoryObject.name : (currentFilters.categorySlug ? currentFilters.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Catalogue des produits");
    const isLoadingGlobal = isLoadingFiltersData || isLoadingProducts;
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
                        activeCategorySlug={currentFilters.categorySlug} // Passe le slug de l'état de la page
                        activeBrandSlugs={currentFilters.brandSlugs || []} // NOUVEAU: Passer les slugs de marque actifs
                        onFiltersChange={handleFiltersChange}
                        basePath="/categories"
                        currentCategoryAncestors={activeCategoryAncestors} // Passe les ancêtres de la catégorie active
                    />
                </div>
                {/* Invisible div pour pousser le contenu quand la sidebar est sticky sur desktop */}
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