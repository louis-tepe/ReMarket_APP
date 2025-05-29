import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import ProductOfferModel from '@/models/ProductBaseModel';
import CategoryModel from '@/models/CategoryModel';
import BrandModel from '@/models/BrandModel';
import { FilterQuery, SortOrder, Types } from 'mongoose';

// Type pour l'objet ProductModel après .lean()
interface LeanProductModel {
  _id: Types.ObjectId | string;
  title: string;
  brand: Types.ObjectId;
  category: Types.ObjectId;
  standardDescription: string;
  standardImageUrls: string[];
  keyFeatures?: string[];
  isFeatured?: boolean;
  specifications: { label: string; value: string; unit?: string }[];
  slug?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  score?: number;
}

// Type pour l'objet Category après .lean()
interface LeanCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parent?: Types.ObjectId | string | null;
  children?: LeanCategory[];
}

// Type pour l'objet Brand après .lean()
interface LeanBrand {
  _id: Types.ObjectId;
}

// Interface pour les offres avec vendeur populé
interface LeanSellerOffer {
  _id: Types.ObjectId;
  price: number;
  seller: {
    _id: Types.ObjectId;
    name?: string;
    username?: string;
  };
  [key: string]: unknown;
}

// OPTIMISATION: Cache pour les descendants de catégories
const categoryDescendantsCache = new Map<string, Types.ObjectId[]>();

// Helper function OPTIMISÉE avec MongoDB $graphLookup
async function getCategoryWithDescendants(categoryId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const cacheKey = categoryId.toString();
  
  if (categoryDescendantsCache.has(cacheKey)) {
    return categoryDescendantsCache.get(cacheKey)!;
  }

  try {
    const pipeline = [
      { $match: { _id: categoryId } },
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parent',
          as: 'descendants'
        }
      },
      {
        $project: {
          allIds: {
            $concatArrays: [
              ['$_id'],
              '$descendants._id'
            ]
          }
        }
      }
    ];

    const result = await CategoryModel.aggregate(pipeline).exec();
    const descendantIds = result[0]?.allIds || [categoryId];
    
    categoryDescendantsCache.set(cacheKey, descendantIds);
    setTimeout(() => categoryDescendantsCache.delete(cacheKey), 3600000); // Cache pour 1 heure
    
    return descendantIds;
    
  } catch (error) {
    // Log d'erreur plus spécifique
    console.error(`[API_PRODUCTS_ERROR] Erreur dans getCategoryWithDescendants pour ID ${categoryId}:`, error);
    return [categoryId]; // Fallback
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categorySlug');
  const brandSlugsQuery = searchParams.get('brandSlugs');
  const searchQuery = searchParams.get('search');
  const productModelIdsQuery = searchParams.get('productModelIds');
  
  try {
    await dbConnect();

    const query: FilterQuery<IProductModel> = {};

    if (productModelIdsQuery) {
      const modelIds = productModelIdsQuery.split(',').filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
      if (modelIds.length > 0) {
        query._id = { $in: modelIds };
      }
    }

    if (searchQuery) {
      query.$text = { $search: searchQuery };
    }

    if (categorySlug && !query._id) { 
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).select('_id name slug parent').lean() as LeanCategory | null;
      if (category) {
        const categoryIdsToFilter = await getCategoryWithDescendants(category._id);
        query.category = { $in: categoryIdsToFilter }; 
      } else {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    if (brandSlugsQuery && !query._id) { 
      const brandSlugs = brandSlugsQuery.split(',');
      const brands = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean() as LeanBrand[] | null;
      if (brands && brands.length > 0) {
        query.brand = { $in: brands.map(b => b._id) }; 
      } else {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    let sortOptions: { [key: string]: SortOrder | { $meta: string } } = { updatedAt: -1 }; 
    if (searchQuery) {
      sortOptions = { score: { $meta: "textScore" }, ...sortOptions }; 
    }
    
    const products = (await ProductModel.find(query, searchQuery ? { score: { $meta: "textScore" } } : {})
      .populate('brand', 'name slug')
      .populate('category', 'name slug')
      .sort(sortOptions)
      // La limite a été supprimée. Si une pagination est nécessaire, elle peut être ajoutée via les paramètres de requête.
      .lean()
      .exec()) as unknown as LeanProductModel[];

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

    const productsWithOffers = await Promise.all(
      products.map(async (product) => {
        try {
          // Pas besoin de forcer l'enregistrement du modèle User ici
          
          const sellerOffers = await ProductOfferModel.find({
            productModel: product._id, 
            transactionStatus: 'available',
            listingStatus: 'active'
          })
            .populate('seller', 'name username _id')
            .lean<LeanSellerOffer[]>();
          
          const generatedSlug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

          return {
            ...product, 
            slug: generatedSlug, 
            sellerOffers,
          };
        } catch (error) {
          // Log d'erreur plus spécifique
          console.error(`[API_PRODUCTS_ERROR] Erreur lors de la récupération des offres pour le produit ${product._id}:`, error);
          
          const generatedSlug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
          return {
            ...product, 
            slug: generatedSlug, 
            sellerOffers: [] as LeanSellerOffer[],
          };
        }
      })
    );
    
    const finalResults = productModelIdsQuery 
        ? productsWithOffers 
        : productsWithOffers.filter(p => p.sellerOffers && p.sellerOffers.length > 0);

    return NextResponse.json(
      { success: true, data: finalResults }, 
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );
  } catch (error) {
    // Log d'erreur général pour la route
    console.error(`[API_PRODUCTS_ERROR] Erreur API GET:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
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