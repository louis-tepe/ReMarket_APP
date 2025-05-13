import { IScrapedProduct } from '@/models/ScrapedProduct';
import { ISellerProduct } from '@/models/SellerProduct';
import Link from 'next/link';

interface ProductWithOffers extends IScrapedProduct {
    _id: string; // ID du produit (JSON.stringify convertit ObjectId en string)
    sellerOffers: ISellerProduct[];
}

// Type pour les produits tels qu'ils pourraient arriver de l'API, où sellerOffers est optionnel
interface ProductFromApi extends IScrapedProduct {
    _id: string;
    sellerOffers?: ISellerProduct[];
}

async function getCategoryProducts(slug: string): Promise<ProductWithOffers[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        console.error("CRITICAL: NEXT_PUBLIC_API_URL is not defined. This is required for API calls. Please set it in your .env.local file (e.g., NEXT_PUBLIC_API_URL=http://localhost:3000).");
        // Vous pourriez lancer une erreur ici pour une meilleure visibilité
        throw new Error("Configuration error: NEXT_PUBLIC_API_URL is not defined.");
    }

    const fetchUrl = `${apiUrl}/categories/${slug}/products`;
    console.log(`Fetching category products from: ${fetchUrl}`); // Log pour débogage

    const res = await fetch(fetchUrl, {
        cache: 'no-store',
    });

    if (!res.ok) {
        console.error(`Failed to fetch products for category ${slug}: ${res.status} ${res.statusText}`);
        // On pourrait lancer une erreur ici pour que Next.js la gère (ex: notFound() ou Error Boundary)
        // throw new Error(`Failed to fetch products for category ${slug}`); 
        return [];
    }

    const data = await res.json();
    // Typer explicitement productsFromApi pour clarifier la structure attendue de l'API
    const productsFromApi: ProductFromApi[] = data.data || [];

    // S'assurer que chaque produit a un champ sellerOffers, même s'il est vide.
    const productsWithGuaranteedOffers = productsFromApi.map((product: ProductFromApi) => ({
        ...product,
        sellerOffers: product.sellerOffers || [],
    }));

    return productsWithGuaranteedOffers as ProductWithOffers[];
}

export default async function CategoryPage({
    params,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    searchParams: _searchParams, // Nom changé pour refléter la non-utilisation
}: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { slug } = await params; // Résoudre la promesse params
    // Si vous aviez besoin de searchParams :
    // const resolvedSearchParams = searchParams ? await searchParams : {};

    const productsWithOffers = await getCategoryProducts(slug);

    // Récupérer le nom de la catégorie si nécessaire (par exemple à partir d'une autre API ou passé en props)
    // Pour l'instant, on utilise le slug comme titre
    const categoryName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">{categoryName}</h1>

            {productsWithOffers.length === 0 ? (
                <p className="text-gray-600">Aucun produit trouvé dans cette catégorie pour le moment.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {productsWithOffers.map((product) => (
                        <Link key={product._id as string} href={`/${product._id}`} className="block border rounded-lg shadow-lg overflow-hidden bg-white hover:shadow-xl transition-shadow duration-200 ease-in-out">
                            {/* Produit Officiel (ScrapedProduct) */}
                            <div className="p-6">
                                {product.imageUrls && product.imageUrls.length > 0 && (
                                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200 mb-4">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={product.imageUrls[0]}
                                            alt={product.title}
                                            className="h-full w-full object-cover object-center group-hover:opacity-75"
                                        />
                                    </div>
                                )}
                                <h2 className="text-xl font-semibold text-gray-800 mb-2 truncate" title={product.title}>{product.title}</h2>
                                <p className="text-sm text-gray-500 mb-1">Marque: {product.brand || 'N/A'}</p>
                                {product.productModelName && <p className="text-sm text-gray-500 mb-3">Modèle: {product.productModelName}</p>}

                                {/* Description courte (si disponible et pertinente) */}
                                {/* <p className="text-gray-600 text-sm mb-4 truncate-3-lines">{product.description}</p> */}
                            </div>

                            {/* Offres des Vendeurs (SellerProduct) */}
                            {product.sellerOffers && product.sellerOffers.length > 0 && (
                                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                                    <h3 className="text-md font-semibold text-gray-700 mb-3">Offres des vendeurs :</h3>
                                    <ul className="space-y-3">
                                        {product.sellerOffers.map((offer) => (
                                            <li key={offer._id as string} className="p-3 bg-white border border-gray-300 rounded-md shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-lg font-bold text-indigo-600">{offer.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${offer.condition === 'Comme neuf' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {offer.condition}
                                                    </span>
                                                </div>
                                                {offer.sellerDescription && <p className="text-xs text-gray-500 mt-1 truncate">{offer.sellerDescription}</p>}
                                                {/* TODO: Ajouter un lien vers la page de l'offre/produit du vendeur ou un bouton "Ajouter au panier" qui sélectionne cette offre */}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {product.sellerOffers && product.sellerOffers.length === 0 && (
                                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                                    <p className="text-sm text-gray-500">Aucune offre de vendeur disponible pour ce produit actuellement.</p>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
} 