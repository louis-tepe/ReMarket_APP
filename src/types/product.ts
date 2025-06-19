import { Types } from "mongoose";

export interface LeanProduct {
    _id: number;
    title: string;
    slug: string;
    standardImageUrls?: string[];
    sellerOffers?: { price: number }[];
    category?: Types.ObjectId | string;
    brand?: Types.ObjectId | string;
    isFeatured?: boolean;
    minPrice?: number;
}

export interface SearchFilters {
    searchQuery?: string;
    categorySlug?: string;
    brandSlugs?: string[];
    sort?: 'relevance' | 'price-asc' | 'price-desc';
    limit?: number;
    page?: number;
    includeOffers?: boolean;
    isFeatured?: boolean;
}

export interface ProductSearchServiceResult {
    products: LeanProduct[];
    totalProducts: number;
} 