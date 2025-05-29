// Represents a seller's offer for a product model.
export interface SellerOffer {
    id: string;
    seller: { id: string; name?: string };
    price: number;
    currency: string;
    quantity: number;
    condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair';
    sellerDescription?: string;
    sellerPhotos?: string[];
}

// Represents basic information for a brand or category, typically for display.
export interface BrandOrCategory {
    name: string;
    slug: string;
}

// Defines the comprehensive details of a product, including offers and Idealo data.
export interface ProductDetails {
    id: string;
    slug: string;
    title: string;
    brand: BrandOrCategory;
    category: BrandOrCategory;
    standardDescription: string;
    standardImageUrls: string[];
    keyFeatures?: string[];
    specifications?: { label: string; value: string; unit?: string }[];
    offers: SellerOffer[];
    sourceUrlIdealo?: string;
    variantTitle?: string;
    priceNewIdealo?: number;
    priceUsedIdealo?: number;
    optionChoicesIdealo?: { optionName: string; availableValues: string[] }[];
    qasIdealo?: { question: string; answer: string }[];
} 