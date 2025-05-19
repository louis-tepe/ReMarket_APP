import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import OfferModel, { IOffer } from '@/models/OfferModel';
import CategoryModel from '@/models/CategoryModel';
import BrandModel from '@/models/BrandModel'; // Nécessaire si on filtre par marque
import { Types } from 'mongoose';

interface ProductWithOffers extends IProductModel {
  sellerOffers: IOffer[];
  // Potentiellement d'autres champs si on merge avec ProductModel
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categorySlug');
  const brandSlugsQuery = searchParams.get('brandSlugs');
  const searchQuery = searchParams.get('search');
  
  try {
    await dbConnect();

    let query: any = {};

    // Recherche textuelle
    if (searchQuery) {
      query.$text = { $search: searchQuery };
    }

    // Filtre par catégorie
    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).lean();
      if (category) {
        query.category = category._id; // Filtrer par ObjectId de la catégorie
      } else {
        // Catégorie non trouvée, retourner aucun produit pour ce filtre
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    // Filtre par marques
    if (brandSlugsQuery) {
      const brandSlugs = brandSlugsQuery.split(',');
      const brands = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean();
      if (brands.length > 0) {
        query.brand = { $in: brands.map(b => b._id) }; // Filtrer par ObjectId de la marque
      } else {
        // Marques non trouvées, retourner aucun produit pour ce filtre
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    // Ajout d'un score de pertinence pour la recherche textuelle si searchQuery est utilisé
    let sortOptions: any = {};
    if (searchQuery) {
      sortOptions = { score: { $meta: "textScore" } };
    }

    const products = (await ProductModel.find(query, searchQuery ? { score: { $meta: "textScore" } } : {})
      .sort(sortOptions) // Trier par pertinence si recherche textuelle
      .lean()
      .exec()) as (IProductModel & { _id: string; score?: number })[];

    if (!products.length) {
      return NextResponse.json(
        {
          success: true,
          message: "Aucun produit trouvé pour les filtres donnés.",
          data: [],
        },
        { status: 200 }
      );
    }

    const productsWithOffers: ProductWithOffers[] = await Promise.all(
      products.map(async (product) => {
        const sellerOffers = await OfferModel.find({
          productModel: product._id, // Assurez-vous que OfferModel référence productModel via productModelId (ou un nom similaire)
          status: 'available',
        })
          .populate('seller', 'name email')
          .lean() as unknown as IOffer[];
        
        const plainProduct = JSON.parse(JSON.stringify(product));

        return {
          ...plainProduct,
          sellerOffers,
        };
      })
    );

    return NextResponse.json(
      { success: true, data: productsWithOffers },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API_PRODUCTS_GET]", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: "Erreur serveur lors de la récupération des produits.",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
} 