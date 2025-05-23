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

interface ProductWithOffers extends Omit<LeanProductModel, 'slug'> {
  slug: string; // Slug est maintenant garanti présent
  sellerOffers: IOffer[];
}

// Type pour l'objet Category après .lean()
interface LeanCategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parent?: Types.ObjectId | string | null; // Ajout pour la récursivité
  children?: LeanCategory[]; // Ajout pour la récursivité
}

// Type pour l'objet Brand après .lean()
interface LeanBrand {
  _id: Types.ObjectId;
}

// Helper function to get all descendant category IDs
async function getCategoryWithDescendants(categoryId: Types.ObjectId): Promise<Types.ObjectId[]> {
  const descendantIds: Types.ObjectId[] = [categoryId];
  
  async function findChildren(parentId: Types.ObjectId) {
    const children = (await CategoryModel.find({ parent: parentId }).select('_id').lean()) as { _id: Types.ObjectId }[]; // Cast plus précis
    for (const child of children) {
      descendantIds.push(child._id);
      await findChildren(child._id);
    }
  }

  await findChildren(categoryId);
  return descendantIds;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categorySlug');
  const brandSlugsQuery = searchParams.get('brandSlugs');
  const searchQuery = searchParams.get('search');
  const productModelIdsQuery = searchParams.get('productModelIds'); 
  
  // console.log('[API_PRODUCTS_GET] Received request with params:', { categorySlug, brandSlugsQuery, searchQuery, productModelIdsQuery });

  try {
    await dbConnect();

    const query: FilterQuery<IProductModel> = { /* status: 'active' */ }; // Supposant que ProductModel a un champ status. À confirmer.
    // Si ProductModel n'a pas de champ 'status', cette ligne doit être ajustée ou supprimée.
    // Pour l'instant, je la commente car elle n'est pas utilisée et IProductModel ne le définit pas par défaut.

    if (productModelIdsQuery) {
      const modelIds = productModelIdsQuery.split(',').filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
      if (modelIds.length > 0) {
        query._id = { $in: modelIds };
      }
    }

    if (searchQuery) {
      query.$text = { $search: searchQuery };
      // console.log('[API_PRODUCTS_GET] Applied text search to query:', searchQuery);
    }

    if (categorySlug && !query._id) { 
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).select('_id name slug parent').lean() as LeanCategory | null;
      if (category) {
        const categoryIdsToFilter = await getCategoryWithDescendants(category._id);
        query.category = { $in: categoryIdsToFilter }; 
        // console.log(`[API_PRODUCTS_GET] Applied category filter (including descendants) to query. Category ID: ${category._id}, Found ${categoryIdsToFilter.length} total category IDs (including descendants).`);
      } else {
        // console.log('[API_PRODUCTS_GET] Category slug not found, returning empty for category filter:', categorySlug);
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    if (brandSlugsQuery && !query._id) { 
      const brandSlugs = brandSlugsQuery.split(',');
      const brands = await BrandModel.find({ slug: { $in: brandSlugs } }).select('_id').lean() as LeanBrand[] | null;
      if (brands && brands.length > 0) {
        query.brand = { $in: brands.map(b => b._id) }; 
        // console.log('[API_PRODUCTS_GET] Applied brand filter to query. Brand IDs:', brands.map(b => b._id));
      } else {
        // console.log('[API_PRODUCTS_GET] Brand slugs not found, returning empty for brand filter:', brandSlugsQuery);
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }
    }

    // console.log('[API_PRODUCTS_GET] Final ProductModel query:', JSON.stringify(query));

    let sortOptions: { [key: string]: SortOrder | { $meta: string } } = { updatedAt: -1 }; 
    if (searchQuery) {
      sortOptions = { score: { $meta: "textScore" }, ...sortOptions }; 
    }

    const products = (await ProductModel.find(query, searchQuery ? { score: { $meta: "textScore" } } : {})
      .populate('brand', 'name slug') // Peupler la marque
      .populate('category', 'name slug') // Peupler la catégorie
      .sort(sortOptions)
      .lean()
      .exec()) as LeanProductModel[]; 

    // console.log(`[API_PRODUCTS_GET] Found ${products.length} ProductModels matching query.`);

    if (!products.length) {
      // console.log('[API_PRODUCTS_GET] No ProductModels found, returning empty data.');
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
        // console.log(`[API_PRODUCTS_GET] Processing ProductModel ID: ${product._id}, Title: ${product.title}`);
        const sellerOffers = await ProductOfferModel.find({
          productModel: product._id, 
          transactionStatus: 'available',
          listingStatus: 'active' // Ajout explicite du filtre listingStatus pour les offres
        })
          .populate('seller', 'name username _id') // Modifié pour inclure _id et username
          .lean() as IOffer[]; // IOffer est déjà défini comme IProductBase, qui est correct
        
        // console.log(`[API_PRODUCTS_GET] Found ${sellerOffers.length} active/available offers for ProductModel ID: ${product._id}`);
        
        const generatedSlug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        return {
          ...product, 
          slug: generatedSlug, 
          sellerOffers,
        };
      })
    );
    
    // const finalProductCount = productsWithOffers.filter(p => p.sellerOffers && p.sellerOffers.length > 0).length;
    // console.log(`[API_PRODUCTS_GET] Returning ${productsWithOffers.length} products, of which ${finalProductCount} have active/available offers.`);

    const finalResults = productModelIdsQuery 
        ? productsWithOffers 
        : productsWithOffers.filter(p => p.sellerOffers && p.sellerOffers.length > 0);

    return NextResponse.json(
      { success: true, data: finalResults }, 
      { status: 200 }
    );
  } catch (error) {
    // console.error("[API_PRODUCTS_GET]", error);
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