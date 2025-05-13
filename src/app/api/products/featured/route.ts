import { NextResponse } from "next/server";
import { fetchFeaturedProductData } from "@/lib/product-service";

export async function GET() {
  try {
    const productsWithPrice = await fetchFeaturedProductData();
    return NextResponse.json({ success: true, products: productsWithPrice }, { status: 200 });
  } catch (error) {
    console.error("[API_PRODUCTS_FEATURED_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la récupération des produits vedettes", error: errorMessage },
      { status: 500 }
    );
  }
} 