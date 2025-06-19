"use server";

import { LeanProduct } from "@/types/product";
import { searchProducts } from "../core/product-service";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ProductSearchFilters, ProductSearchServerResult, productSearchFiltersSchema } from "@/types/product";

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
      userId: userId || undefined,
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
    const { products, totalProducts } = await searchProducts({ ...validatedFilters.data, userId: userId || undefined });

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
      products: [],
      totalProducts: 0,
    };
  }
} 