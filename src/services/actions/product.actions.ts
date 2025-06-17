"use server";

import { z } from "zod";
import { LeanProduct } from "@/types/product";
import { searchProducts } from "../core/product-service";
import { SearchFilters } from "@/types/product";

const SearchFiltersSchema = z.object({
    searchQuery: z.string().optional(),
    categorySlug: z.string().optional(),
    brandSlugs: z.array(z.string()).optional(),
    sort: z.enum(['relevance', 'price-asc', 'price-desc']).optional(),
    limit: z.number().int().positive().optional(),
    page: z.number().int().positive().optional(),
    includeOffers: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
});

interface ProductActionResult {
    success: boolean;
    data?: {
        products: LeanProduct[];
        total: number;
        totalPages: number;
    };
    message?: string;
}

export async function getProducts(filters: SearchFilters): Promise<ProductActionResult> {
    try {
        const validatedFilters = SearchFiltersSchema.safeParse(filters);
        if (!validatedFilters.success) {
            return {
                success: false,
                message: "Invalid filter options.",
            };
        }

        const { products, totalProducts } = await searchProducts(validatedFilters.data);
        const limit = validatedFilters.data.limit || 12;
        return {
            success: true,
            data: {
                products: products,
                total: totalProducts,
                totalPages: Math.ceil(totalProducts / limit),
            }
        };
    } catch (error) {
        console.error("Error in getProducts:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, message: errorMessage };
    }
}

export async function getFeaturedProducts(): Promise<LeanProduct[]> {
  const result = await searchProducts({ limit: 4 });
  return result.products;
} 