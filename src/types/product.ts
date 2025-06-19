import { Types } from "mongoose";
import { z } from "zod";

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

export const productSearchFiltersSchema = z.object({
  searchQuery: z.string().optional(),
  categorySlug: z.string().optional(),
  brandSlugs: z.array(z.string()).optional(),
  sort: z.enum(['relevance', 'price-asc', 'price-desc']).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  includeOffers: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  userId: z.string().optional(),
});

export type ProductSearchFilters = z.infer<typeof productSearchFiltersSchema>;

export interface SearchFilters extends ProductSearchFilters {}

export interface ProductSearchServiceResult {
    products: LeanProduct[];
    totalProducts: number;
}

export type ProductSearchServerResult =
  | {
      success: true;
      products: LeanProduct[];
      totalProducts: number;
    }
  | {
      success: false;
      error: string;
      errorDetails?: any;
      products: [];
      totalProducts: 0;
    }; 