import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ScrapedProduct, { IScrapedProduct } from '@/models/ScrapedProduct'; // Ou ProductModel si c'est le modèle principal
import OfferModel, { IOffer } from '@/models/OfferModel';
import CategoryModel from '@/models/CategoryModel';
import BrandModel from '@/models/BrandModel'; // Nécessaire si on filtre par marque
import { Types } from 'mongoose';

interface ProductWithOffers extends IScrapedProduct {
  sellerOffers: IOffer[];
  // Potentiellement d'autres champs si on merge avec ProductModel
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categorySlug');
  const brandSlugsQuery = searchParams.get('brandSlugs');
  
  try {
    await dbConnect();

    let query: any = {};

    // Filtre par catégorie
    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).lean();
      if (category) {
        // Actuellement ScrapedProduct a un champ 'category' qui est un nom.
        // Idéalement, ScrapedProduct (ou ProductModel) devrait avoir une référence categoryId.
        // Pour l'instant, on simule en cherchant par nom de catégorie, comme l'ancien endpoint.
        // CECI EST UNE LIMITATION A AMELIORER: filtrer par categoryId serait mieux.
        query.category = new RegExp(`^${category.name.replace(/[.*+?^${}()|[\\\]]/g, '\\$&')}$`, 'i');
      } else {
        // Catégorie non trouvée, retourner aucun produit pour ce filtre
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    // Filtre par marques
    // Supposons que ScrapedProduct (ou ProductModel) ait un champ `brandId` ou `brandName` ou `brandSlug`
    // Pour cette démo, on va supposer que `ScrapedProduct` n'a PAS de champ marque direct.
    // Le filtrage par marque nécessiterait une refonte majeure de la structure des données
    // ou une logique de filtrage en plusieurs étapes si les produits sont liés aux marques via les offres ou un ProductModel.
    // Pour l'instant, ce filtre ne sera pas appliqué efficacement sur ScrapedProduct.
    if (brandSlugsQuery) {
      const brandSlugs = brandSlugsQuery.split(',');
      // Si ScrapedProduct avait un champ brandSlug ou brandId:
      // const brands = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean();
      // if (brands.length > 0) {
      //   query.brandId = { $in: brands.map(b => b._id) }; // Supposant un champ brandId dans ScrapedProduct
      // } else {
      //   return NextResponse.json({ success: true, data: [] }, { status: 200 });
      // }
      console.warn("API /products: Le filtrage par marque n'est pas encore implémenté efficacement sur le modèle ScrapedProduct.");
    }

    const products = (await ScrapedProduct.find(query)
      .lean()
      .exec()) as unknown as (IScrapedProduct & { _id: string })[];

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
          scrapedProduct: product._id, // Assurez-vous que product._id est bien un ObjectId si OfferModel s'y attend
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