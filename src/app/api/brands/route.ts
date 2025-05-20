import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect'; // Assurez-vous que le chemin est correct
// import ProductModel from '@/models/ProductModel'; 
import BrandModel, { IBrand } from '@/models/BrandModel';
import CategoryModel from '@/models/CategoryModel';
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

// Helper function to get all descendant category IDs (including self)
async function findAllDescendantIds(initialCategoryId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const allDescendantIds = new Set<string>();
    const queue: Types.ObjectId[] = [initialCategoryId];
    const visited = new Set<string>();

    visited.add(initialCategoryId.toString());
    allDescendantIds.add(initialCategoryId.toString());

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = await CategoryModel.find({ parent: currentId }).select('_id').lean();
        for (const child of children as { _id: Types.ObjectId }[]) {
            if (!visited.has(child._id.toString())) {
                visited.add(child._id.toString());
                allDescendantIds.add(child._id.toString());
                queue.push(child._id);
            }
        }
    }
    return Array.from(allDescendantIds).map(idStr => new Types.ObjectId(idStr));
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
      const category = await CategoryModel.findOne({ slug: categorySlug.toLowerCase() }).select('_id name').lean() as SelectedCategory | null;
      if (category) {
        console.log(`[API_BRANDS_GET] Catégorie sélectionnée: ${category.name} (Slug: ${categorySlug}) (ID: ${category._id.toString()})`);
        
        console.time("[API_BRANDS_GET] findAllDescendantIds duration");
        const allDescendantIds = await findAllDescendantIds(category._id as Types.ObjectId);
        console.timeEnd("[API_BRANDS_GET] findAllDescendantIds duration");

        if (allDescendantIds.length > 0) {
          console.time("[API_BRANDS_GET] findLeafCategories duration");
          const leafCategoriesInSubtree = await CategoryModel.find({
            _id: { $in: allDescendantIds },
            isLeafNode: true
          }).select('_id').lean();
          console.timeEnd("[API_BRANDS_GET] findLeafCategories duration");
          
          const leafCategoryIdsToFilterBy = leafCategoriesInSubtree.map(cat => cat._id as Types.ObjectId);

          if (leafCategoryIdsToFilterBy.length > 0) {
            console.log(`[API_BRANDS_GET] Filtrage des marques par ${leafCategoryIdsToFilterBy.length} catégories feuilles.`);
            brandsQuery = BrandModel.find({ categories: { $in: leafCategoryIdsToFilterBy } });
          } else {
            console.log(`[API_BRANDS_GET] Aucune catégorie FEUILLE trouvée dans la sous-arborescence de ${category.name}, retour de 0 marques.`);
            return NextResponse.json({ success: true, brands: [] }, { status: 200 });
          }
        } else {
           console.log(`[API_BRANDS_GET] Aucun descendant trouvé pour ${category.name}, retour de 0 marques.`);
           return NextResponse.json({ success: true, brands: [] }, { status: 200 });
        }
      } else {
        console.log(`[API_BRANDS_GET] Catégorie avec slug '${categorySlug}' non trouvée.`);
        return NextResponse.json({ success: true, brands: [] }, { status: 200 }); 
      }
    } else {
      console.log("[API_BRANDS_GET] Aucun categorySlug fourni, récupération de toutes les marques.");
      brandsQuery = BrandModel.find({});
    }

    console.time("[API_BRANDS_GET] BrandModel.find query duration");
    const partialBrands = await brandsQuery
      .select('_id name slug logoUrl') 
      .sort({ name: 1 })
      .lean<Pick<IBrand, '_id' | 'name' | 'slug' | 'logoUrl'>[]>();
    console.timeEnd("[API_BRANDS_GET] BrandModel.find query duration");
    
    const brands: Pick<IBrand, '_id' | 'name' | 'slug' | 'logoUrl'>[] = partialBrands;
    
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