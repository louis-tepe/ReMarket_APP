"use server";

import { LeanProduct } from "@/types/product";
import { searchProducts } from "../core/product-service";
import { SearchFilters } from "@/types/product";

export async function getProducts(filters: SearchFilters): Promise<LeanProduct[]> {
    const result = await searchProducts(filters);
    return result.products;
}

export async function getFeaturedProducts(): Promise<LeanProduct[]> {
  const result = await searchProducts({ isFeatured: true, limit: 4 });
  return result.products;
} 