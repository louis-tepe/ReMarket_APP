import { IScrapedProduct } from '@/models/ScrapedProduct';
import { IOffer } from '@/models/OfferModel';
import Link from 'next/link';
import ProductCard, { ProductCardProps } from '@/components/shared/ProductCard';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Type attendu par ProductCard, adapté pour inclure le nombre d'offres et le prix de départ
interface CategoryProductCardProps extends ProductCardProps {
    offerCount: number;
}

interface ProductFromApi extends IScrapedProduct { // Supposant que l'API retourne une structure basée sur IScrapedProduct
    _id: string;
    sellerOffers?: IOffer[];
}

async function getCategoryProducts(slug: string): Promise<CategoryProductCardProps[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        console.error("CRITICAL: NEXT_PUBLIC_API_URL is not defined.");
        throw new Error("Configuration error: NEXT_PUBLIC_API_URL is not defined.");
    }
    const fetchUrl = `${apiUrl}/categories/${slug}/products`;

    try {
        const res = await fetch(fetchUrl, { cache: 'no-store' });
        if (!res.ok) {
            // Gérer les erreurs HTTP comme 404 ou 500 plus spécifiquement si nécessaire
            const errorData = await res.text(); // Lire le corps pour plus de détails
            console.error(`Failed to fetch products for category ${slug}: ${res.status} ${res.statusText}. Body: ${errorData}`);
            throw new Error(`Failed to fetch products for category ${slug}. Status: ${res.status}`);
        }
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) {
            console.warn(`API for category ${slug} did not return successful data:`, data.message || 'No data array');
            return []; // Retourner un tableau vide si data.data n'est pas un tableau ou success est false
        }

        const productsFromApi: ProductFromApi[] = data.data;

        return productsFromApi.map((product) => {
            const offers = product.sellerOffers || [];
            const cheapestOffer = offers.length > 0
                ? offers.reduce((min, p) => p.price < min.price ? p : min, offers[0])
                : null;

            // Utiliser _id comme slug pour le lien vers la page produit détaillée
            // La page produit détaillée [productSlug] utilisera cet _id pour fetch les détails complets.
            const productSlugForLink = product._id;

            return {
                id: product._id,
                slug: productSlugForLink, // Ce sera l'ID du ProductModel ou ScrapedProduct
                name: product.title,
                imageUrl: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : undefined,
                price: cheapestOffer ? cheapestOffer.price : 0, // Mettre 0 ou un placeholder si pas d'offre
                offerCount: offers.length,
            };
        }).filter(p => p.price > 0 || p.offerCount === 0); // Filtrer ceux sans prix sauf s'il n'y a aucune offre

    } catch (error) {
        console.error(`Error in getCategoryProducts for slug ${slug}:`, error);
        // Ne pas relancer l'erreur ici pour permettre à la page d'afficher un message
        return []; // Retourner un tableau vide en cas d'erreur pour que la page puisse le gérer
    }
}

export default async function CategoryPage({
    params,
}: {
    params: { slug: string };
}) {
    const { slug } = params;
    const categoryName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    let products: CategoryProductCardProps[] = [];
    let fetchError: string | null = null;

    try {
        products = await getCategoryProducts(slug);
    } catch (error) {
        // L'erreur est déjà loggée dans getCategoryProducts
        // On la capture ici pour afficher un message d'erreur plus global si nécessaire
        // mais getCategoryProducts retourne [] en cas d'erreur interne, donc products sera vide.
        fetchError = error instanceof Error ? error.message : "Une erreur de chargement est survenue.";
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{categoryName}</h1>
                {products.length > 0 && <p className="text-muted-foreground mt-1">{products.length} produits trouvés</p>}
            </div>

            {fetchError && (
                <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md flex items-center">
                    <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold">Erreur de chargement</h3>
                        <p className="text-sm">{fetchError}. Veuillez réessayer plus tard.</p>
                    </div>
                </div>
            )}

            {!fetchError && products.length === 0 && (
                <div className="text-center py-10">
                    <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Aucun produit pour le moment</h2>
                    <p className="text-muted-foreground">
                        Il n&apos;y a pas encore de produits listés dans cette catégorie.
                        <br />Revenez bientôt ou explorez d&apos;autres horizons !
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/">Retour à l&apos;accueil</Link>
                    </Button>
                </div>
            )}

            {!fetchError && products.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            id={product.id}
                            slug={product.slug} // Sera l'ID du produit pour le lien
                            name={product.name}
                            imageUrl={product.imageUrl}
                            price={product.price}
                        // Pourrait ajouter offerCount ou une info spécifique à ReMarket sur le ProductCard si nécessaire
                        // Par exemple, en modifiant ProductCard ou en passant des children
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 