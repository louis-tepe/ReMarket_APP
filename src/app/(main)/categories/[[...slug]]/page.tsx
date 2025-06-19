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

    const categorySlug = params.slug?.slice(-1)[0];
    const brandSlugs = searchParams.brands ? String(searchParams.brands).split(',') : undefined;

    const [productsResult, categoriesResult, brandsResult] = await Promise.all([
        getProducts({ categorySlug, brandSlugs }),
        getAllCategories({ activeSlug: categorySlug }),
        getAllBrands()
    ]);

    if (!categoriesResult.success || !brandsResult.success || !productsResult.success) {
        // Log the errors for debugging on the server
        console.error("Failed to fetch page data:", { categoriesResult, brandsResult, productsResult });
        // Render a user-friendly error message
        return <div>Erreur lors du chargement des données de la page. Veuillez réessayer plus tard.</div>;
    }

    const { allRootCategories, currentCategory, currentCategoryChildren, breadcrumbs } = categoriesResult.data;

    return (
        <CategoryClientPage
            initialProducts={JSON.parse(JSON.stringify(productsResult.products || []))}
            allRootCategories={allRootCategories}
            currentCategory={currentCategory}
            currentCategoryChildren={currentCategoryChildren}
            breadcrumbs={breadcrumbs}
            allBrands={JSON.parse(JSON.stringify(brandsResult.data || []))}
            slug={params.slug}
        />
    );
} 