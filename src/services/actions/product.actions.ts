"use server";

import { LeanProduct } from "@/types/product";
import { searchProducts } from "../core/product-service";
import { SearchFilters } from "@/types/product";

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
        const result = await searchProducts(filters);
        return {
            success: true,
            data: {
                products: result.products,
                total: result.total,
                totalPages: result.totalPages,
            }
        };
    } catch (error) {
        console.error("Error in getProducts:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, message: errorMessage };
    }
}

export async function getFeaturedProducts(): Promise<LeanProduct[]> {
  const result = await searchProducts({ isFeatured: true, limit: 4 });
  return result.products;
} 