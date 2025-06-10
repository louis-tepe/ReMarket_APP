import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb/dbConnect';
// import ProductModel from '@/models/ProductModel'; 
import BrandModel, { IBrand } from '@/lib/mongodb/models/BrandModel';
import CategoryModel from '@/lib/mongodb/models/CategoryModel';
import { Types, Query, HydratedDocument } from 'mongoose';
// import mongoose from 'mongoose';

interface SelectedCategory {
    _id: Types.ObjectId;
    name: string;
}

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Récupère la liste de toutes les marques.
 *     description: Retourne une liste de toutes les marques disponibles.
 *     tags:
 *       - Brands
 *     responses:
 *       200:
 *         description: Une liste de marques.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Brand'
 *       500:
 *         description: Erreur serveur.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Brand:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         logoUrl:
 *           type: string
 *           nullable: true
 *         categories:
 *           type: array
 *           items:
 *             type: string # Références aux IDs des catégories
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Helper function OPTIMISÉE to get all descendant category IDs (including self) avec $graphLookup
async function findAllDescendantIds(initialCategoryId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const pipeline = [
        { $match: { _id: initialCategoryId } },
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
    // Retourne les IDs trouvés, ou un tableau avec l'ID initial si rien n'est trouvé (par sécurité)
    return result[0]?.allIds || [initialCategoryId]; 
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get('categorySlug');

  // Typer explicitement brandsQuery
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  let brandsQuery: Query<(HydratedDocument<IBrand>)[], HydratedDocument<IBrand>, {}, IBrand, 'find'>;

  try {
    await dbConnect();

    if (categorySlug) {
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() })
        .select('_id name').lean<SelectedCategory | null>();

      if (category) {
        const allDescendantIds = await findAllDescendantIds(category._id);

        if (allDescendantIds.length > 0) {
          const leafCategoriesInSubtree = await CategoryModel.find({
            _id: { $in: allDescendantIds },
            isLeafNode: true
          }).select('_id').lean();
          
          const leafCategoryIdsToFilterBy = leafCategoriesInSubtree.map(cat => cat._id as Types.ObjectId);

          if (leafCategoryIdsToFilterBy.length > 0) {
            brandsQuery = BrandModel.find({ categories: { $in: leafCategoryIdsToFilterBy } });
          } else {
            return NextResponse.json({ success: true, brands: [] }, { status: 200 });
          }
        } else {
           return NextResponse.json({ success: true, brands: [] }, { status: 200 });
        }
      } else {
        return NextResponse.json({ success: true, brands: [] }, { status: 200 }); 
      }
    } else {
      brandsQuery = BrandModel.find({});
    }

    const brands = await brandsQuery
      .select('_id name slug logoUrl') 
      .sort({ name: 1 })
      .lean<Pick<IBrand, '_id' | 'name' | 'slug' | 'logoUrl'>[]>();
    
    return NextResponse.json({ success: true, brands }, { status: 200 });
  } catch (error) {
    console.error("[API_BRANDS_GET] Erreur: ", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la récupération des marques", error: errorMessage }, 
      { status: 500 }
    );
  }
} 