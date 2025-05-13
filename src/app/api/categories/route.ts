import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect'; // Correction du chemin d'importation
import CategoryModel, { ICategory } from '@/models/CategoryModel';

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Récupère la liste des catégories de produits depuis la base de données.
 *     description: Retourne une liste de toutes les catégories de produits disponibles sur ReMarket.
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: Une liste de catégories.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string # Correspond au slug de la catégorie
 *                   name:
 *                     type: string
 *       500:
 *         description: Erreur serveur.
 */
export async function GET() {
  try {
    await dbConnect();

    const categories: ICategory[] = await CategoryModel.find({})
      .sort({ name: 1 })
      .lean() as unknown as ICategory[]; // Cast pour correspondre au type ICategory[]

    return NextResponse.json({ success: true, categories }, { status: 200 });
  } catch (error) {
    console.error("[API_CATEGORIES_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la récupération des catégories", error: errorMessage }, 
      { status: 500 }
    );
  }
} 