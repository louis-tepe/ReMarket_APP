import { NextRequest, NextResponse } from 'next/server';
// import dbConnect from '@/lib/db.Connect';
// import ProductModel, { IProductModel } from '@/models/ProductModel';
// import SellerProduct, { ISellerProduct } from '@/models/SellerProduct';
// import ScrapedProduct, { IScrapedProduct } from '@/models/ScrapedProduct';

// Types simulés pour la réponse
interface SimulatedSellerOffer {
    id: string;
    sellerName: string; // Simplifié, normalement on aurait un ID vendeur et on populerait
    price: number;
    condition: string;
    sellerDescription?: string;
    // photos?: string[]; // Photos spécifiques du vendeur pour cette offre
}

interface SimulatedProductDetails {
    id: string;
    slug: string;
    title: string;
    brand: string;
    category: string;
    standardDescription: string;
    standardImageUrls: string[];
    keyFeatures?: string[];
    specifications?: { label: string; value: string; unit?: string }[];
    offers: SimulatedSellerOffer[];
}

// Données de simulation
const MOCK_PRODUCT_DATA: Record<string, SimulatedProductDetails> = {
    "iphone-13-pro-graphite-256go": {
        id: "pm_iphone13pro",
        slug: "iphone-13-pro-graphite-256go",
        title: "iPhone 13 Pro 256Go - Graphite",
        brand: "Apple",
        category: "Téléphones Mobiles",
        standardDescription: "L'iPhone 13 Pro. Le plus grand bond en avant du système photo Pro d'Apple. Écran Super Retina XDR avec ProMotion pour une réactivité inédite. Puce A15 Bionic surpuissante. Design en acier inoxydable chirurgical et Ceramic Shield, plus résistant que n'importe quel verre de smartphone.",
        standardImageUrls: [
            '/images/placeholders/iphone1.jpg', 
            '/images/placeholders/iphone2.jpg',
        ],
        keyFeatures: ["Écran Super Retina XDR 6,1 pouces avec ProMotion", "Puce A15 Bionic", "Système photo pro 12 Mpx"],
        specifications: [
            { label: "Capacité", value: "256Go" },
            { label: "Couleur", value: "Graphite" },
            { label: "Écran", value: "6.1 pouces OLED" },
        ],
        offers: [
            {
                id: "offer_1a",
                sellerName: "TechRevendeur75",
                price: 750,
                condition: "Comme neuf",
                sellerDescription: "Très peu utilisé, aucune rayure. Batterie à 98%. Vendu avec boîte et chargeur d'origine."
            },
            {
                id: "offer_1b",
                sellerName: "MobileOccazParis",
                price: 690,
                condition: "Bon état",
                sellerDescription: "Quelques micro-rayures sur l'écran, invisibles écran allumé. Fonctionne parfaitement."
            },
        ],
    },
    "macbook-air-m2-minuit-512go": {
        id: "pm_macbookairm2",
        slug: "macbook-air-m2-minuit-512go",
        title: "MacBook Air M2 13.6p 512Go - Minuit",
        brand: "Apple",
        category: "Ordinateurs Portables",
        standardDescription: "Le MacBook Air repensé est plus portable que jamais et pèse à peine 1,24 kg. C'est l'ordinateur portable ultra-capable qui vous permet de travailler, de jouer ou de créer à peu près n'importe quoi, n'importe où.",
        standardImageUrls: [
            '/images/placeholders/macbook1.jpg',
            '/images/placeholders/macbook2.jpg',
        ],
        keyFeatures: ["Puce Apple M2", "Écran Liquid Retina de 13,6 pouces", "Jusqu'à 18 heures d'autonomie"],
        specifications: [
            { label: "Capacité SSD", value: "512Go" },
            { label: "Couleur", value: "Minuit" },
            { label: "RAM", value: "8Go" },
        ],
        offers: [
            {
                id: "offer_2a",
                sellerName: "LaptopProIDF",
                price: 1100,
                condition: "Comme neuf",
                sellerDescription: "Acheté il y a 3 mois, très peu servi. Sous garantie Apple encore 9 mois."
            },
        ],
    },
};

export async function GET(
    request: NextRequest,
    { params: incomingParams }: { params: { slug: string } }
) {
    const params = await incomingParams;
    const { slug } = params;

    // await dbConnect(); // En commentaire pour la simulation

    try {
        // Simulation: trouver le produit par slug dans les données mockées
        const productData = MOCK_PRODUCT_DATA[slug];

        if (!productData) {
            return NextResponse.json({ message: 'Produit non trouvé.' }, { status: 404 });
        }

        // Dans un cas réel, ici on chercherait le ProductModel (ou ScrapedProduct)
        // puis les SellerProduct associés.

        return NextResponse.json(productData, { status: 200 });

    } catch (error) {
        console.error(`[GET /api/products/${slug}]`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
        return NextResponse.json({ message: 'Erreur lors de la récupération du produit.', error: errorMessage }, { status: 500 });
    }
} 