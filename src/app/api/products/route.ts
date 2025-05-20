import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import ProductOfferModel, { IProductBase as IOffer } from '@/models/ProductBaseModel';
import CategoryModel from '@/models/CategoryModel';
import BrandModel from '@/models/BrandModel'; // Nécessaire si on filtre par marque
import { FilterQuery, SortOrder, Types } from 'mongoose';

// Type pour l'objet ProductModel après .lean()
// Basé sur IProductModel mais sans étendre Document et avec _id comme string ou Types.ObjectId
interface LeanProductModel {
  _id: Types.ObjectId | string;
  title: string;
  brand: Types.ObjectId; // Ou un type plus spécifique si populé et lean
  category: Types.ObjectId; // Ou un type plus spécifique si populé et lean
  standardDescription: string;
  standardImageUrls: string[];
  keyFeatures?: string[];
  isFeatured?: boolean;
  specifications: { label: string; value: string; unit?: string }[];
  slug?: string;
  createdAt: Date | string; // Date peut devenir string après JSON.stringify ou lean
  updatedAt: Date | string;
  score?: number; // Ajouté pour le score de recherche textuelle
  // N'inclut pas les méthodes Mongoose Document
}

interface ProductWithOffers extends LeanProductModel { // Modifié pour utiliser LeanProductModel
  sellerOffers: IOffer[]; 
}

// Type pour l'objet Category après .lean()
interface LeanCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

// Type pour l'objet Brand après .lean()
interface LeanBrand {
  _id: Types.ObjectId;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categorySlug');
  const brandSlugsQuery = searchParams.get('brandSlugs');
  const searchQuery = searchParams.get('search');
  
  console.log('[API_PRODUCTS_GET] Received request with params:', { categorySlug, brandSlugsQuery, searchQuery });

  try {
    await dbConnect();

    const query: FilterQuery<IProductModel> = {}; // Le FilterQuery peut toujours se baser sur IProductModel pour la structure de requête

    // Recherche textuelle
    if (searchQuery) {
      query.$text = { $search: searchQuery };
      console.log('[API_PRODUCTS_GET] Applied text search to query:', searchQuery);
    }

    // Filtre par catégorie
    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).lean() as LeanCategory | null;
      if (category) {
        query.category = category._id; 
        console.log('[API_PRODUCTS_GET] Applied category filter to query. Category ID:', category._id);
      } else {
        console.log('[API_PRODUCTS_GET] Category slug not found, returning empty for category filter:', categorySlug);
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    // Filtre par marques
    if (brandSlugsQuery) {
      const brandSlugs = brandSlugsQuery.split(',');
      const brands = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean() as LeanBrand[] | null;
      if (brands && brands.length > 0) {
        query.brand = { $in: brands.map(b => b._id) }; 
        console.log('[API_PRODUCTS_GET] Applied brand filter to query. Brand IDs:', brands.map(b => b._id));
      } else {
        console.log('[API_PRODUCTS_GET] Brand slugs not found, returning empty for brand filter:', brandSlugsQuery);
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    console.log('[API_PRODUCTS_GET] Final ProductModel query:', JSON.stringify(query));

    let sortOptions: { [key: string]: SortOrder | { $meta: string } } = {};
    if (searchQuery) {
      sortOptions = { score: { $meta: "textScore" } };
    }

    const products = (await ProductModel.find(query, searchQuery ? { score: { $meta: "textScore" } } : {})
      .sort(sortOptions)
      .lean()
      .exec()) as unknown as LeanProductModel[]; // Modifié pour utiliser LeanProductModel[]

    console.log(`[API_PRODUCTS_GET] Found ${products.length} ProductModels matching query.`);

    if (!products.length) {
      console.log('[API_PRODUCTS_GET] No ProductModels found, returning empty data.');
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
        console.log(`[API_PRODUCTS_GET] Processing ProductModel ID: ${product._id}, Title: ${product.title}`);
        const sellerOffers = await ProductOfferModel.find({
          productModel: product._id, 
          transactionStatus: 'available'
        })
          .populate('seller', 'name email')
          .lean() as unknown as IOffer[];
        
        console.log(`[API_PRODUCTS_GET] Found ${sellerOffers.length} active/available offers for ProductModel ID: ${product._id}`);
        
        // product est déjà un objet "lean", donc JSON.parse(JSON.stringify(product)) n'est pas strictement nécessaire
        // sauf si product.brand ou product.category étaient des ObjectId non stringifiés par .lean() dans certains cas (ce qui ne devrait pas arriver ici)
        return {
          ...product, // product est déjà un LeanProductModel
          sellerOffers,
        };
      })
    );
    
    const finalProductCount = productsWithOffers.filter(p => p.sellerOffers && p.sellerOffers.length > 0).length;
    console.log(`[API_PRODUCTS_GET] Returning ${productsWithOffers.length} products, of which ${finalProductCount} have active/available offers.`);

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