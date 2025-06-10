import { NextRequest, NextResponse } from 'next/server';
import CategoryModel, { ICategory } from '@/lib/mongodb/models/CategoryModel';
import dbConnect from '@/lib/mongodb/dbConnect';
import { FilterQuery } from 'mongoose';

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Récupère la liste des catégories de produits.
 *     description: Retourne une liste de toutes les catégories de produits disponibles ou filtre par profondeur si le paramètre `depth` est fourni.
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filtre les catégories par leur profondeur dans la hiérarchie.
 *     responses:
 *       200:
 *         description: Une liste de catégories.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category' # Référence au schéma ICategory
 *       500:
 *         description: Erreur serveur.
 */

// Il serait bon d'avoir une définition de schéma pour Swagger partagée, par exemple dans les types
/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         depth:
 *           type: integer
 *         isLeafNode:
 *           type: boolean
 *         parent:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         # formFieldDefinitions: array (omitted for brevity)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const depthParam = searchParams.get('depth');

  try {
    await dbConnect();

    const query: FilterQuery<ICategory> = {};

    if (depthParam !== null) {
      const depth = parseInt(depthParam, 10);
      if (!isNaN(depth)) {
        query.depth = depth;
      } else {
        return NextResponse.json(
          { success: false, message: "Le paramètre 'depth' doit être un nombre." }, 
          { status: 400 }
        );
      }
    }

    // Sélectionner tous les champs pertinents utilisés par le client ou d'autres parties du système.
    const categories = await CategoryModel.find(query)
      .select('_id name slug depth isLeafNode parent description iconKey createdAt updatedAt') 
      .sort({ name: 1 })
      .lean<ICategory[]>(); 

    return NextResponse.json({ success: true, categories }, { status: 200 });
  } catch (error) {
    // console.error("[API_CATEGORIES_GET] Erreur serveur:", error); // Log optionnel pour débogage serveur
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la récupération des catégories.", error: errorMessage }, 
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; 