import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { fetchFeaturedProductData } from "@/services/core/product-service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const productsWithPrice = await fetchFeaturedProductData(userId || undefined);
    return NextResponse.json({ success: true, products: productsWithPrice }, { status: 200 });
  } catch (error) {
    // console.error("[API_PRODUCTS_FEATURED_GET]", error); // Log optionnel
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la récupération des produits vedettes.", error: errorMessage },
      { status: 500 }
    );
  }
} 