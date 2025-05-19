import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db.Connect';
import ProductOfferModel from '@/models/ProductBaseModel';
import CategoryModel from '@/models/CategoryModel';
import ProductModel from '@/models/ProductModel';
import type { Session } from 'next-auth';

// Importer les modèles discriminateurs pour s'assurer qu'ils sont enregistrés auprès de Mongoose
import '@/models/discriminators/SmartphoneModel';
import '@/models/discriminators/LaptopModel';
// Ajoutez d'autres imports de discriminateurs ici au fur et à mesure de leur création

interface SessionWithId extends Session {
  user?: Session['user'] & { id?: string };
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
  try {
    await dbConnect();
    const session: SessionWithId | null = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, message: "Authentification requise." }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const {
      productModelId,
      price,
      condition,
      sellerDescription,
      images,
      kind,
      category,
      stockQuantity,
      ...specificFields
    } = body;

    if (!productModelId || price === undefined || !condition || !kind || !category) {
      return NextResponse.json({ success: false, message: "Champs obligatoires manquants (productModelId, price, condition, kind, category)." }, { status: 400 });
    }

    const categoryDoc = await CategoryModel.findById(category);
    if (!categoryDoc || !categoryDoc.isLeafNode) {
      return NextResponse.json({ success: false, message: "La catégorie spécifiée n'est pas une catégorie feuille valide." }, { status: 400 });
    }

    if (categoryDoc.slug !== kind) {
      return NextResponse.json({ success: false, message: `Incohérence entre le type de produit (kind: ${kind}) et le slug de la catégorie (${categoryDoc.slug}).` }, { status: 400 });
    }

    const productModelDoc = await ProductModel.findById(productModelId);
    if (!productModelDoc) {
      return NextResponse.json({ success: false, message: "La fiche produit ReMarket spécifiée n'existe pas." }, { status: 400 });
    }

    const OfferModelForKind = ProductOfferModel.discriminators?.[kind];

    if (!OfferModelForKind) {
      return NextResponse.json({ success: false, message: `Aucun modèle d'offre spécifique trouvé pour le type: ${kind}. Assurez-vous que le discriminateur est enregistré.` }, { status: 400 });
    }

    const offerData = {
      productModel: productModelId,
      category: category,
      seller: userId,
      price: parseFloat(price),
      condition,
      description: sellerDescription,
      images: images || [],
      stockQuantity: stockQuantity !== undefined ? parseInt(String(stockQuantity), 10) : 1,
      listingStatus: 'pending_approval',
      kind,
      ...specificFields,
    };

    const newOffer = new OfferModelForKind(offerData);
    await newOffer.save();

    return NextResponse.json({ success: true, message: "Offre créée avec succès!", offer: newOffer }, { status: 201 });

  } catch (error) {
    console.error("Erreur API (POST /api/offers):", error);
    const typedError = error as Error & { errors?: Record<string, { message: string }> };
    const errorMessage = typedError.message || "Erreur inconnue du serveur.";

    if (typedError.name === 'ValidationError' && typedError.errors) {
      const validationMessages = Object.values(typedError.errors).map(err => err.message).join(', ');
      return NextResponse.json({ success: false, message: `Erreur de validation: ${validationMessages}`, errors: typedError.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// TODO: Ajouter une méthode GET pour lister les offres si nécessaire (par exemple, pour un utilisateur)
// export async function GET(request: Request) { ... } 