import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from "next-auth";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/ProductBaseModel';
import CategoryModel, { ICategory } from '@/lib/mongodb/models/CategoryModel';
import ProductModel from '@/lib/mongodb/models/ProductModel';
import User from '@/lib/mongodb/models/User';
import { analyzeImageCondition, ImagePart } from '@/services/ai/geminiService';
import { getProductOfferDiscriminator } from '@/lib/mongodb/models/discriminators';
import { Types } from 'mongoose';

// Importer les modèles discriminateurs pour s'assurer qu'ils sont enregistrés auprès de Mongoose
// Commenté car discriminators.ts devrait gérer l'enregistrement via ses imports.
// import '@/models/discriminators/SmartphoneModel';
// import '@/models/discriminators/LaptopModel';
// Ajoutez d'autres imports de discriminateurs ici au fur et à mesure de leur création

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

interface OfferCreationBody {
  productModelId: string;
  categoryId: string; // ID de la catégorie feuille (slug technique)
  images: string[];
  price: number;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  description: string;
  kind: string; // Slug de la catégorie, utilisé comme discriminateur 'kind'
  currency?: string;
  stockQuantity?: number;
  [key: string]: unknown; // Pour les champs dynamiques spécifiques à la catégorie
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const session: Session | null = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentification requise." }, { status: 401 });
    }
    const userId = session.user.id;
    const seller = await User.findById(userId).lean(); // .lean() pour performance
    if (!seller) {
      return NextResponse.json({ success: false, message: "Vendeur non trouvé." }, { status: 404 });
    }

    const body: OfferCreationBody = await request.json();
    const { productModelId, categoryId, images, price, condition, description, kind, stockQuantity = 1, ...specificFields } = body;

    const requiredFields: (keyof Omit<OfferCreationBody, 'currency' | 'stockQuantity' | 'specificFields'>)[] = 
        ['productModelId', 'categoryId', 'images', 'price', 'condition', 'description', 'kind'];
    const missingFields = requiredFields.filter(field => 
        field === 'images' ? (!body[field] || body[field].length === 0) : !body[field]
    );

    if (missingFields.length > 0) {
      return NextResponse.json({ success: false, message: `Champs requis manquants: ${missingFields.join(', ')}.` }, { status: 400 });
    }

    const categoryDoc = await CategoryModel.findById(categoryId).lean<ICategory | null>();
    if (!categoryDoc || !categoryDoc.isLeafNode || categoryDoc.slug !== kind) {
      return NextResponse.json({ success: false, message: "Catégorie feuille invalide, non correspondante ou non spécifiée." }, { status: 400 });
    }

    const productModelDoc = await ProductModel.findById(productModelId).lean(); // .lean() pour performance
    if (!productModelDoc) {
      return NextResponse.json({ success: false, message: "Modèle de produit ReMarket non trouvé." }, { status: 404 });
    }

    let visualConditionScore: number | null = null;
    let visualConditionRawResponse: string | undefined = undefined;

    if (categoryDoc.imageAnalysisPrompt && images.length > 0) {
      try {
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        const mainImageUrl = `${protocol}://${host}${images[0]}`;
        
        const imageResponse = await fetch(mainImageUrl);
        if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            const mimeType = imageResponse.headers.get('content-type');
            
            if (mimeType && mimeType.startsWith('image/')){
                const imagePartForAnalysis: ImagePart = { 
                    data: imageBase64, 
                    mimeType: mimeType as ImagePart['mimeType'] 
                }; 
                const analysisResult = await analyzeImageCondition(imagePartForAnalysis, categoryDoc.imageAnalysisPrompt);
                visualConditionScore = analysisResult?.score ?? null;
                visualConditionRawResponse = analysisResult?.rawResponse;
            } else {
                visualConditionRawResponse = "Type MIME de l'image invalide pour l'analyse.";
            }
        } else {
            visualConditionRawResponse = `Impossible de récupérer l'image ${mainImageUrl} (statut: ${imageResponse.status}).`;
        }
      } catch (analysisError) {
        console.warn("[API_OFFERS_POST] Erreur analyse Gemini (non bloquant):", analysisError); // Log non critique
        visualConditionRawResponse = `Erreur analyse Gemini: ${analysisError instanceof Error ? analysisError.message : 'Erreur inconnue'}`;
      }
    }

    const newOfferData: Partial<IProductBase> & { category: Types.ObjectId, productModel: Types.ObjectId, seller: Types.ObjectId, kind: string } = {
      productModel: productModelDoc._id as Types.ObjectId,
      seller: seller._id as Types.ObjectId,
      category: productModelDoc.category as Types.ObjectId, // Utiliser la catégorie du ProductModel
      kind: categoryDoc.slug, // kind est le slug de la catégorie feuille
      price,
      currency: body.currency || 'EUR',
      condition,
      description,
      images,
      stockQuantity,
      listingStatus: 'active',
      transactionStatus: 'available',
      ...specificFields,
      ...(visualConditionScore !== null && { visualConditionScore }),
      ...(visualConditionRawResponse && { visualConditionRawResponse }),
    };

    const DiscriminatorModel = getProductOfferDiscriminator(newOfferData.kind);
    const newOffer = new DiscriminatorModel(newOfferData);
    await newOffer.save();

    return NextResponse.json({ success: true, message: "Offre créée avec succès.", data: newOffer.toObject() }, { status: 201 });

  } catch (error: unknown) {
    // console.error("[API_OFFERS_POST] Erreur création offre:", error); // Log serveur optionnel
    if (error instanceof Error && error.name === 'ValidationError') {
        interface ValidationError {
            errors: Record<string, { message: string }>;
        }
        const validationError = error as unknown as ValidationError;
        const messages = Object.values(validationError.errors).map((val) => val.message).join(', ');
        return NextResponse.json({ success: false, message: `Erreur de validation: ${messages}`, errors: validationError.errors }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue.";
    return NextResponse.json({ success: false, message: "Erreur lors de la création de l'offre.", errorDetails: errorMessage }, { status: 500 });
  }
}

// TODO: Ajouter une méthode GET pour lister les offres si nécessaire (par exemple, pour un utilisateur)
// export async function GET(request: Request) { ... } 

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    // const session = await getServerSession(authOptions); // Décommenter si authentification nécessaire pour lister

    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {}; // Construire les filtres dynamiquement
    // Exemple: if (searchParams.get('sellerId')) queryParams.seller = searchParams.get('sellerId');
    // queryParams.listingStatus = 'active'; // Filtrer par défaut ?

    // Utiliser les paramètres de recherche
    if (searchParams.get('sellerId')) {
        queryParams.seller = searchParams.get('sellerId');
    }

    const offers = await ProductOfferModel.find(queryParams)
      // .populate('productModel', 'title slug') // Ajuster populate au besoin
      // .populate('seller', 'name username')
      .sort({ createdAt: -1 })
      // .limit(10) // Ajouter pagination si nécessaire
      .lean();

    return NextResponse.json({ success: true, data: offers }, { status: 200 });

  } catch (error: unknown) {
    // console.error("[API_OFFERS_GET] Erreur listage offres:", error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ success: false, message: "Erreur serveur lors de la récupération des offres.", errorDetails: errorMessage }, { status: 500 });
  }
} 