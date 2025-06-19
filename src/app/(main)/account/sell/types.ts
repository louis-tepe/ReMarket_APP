// Basic information for a product model linked to a seller's offer.
export interface ProductModelInfo {
    id: string;
    name: string;
    imageUrl?: string; // Optional image URL for display
}

// Represents a seller's offer with its current status and details.
export interface SellerOffer {
    id: string;
    productModel: ProductModelInfo;
    price: number;
    currency: string;
    condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair';
    status: 'available' | 'reserved' | 'sold' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'archived';
    sellerDescription?: string;
    sellerPhotos?: string[]; // URLs of seller-provided photos
    createdAt: string; // ISO date string
    shippingInfo?: {
        trackingNumber?: string;
        labelUrl?: string;
    };
}

export interface FrontendCategory {
    _id: string;
    name: string;
    slug: string;
    parent: string | null;
    ancestors: { _id: string; name: string; slug: string }[];
    isLeafNode: boolean;
    depth: number;
}

export interface CategoryDropdownLevel {
    level: number;
    parentId: string | null;
    options: FrontendCategory[];
    selectedId: string | null;
    placeholder: string;
}

export interface IBrand {
    _id: string;
    name: string;
    slug: string;
}

export interface ProductModelReMarketSelectItem {
    id: string;
    name: string;
}

export interface Specifications {
    label: string;
    value: string;
    unit?: string;
}

interface IPriceAnalysisPeriod {
    average_price?: number;
    data_points?: number;
}

export interface IPriceAnalysis {
    "3_months"?: IPriceAnalysisPeriod;
    "6_months"?: IPriceAnalysisPeriod;
    "1_year"?: IPriceAnalysisPeriod;
}

export interface DisplayableProductModel {
    _id: string; // This is the SellerProduct ID
    leDenicheurId: number; // This is the ScrapingProduct ID
    title: string;
    brand: { name: string; } | string;
    category: { name: string; } | string;
    standardImageUrls: string[];
    rawImageUrls?: string[];
    standardDescription?: string;
    rawDescription?: string;
    keyFeatures?: string[];
    specifications?: Specifications[];
    rawAttributes?: { label: string; value: string; }[];
    rawCategoryName?: string;
    rawAsin?: string;
    variantTitle?: string;
    // Fields from ScrapingProduct
    options?: Record<string, string[]>;
    price_analysis?: IPriceAnalysis;
    product: {
        title: string;
        image_url?: string;
    };
}

export const NOT_LISTED_ID = 'not-listed-create-new';

export interface FormFieldDefinition {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    required: boolean;
    placeholder?: string;
    options?: { value: string; label:string; }[];
    defaultValue?: string | number | boolean;
    description?: string;
}