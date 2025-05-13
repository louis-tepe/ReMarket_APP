import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import mongoose from 'mongoose';

// L'interface RouteContext n'est plus nécessaire si on destructure directement { params }
// interface RouteContext {
//   params: {
//     id: string; // L'_id du ProductModel
//   }
// }

/**
 * @swagger
 * /api/product-models/{id}:
 *   get:
 *     summary: Récupère les détails complets d'un ProductModel ReMarket spécifique.
 *     description: Retourne toutes les informations d'un ProductModel standardisé par son ID.
 *     tags:
 *       - ProductModels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID MongoDB du ProductModel.
 *     responses:
 *       200:
 *         description: Détails du ProductModel.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IProductModel' # Référence au schéma IProductModel complet
 *       400:
 *         description: ID invalide fourni.
 *       404:
 *         description: ProductModel non trouvé.
 *       500:
 *         description: Erreur serveur.
 * components:
 *  schemas:
 *    IStandardSpecification: # Ajouté pour la complétude du schéma IProductModel
 *      type: object
 *      properties:
 *        label:
 *          type: string
 *        value:
 *          type: string
 *        unit:
 *          type: string
 *    IProductModel:
 *      type: object
 *      properties:
 *        _id:
 *          type: string
 *        title:
 *          type: string
 *        brand:
 *          type: string
 *        category:
 *          type: string
 *        standardDescription:
 *          type: string
 *        standardImageUrls:
 *          type: array
 *          items:
 *            type: string
 *        keyFeatures:
 *          type: array
 *          items:
 *            type: string
 *        specifications:
 *          type: array
 *          items:
 *            $ref: '#/components/schemas/IStandardSpecification'
 *        createdAt:
 *          type: string
 *          format: date-time
 *        updatedAt:
 *          type: string
 *          format: date-time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();

    // Recherche uniquement le ProductModel
    const product = await ProductModel.findById(id).lean() as IProductModel | null;

    if (!product) {
      // Si on ne trouve pas de ProductModel, on retourne 404.
      // On ne cherche plus de ScrapedProduct ici car la page de vente s'attend à un ProductModel.
      return NextResponse.json({ message: 'ProductModel non trouvé.' }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error) {
    console.error(`[GET /api/product-models/${id}]`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la récupération du produit.', error: errorMessage }, { status: 500 });
  }
} 