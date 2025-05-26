import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import ProductOfferModel from '@/models/ProductBaseModel';
import CategoryModel from '@/models/CategoryModel';
import BrandModel from '@/models/BrandModel';
import User from '@/models/User'; // CORRECTION: Import du modèle User
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

interface ProductWithOffers extends Omit<LeanProductModel, 'slug'> {
  slug: string;
  sellerOffers: any[];
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

// OPTIMISATION: Cache pour les descendants de catégories
const categoryDescendantsCache = new Map<string, Types.ObjectId[]>();

// Helper function OPTIMISÉE avec MongoDB $graphLookup
async function getCategoryWithDescendants(categoryId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const startTime = Date.now();
  const cacheKey = categoryId.toString();
  
  if (categoryDescendantsCache.has(cacheKey)) {
    console.log(`[PERF] Cache hit for category descendants: ${Date.now() - startTime}ms`);
    return categoryDescendantsCache.get(cacheKey)!;
  }

  try {
    // SOLUTION OPTIMISÉE: Une seule requête MongoDB avec $graphLookup
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
    
    // Cache pour 1 heure
    categoryDescendantsCache.set(cacheKey, descendantIds);
    setTimeout(() => categoryDescendantsCache.delete(cacheKey), 3600000);
    
    console.log(`[PERF] Category descendants calculation (optimized): ${Date.now() - startTime}ms, found ${descendantIds.length} categories`);
    return descendantIds;
    
  } catch (error) {
    console.error(`[ERROR] Error in getCategoryWithDescendants:`, error);
    // Fallback: retourner seulement la catégorie courante
    return [categoryId];
  }
}

export async function GET(request: NextRequest) {
  const overallStart = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categorySlug');
  const brandSlugsQuery = searchParams.get('brandSlugs');
  const searchQuery = searchParams.get('search');
  const productModelIdsQuery = searchParams.get('productModelIds');
  
  console.log(`[PERF] API Request started for category: ${categorySlug}`);

  try {
    await dbConnect();
    const dbConnectTime = Date.now();
    console.log(`[PERF] DB Connection: ${dbConnectTime - overallStart}ms`);

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
      const categoryStart = Date.now();
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).select('_id name slug parent').lean() as LeanCategory | null;
      if (category) {
        const categoryIdsToFilter = await getCategoryWithDescendants(category._id);
        query.category = { $in: categoryIdsToFilter }; 
        console.log(`[PERF] Category lookup + descendants: ${Date.now() - categoryStart}ms`);
      } else {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    if (brandSlugsQuery && !query._id) { 
      const brandStart = Date.now();
      const brandSlugs = brandSlugsQuery.split(',');
      const brands = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean() as LeanBrand[] | null;
      if (brands && brands.length > 0) {
        query.brand = { $in: brands.map(b => b._id) }; 
        console.log(`[PERF] Brand lookup: ${Date.now() - brandStart}ms`);
      } else {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    console.log(`[PERF] Query preparation completed: ${Date.now() - overallStart}ms`);
    console.log(`[DEBUG] Final query:`, JSON.stringify(query));

    // DIAGNOSTIQUE: Essayons d'abord l'ancienne approche pour comparaison
    const oldApproachStart = Date.now();
    
    let sortOptions: { [key: string]: SortOrder | { $meta: string } } = { updatedAt: -1 }; 
    if (searchQuery) {
      sortOptions = { score: { $meta: "textScore" }, ...sortOptions }; 
    }

    // DIAGNOSTIC: Limiter temporairement les résultats pour améliorer les performances
    const limit = 50; // Limite temporaire pour diagnostique
    
    // Requête ProductModel simple d'abord
    const products = (await ProductModel.find(query, searchQuery ? { score: { $meta: "textScore" } } : {})
      .populate('brand', 'name slug')
      .populate('category', 'name slug')
      .sort(sortOptions)
      .limit(limit) // DIAGNOSTIC: Limite temporaire
      .lean()
      .exec()) as LeanProductModel[];

    console.log(`[PERF] ProductModel query: ${Date.now() - oldApproachStart}ms, found ${products.length} products`);

    if (!products.length) {
      console.log(`[PERF] Total time (no products): ${Date.now() - overallStart}ms`);
      return NextResponse.json(
        {
          success: true,
          message: "Aucun produit trouvé pour les filtres donnés.",
          data: [],
        },
        { status: 200 }
      );
    }

    // Requête des offres en parallèle
    const offersStart = Date.now();
    const productsWithOffers = await Promise.all(
      products.map(async (product) => {
        try {
          // CORRECTION: S'assurer que le modèle User est bien enregistré
          User; // Force l'enregistrement du modèle
          
          const sellerOffers = await ProductOfferModel.find({
            productModel: product._id, 
            transactionStatus: 'available',
            listingStatus: 'active'
          })
            .populate('seller', 'name username _id')
            .lean();
          
          const generatedSlug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

          return {
            ...product, 
            slug: generatedSlug, 
            sellerOffers,
          };
        } catch (error) {
          console.error(`[ERROR] Error fetching offers for product ${product._id}:`, error);
          
          // Fallback: retourner le produit sans offres populées
          const generatedSlug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
          return {
            ...product, 
            slug: generatedSlug, 
            sellerOffers: [],
          };
        }
      })
    );
    
    console.log(`[PERF] Offers lookup: ${Date.now() - offersStart}ms`);

    const finalResults = productModelIdsQuery 
        ? productsWithOffers 
        : productsWithOffers.filter(p => p.sellerOffers && p.sellerOffers.length > 0);

    console.log(`[PERF] Total API time: ${Date.now() - overallStart}ms`);
    console.log(`[PERF] Returning ${finalResults.length} products with offers`);

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
    console.error(`[ERROR] API Error after ${Date.now() - overallStart}ms:`, error);
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