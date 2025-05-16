import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db.Connect';
import OfferModel, { IOffer } from '@/models/OfferModel';
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
 *               - quantity
 *             properties:
 *               productModelId:
 *                 type: string
 *                 description: ID du ProductModel ReMarket sur lequel l'offre est basée.
 *               price:
 *                 type: number
 *               condition:
 *                 type: string
 *                 enum: [new, used_likenew, used_good, used_fair]
 *               quantity:
 *                 type: number
 *                 default: 1
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
 *               $ref: '#/components/schemas/IOffer' # Modifié
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
 *     IOffer: # Modifié
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         productModel:
 *           type: string
 *         seller:
 *           type: string
 *         price:
 *           type: number
 *         currency:
 *           type: string
 *         quantity:
 *           type: number
 *         condition:
 *           type: string
 *         sellerDescription:
 *           type: string
 *         sellerPhotos:
 *           type: array
 *           items:
 *             type: string
 *         dynamicFields: 
 *           type: array
 *           items: 
 *             $ref: '#/components/schemas/IDynamicField'
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
      productModelId, 
      price,
      condition,
      quantity = 1, // Ajout de la quantité avec valeur par défaut
      sellerDescription,
      sellerPhotos, 
      dynamicFields,
      currency = 'EUR', // Ajout currency avec valeur par défaut
    } = body;
    console.log('[API /api/offers LOG] productModelId from body:', productModelId);

    if (!productModelId || !mongoose.Types.ObjectId.isValid(productModelId) || price === undefined || !condition /* || !sellerPhotos || sellerPhotos.length === 0 */) {
      return NextResponse.json({ message: 'Champs requis manquants ou invalides: productModelId, price, condition.' }, { status: 400 });
    }

    // Vérifier que le ProductModel existe
    const existingProductModel = await ProductModel.findById(productModelId);
    if (!existingProductModel) {
      return NextResponse.json({ message: `Modèle de produit ReMarket avec ID '${productModelId}' non trouvé.` }, { status: 404 });
    }

    // Pas besoin de SellerProductCreationData, on peut typer directement pour IOffer ou laisser Mongoose inferer
    const newOfferData = {
      productModel: new mongoose.Types.ObjectId(productModelId),
      seller: new mongoose.Types.ObjectId(userId),
      price: parseFloat(price),
      condition,
      quantity: parseInt(quantity.toString(), 10),
      sellerDescription: sellerDescription || undefined,
      sellerPhotos: Array.isArray(sellerPhotos) ? sellerPhotos : [], 
      dynamicFields: Array.isArray(dynamicFields) ? dynamicFields : [],
      status: 'available', // Statut par défaut pour une nouvelle offre
      currency: currency,
    };

    const createdOffer: IOffer = new OfferModel(newOfferData);
    await createdOffer.save();

    return NextResponse.json(createdOffer, { status: 201 });

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