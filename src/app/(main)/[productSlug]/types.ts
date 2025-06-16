// Represents a seller's offer for a product model.
export interface Offer {
    _id: string;
    seller: { _id: string; name?: string };
    price: number;
    currency: string;
    condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair';
    description?: string;
    images?: string[];
    stockQuantity: number;
    transactionStatus: 'available' | 'pending_transaction' | 'sold' | 'archived';
    createdAt: string;
    updatedAt: string;
}

// Represents basic information for a brand or category, typically for display.
export interface BrandOrCategory {
    name: string;
    slug: string;
}

// Simplified Brand interface for product display
export interface SimpleBrand {
    _id: string;
    name: string;
    slug: string;
}

// Simplified Category interface for product display
export interface SimpleCategory {
    _id: string;
    name: string;
    slug: string;
}

// Specification interface
export interface Specification {
    label: string;
    value: string;
    unit?: string;
}

// Defines the comprehensive details of a product, including offers and Ledenicheur data.
export interface Product {
    _id: string;
    title: string;
    slug: string;
    standardDescription: string;
    standardImageUrls: string[];
    specifications: Specification[];
    keyFeatures?: string[];
    offers: Offer[];
    brand: SimpleBrand;
    category: SimpleCategory;
    createdAt: string;
    updatedAt: string;
    sourceUrlLedenicheur?: string;
    variantTitle?: string;
    averagePriceLedenicheur?: number;
    optionChoicesLedenicheur?: { optionName: string; availableValues: string[] }[];
} 