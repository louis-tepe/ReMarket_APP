import { getProducts } from '@/services/actions/product.actions';
import CategoryClientPage from './components/CategoryClientPage';
import { getAllCategories } from '@/services/actions/category.actions';
import { getAllBrands } from '@/services/actions/brand.actions';

interface PageProps {
    params: Promise<{ slug?: string[] }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * CategoryPage: Displays a list of products based on selected categories, brands, and search queries.
 * This is a Server Component that fetches initial data and passes it to a Client Component.
 */
export default async function CategoryPage({ params: paramsPromise, searchParams: searchParamsPromise }: PageProps) {
    const params = await paramsPromise;
    const searchParams = await searchParamsPromise;

    const categorySlug = params.slug?.[0];
    const brandSlugs = searchParams.brands ? String(searchParams.brands).split(',') : undefined;

    const [products, categoriesResult, brandsResult] = await Promise.all([
        getProducts({ categorySlug, brandSlugs }),
        getAllCategories(),
        getAllBrands()
    ]);

    if (!categoriesResult.success || !brandsResult.success) {
        // Log the errors for debugging on the server
        console.error("Failed to fetch page data:", { categoriesResult, brandsResult });
        // Render a user-friendly error message
        return <div>Erreur lors du chargement des données de la page. Veuillez réessayer plus tard.</div>;
    }

    // Correctif: Sérialiser les données pour s'assurer qu'aucun type complexe (comme ObjectId) n'est passé au composant client.
    const serializedProducts = JSON.parse(JSON.stringify(products));
    const serializedCategories = JSON.parse(JSON.stringify(categoriesResult.data));
    const serializedBrands = JSON.parse(JSON.stringify(brandsResult.data));

    return (
        <CategoryClientPage
            initialProducts={serializedProducts}
            allCategories={serializedCategories}
            allBrands={serializedBrands}
            slug={params.slug}
        />
    );
} 