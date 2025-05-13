import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db.Connect';
import SellerProduct, { ISellerProduct, SellerProductStatus } from '@/models/SellerProduct';
import ProductModel from '@/models/ProductModel';
import mongoose from 'mongoose';
import type { Session } from 'next-auth';

// Définir SessionUserWithId si ce n'est pas déjà globalement défini
// type SessionUserWithId = { id: string } & NonNullable<ReturnType<typeof getServerSession>["user"]>; // Précédente tentative

interface ExtendedSession extends Session {
  user?: Session['user'] & { id?: string | null };
}

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Crée une nouvelle offre pour un produit ReMarket.
 *     description: Permet à un vendeur connecté de créer une offre pour un ProductModel existant.
 *     tags:
 *       - Offers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productModelId # ID du ProductModel ReMarket
 *               - price
 *               - condition
 *               - sellerPhotos
 *             properties:
 *               productModelId:
 *                 type: string
 *                 description: ID du ProductModel ReMarket sur lequel l'offre est basée.
 *               price:
 *                 type: number
 *               condition:
 *                 type: string
 *                 enum: [new, used_likenew, used_good, used_fair]
 *               sellerDescription:
 *                 type: string
 *               sellerPhotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs des photos de l'article du vendeur (après upload).
 *               dynamicFields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     label:
 *                       type: string
 *                     value:
 *                       type: object # string, number, or boolean
 *                     unit:
 *                       type: string
 *     responses:
 *       201:
 *         description: Offre créée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ISellerProduct' # Référence à l'interface ISellerProduct
 *       400:
 *         description: Données d'entrée invalides ou produit modèle non trouvé/invalide.
 *       401:
 *         description: Non autorisé (utilisateur non connecté).
 *       500:
 *         description: Erreur serveur.
 * components:
 *   schemas:
 *     IDynamicField:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *         value:
 *           type: object
 *         unit:
 *           type: string
 *     ISellerProduct:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         scrapedProductId:
 *           type: string
 *         sellerId:
 *           type: string
 *         price:
 *           type: number
 *         condition:
 *           type: string
 *         quantity:
 *           type: number
 *         sellerDescription:
 *           type: string
 *         sellerImages:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export async function POST(request: NextRequest) {
  const session: ExtendedSession | null = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Non autorisé. Veuillez vous connecter.' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await request.json();
    console.log('[API /api/offers LOG] Request body received:', JSON.stringify(body, null, 2));

    await dbConnect();
    const {
      productModelId, // Doit être l'ID d'un ProductModel existant
      price,
      condition,
      sellerDescription,
      sellerPhotos, 
      // quantity, // SellerProduct attend quantity, default 1
    } = body;
    console.log('[API /api/offers LOG] productModelId from body:', productModelId);

    if (!productModelId || !mongoose.Types.ObjectId.isValid(productModelId) || price === undefined || !condition) {
      return NextResponse.json({ message: 'Champs requis manquants ou invalides: productModelId, price, condition.' }, { status: 400 });
    }

    // Vérifier que le ProductModel existe
    const existingProductModel = await ProductModel.findById(productModelId);
    if (!existingProductModel) {
      return NextResponse.json({ message: `Modèle de produit ReMarket avec ID '${productModelId}' non trouvé.` }, { status: 404 });
    }

    const quantity = body.quantity || 1;

    // Adapter le type pour SellerProductCreationData
    type SellerProductCreationData = {
      productModelId: mongoose.Types.ObjectId; // Changé de scrapedProductId
      sellerId: mongoose.Types.ObjectId;
      price: number;
      condition: string; 
      quantity: number;
      sellerDescription?: string;
      sellerImages?: string[];
      status: SellerProductStatus;
    };

    const newSellerProductData: SellerProductCreationData = {
      productModelId: new mongoose.Types.ObjectId(productModelId), // Changé ici
      sellerId: new mongoose.Types.ObjectId(userId),
      price: parseFloat(price),
      condition, 
      quantity: parseInt(quantity.toString(), 10), // s'assurer que quantity est une chaine avant parseInt
      sellerDescription: sellerDescription || undefined,
      sellerImages: sellerPhotos || [], 
      status: 'available', 
    };

    const createdSellerProduct: ISellerProduct = new SellerProduct(newSellerProductData);
    await createdSellerProduct.save();

    return NextResponse.json(createdSellerProduct, { status: 201 });

  } catch (error: unknown) {
    console.error('[POST /api/offers]', error);
    if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map(
            (err: mongoose.Error.ValidatorError | mongoose.Error.CastError) => err.message
        );
        return NextResponse.json({ message: 'Erreur de validation.', errors: messages }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la création de l\'offre.', error: errorMessage }, { status: 500 });
  }
} 