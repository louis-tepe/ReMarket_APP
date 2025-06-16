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
        const { products, totalProducts } = await searchProducts(filters);
        const limit = filters.limit || 12;
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