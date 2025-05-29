import { NextRequest, NextResponse } from 'next/server';

// Importer les types nécessaires, par exemple ProductCardProps de votre composant ProductCard
// export interface ProductCardProps {
//     id: string;
//     slug: string; // Pour le lien vers la page détaillée
//     name: string;
//     imageUrl: string | undefined;
//     price: number; // Prix de départ (offre la moins chère)
//     offerCount?: number; // Optionnel: nombre d'offres pour ce produit
// }

// Données de simulation (pourrait être plus complexe et filtrable)
const MOCK_SEARCH_RESULTS = [
    { id: 'prod_iphone12', slug: 'iphone-12-bleu-128go', name: 'iPhone 12 128Go - Bleu', imageUrl: '/images/placeholders/iphone_search_1.jpg', price: 550, offerCount: 3 },
    { id: 'prod_samsung_s21', slug: 'samsung-galaxy-s21-gris-256go', name: 'Samsung Galaxy S21 256Go - Gris Phantom', imageUrl: '/images/placeholders/samsung_search_1.jpg', price: 620, offerCount: 2 },
    { id: 'prod_macbook_pro_m1', slug: 'macbook-pro-13-m1-2020-512go', name: 'MacBook Pro 13" M1 (2020) 512Go SSD', imageUrl: '/images/placeholders/macbook_search_1.jpg', price: 1200, offerCount: 1 },
    { id: 'prod_sony_xm4', slug: 'sony-wh-1000xm4-noir', name: 'Sony WH-1000XM4 - Noir (Casque)', imageUrl: '/images/placeholders/sony_search_1.jpg', price: 230, offerCount: 5 },
    { id: 'prod_ipad_air_4', slug: 'ipad-air-4-64go-vert', name: 'iPad Air 4ème Gén. 64Go - Vert', imageUrl: '/images/placeholders/ipad_search_1.jpg', price: 480, offerCount: 2 },
];

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query')?.toLowerCase() || '';
    // const category = searchParams.get('category');
    // const brand = searchParams.get('brand');
    // const minPrice = searchParams.get('minPrice');
    // const maxPrice = searchParams.get('maxPrice');

    try {
        // TODO: Remplacer la logique de recherche mockée ci-dessous par une véritable
        // intégration avec la base de données ou un moteur de recherche dédié (ex: Algolia, Elasticsearch).
        let results = MOCK_SEARCH_RESULTS;

        if (query) {
            results = MOCK_SEARCH_RESULTS.filter(product => 
                product.name.toLowerCase().includes(query) ||
                product.slug.toLowerCase().includes(query)
            );
        }

        // Le délai simulé a été supprimé.
        // await new Promise(resolve => setTimeout(resolve, 500)); 

        return NextResponse.json({ success: true, data: results }, { status: 200 });

    } catch (error) {
        // Le console.error a été supprimé.
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json(
            { success: false, message: "Erreur serveur lors de la recherche.", error: errorMessage }, 
            { status: 500 }
        );
    }
} 