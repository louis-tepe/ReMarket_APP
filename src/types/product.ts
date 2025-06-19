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
    specifications?: { label: string; value: string; }[];
}

/*
export interface IProductOffer extends LeanProduct {
    // This interface is currently empty because all fields are in LeanProduct.
    // It's kept for future extension.
}
*/

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

export type SearchFilters = ProductSearchFilters;

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
      errorDetails?: Record<string, string[] | undefined>;
      products: [];
      totalProducts: 0;
    };