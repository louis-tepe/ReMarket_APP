import type { Types } from 'mongoose';

// Minimal category information needed for filter display and logic.
export interface LeanCategory {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    description?: string;
    depth: number;
    parent?: Types.ObjectId | string;
    isLeafNode: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

// Minimal brand information for filter display.
export interface LeanBrand {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    categories?: (Types.ObjectId | string)[]; // Categories this brand is associated with
    createdAt: Date | string;
    updatedAt: Date | string;
}

// Props for the ProductCard component, tailored for category/listing pages.
export interface DisplayProductCardProps {
    id: string; // Usually the ProductModel's _id
    slug: string; // Slug for linking to the product page
    name: string; // Product title
    imageUrl?: string; // Primary image URL
    price: number; // Starting price from the cheapest offer
    offerCount?: number; // Total number of available offers
    // initialIsFavorite?: boolean; // This will be determined by page logic, not part of API return directly
}

// State representing the currently active filters on the category page.
export interface FiltersState {
    categorySlug?: string;
    brandSlugs?: string[];
    searchQuery?: string;
    // Potentially add other filters like price range, condition, etc. in the future
} 