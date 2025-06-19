"use server";

import { z } from "zod";
import { LeanProduct } from "@/types/product";
import { searchProducts } from "../core/product-service";
import { SearchFilters } from "@/types/product";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ProductSearchFilters, ProductSearchServerResult, productSearchFiltersSchema } from "@/types/product";

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

/**
 * Server Action pour effectuer une recherche de produits.
 *
 * @param filters Les filtres de recherche.
 * @returns Une promesse qui se résout avec les résultats de la recherche.
 */
export async function getProducts(
  filters: ProductSearchFilters
): Promise<ProductSearchServerResult> {
  const validatedFilters = productSearchFiltersSchema.safeParse(filters);

  if (!validatedFilters.success) {
    console.error("Validation error in getProducts:", validatedFilters.error.flatten().fieldErrors);
    return {
      success: false,
      error: "Filtres de recherche invalides.",
      errorDetails: validatedFilters.error.flatten().fieldErrors,
      products: [],
      totalProducts: 0,
    };
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const { products, totalProducts } = await searchProducts({
      ...validatedFilters.data,
      userId,
    });

    return {
      success: true,
      products: products,
      totalProducts: totalProducts,
    };
  } catch (error) {
    console.error("Error in getProducts:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return {
      success: false,
      error: errorMessage,
      products: [],
      totalProducts: 0,
    };
  }
}

export async function getFeaturedProducts(): Promise<LeanProduct[]> {
  const result = await searchProducts({ limit: 4 });
  return result.products;
}

/**
 * Server Action pour effectuer une recherche de produits.
 *
 * @param filters Les filtres de recherche.
 * @returns Une promesse qui se résout avec les résultats de la recherche.
 */
export async function searchProductsAction(
  filters: ProductSearchFilters
): Promise<ProductSearchServerResult> {
  // Valide les filtres d'entrée.
  const validatedFilters = productSearchFiltersSchema.safeParse(filters);

  if (!validatedFilters.success) {
    // console.error("Validation error in searchProductsAction:", validatedFilters.error.flatten().fieldErrors);
    return {
      success: false,
      error: "Filtres de recherche invalides.",
      errorDetails: validatedFilters.error.flatten().fieldErrors,
      products: [],
      totalProducts: 0,
    };
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Appelle le service de recherche avec les filtres validés et l'ID utilisateur.
    const { products, totalProducts } = await searchProducts({ ...validatedFilters.data, userId });

    revalidatePath("/(main)/categories", "layout");

    return {
      success: true,
      products: products,
      totalProducts: totalProducts,
    };
  } catch (error) {
    console.error("Error in searchProductsAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return {
      success: false,
      error: errorMessage,
      errorDetails: [],
      products: [],
      totalProducts: 0,
    };
  }
} 