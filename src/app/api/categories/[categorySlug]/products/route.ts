import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ScrapedProduct, { IScrapedProduct } from '@/models/ScrapedProduct';
import ProductOfferModel, { IProductBase } from '@/models/ProductBaseModel';
import CategoryModel, { ICategory } from '@/models/CategoryModel'; // Import de ICategory

interface ProductWithOffers extends IScrapedProduct {
  sellerOffers: IProductBase[];
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ categorySlug: string }> }
) {
  const { categorySlug } = await params;

  if (!categorySlug) {
    return NextResponse.json(
      { success: false, message: "Le slug de la catégorie est manquant." },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // 1. Récupérer la catégorie à partir du slug pour obtenir son nom
    const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).lean() as ICategory | null; // Typage explicite
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Catégorie non trouvée." },
        { status: 404 }
      );
    }
    const categoryName = category.name; // Utiliser le nom de la catégorie pour la recherche

    // 2. Récupérer les produits scrapés (officiels) pour cette catégorie en utilisant son nom
    const officialProducts = (await ScrapedProduct.find({
      // Comparer avec le champ 'category' qui stocke le nom de la catégorie (insensible à la casse)
      category: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), 
    }).lean().exec()) as unknown as (IScrapedProduct & { _id: string })[];

    if (!officialProducts.length) {
      return NextResponse.json(
        {
          success: true,
          message: "Aucun produit officiel trouvé pour cette catégorie.",
          data: [],
        },
        { status: 200 }
      );
    }

    // 3. Pour chaque produit officiel, récupérer les offres des vendeurs
    const productsWithOffers: ProductWithOffers[] = await Promise.all(
      officialProducts.map(async (officialProduct) => {
        const sellerOffers = await ProductOfferModel.find({
          productModel: officialProduct._id,
          transactionStatus: 'available',
        })
          .populate('seller', 'name email')
          .lean() as unknown as IProductBase[];
        
        // Assurer que officialProduct est bien un objet plain JS avant d'ajouter la propriété
        const plainOfficialProduct = JSON.parse(JSON.stringify(officialProduct));

        return {
          ...plainOfficialProduct,
          sellerOffers,
        };
      })
    );

    return NextResponse.json(
      { success: true, data: productsWithOffers },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API_CATEGORY_PRODUCTS_GET]", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur lors de la récupération des produits de la catégorie.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
} 