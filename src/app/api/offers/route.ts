import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db.Connect';
import ProductOfferModel, { IProductBase } from '@/models/ProductBaseModel';
import CategoryModel, { ICategory } from '@/models/CategoryModel';
import ProductModel from '@/models/ProductModel';
import type { Session } from 'next-auth';
import User from '@/models/User';
import { analyzeImageCondition, ImagePart } from '@/services/geminiService';
import { ProductCategorySpecificModel } from '@/models/discriminators';
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

interface OfferCreationBody extends Omit<Partial<IProductBase>, 'seller' | 'category' | 'productModel' | 'images' | 'visualConditionScore' | 'visualConditionRawResponse'> {
  productModelId: string;
  categoryId: string; // ID de la catégorie feuille
  images: string[]; // URLs des images déjà téléversées
  price: number;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  description: string;
  stockQuantity?: number;
  // Plus les champs spécifiques à la catégorie (kind) qui sont dynamiques
  [key: string]: any; // Pour les champs dynamiques
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const session: Session | null = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ success: false, message: "Authentification requise." }, { status: 401 });
    }
    const userId = session.user.id;
    console.log(`[POST /api/offers] Attempting to find seller with userId: ${userId}`);
    const seller = await User.findById(userId);
    if (!seller) {
      console.error(`[POST /api/offers] Seller not found for userId: ${userId}`);
      return NextResponse.json({ success: false, message: "Vendeur non trouvé." }, { status: 404 });
    }

    const body: OfferCreationBody = await request.json();
    console.log("[POST /api/offers] Body reçu:", JSON.stringify(body, null, 2));

    const {
      productModelId,
      category: categoryId,
      images,
      price,
      condition,
      description,
      stockQuantity = 1,
      kind,
      ...specificFields
    } = body;

    if (!productModelId || !categoryId || !images || images.length === 0 || !price || !condition || !description || !kind) {
      let missingFields = [];
      if (!productModelId) missingFields.push("productModelId");
      if (!categoryId) missingFields.push("categoryId");
      if (!images || images.length === 0) missingFields.push("images");
      if (price === undefined || price === null) missingFields.push("price");
      if (!condition) missingFields.push("condition");
      if (!description) missingFields.push("description");
      if (!kind) missingFields.push("kind");

      if (missingFields.length > 0) {
        return NextResponse.json({ success: false, message: `Champs requis manquants pour créer l'offre: ${missingFields.join(', ')}.` }, { status: 400 });
      }
    }

    const categoryDoc = await CategoryModel.findById(categoryId).lean() as ICategory | null;
    if (!categoryDoc || !categoryDoc.isLeafNode) {
      return NextResponse.json({ success: false, message: "Catégorie feuille valide non trouvée ou non spécifiée." }, { status: 400 });
    }

    if (categoryDoc.slug !== kind) {
      return NextResponse.json({ success: false, message: `Incohérence entre le type de produit (kind: ${kind}) et le slug de la catégorie (${categoryDoc.slug}).` }, { status: 400 });
    }

    const productModelDoc = await ProductModel.findById(productModelId);
    if (!productModelDoc) {
      return NextResponse.json({ success: false, message: "Modèle de produit ReMarket non trouvé." }, { status: 404 });
    }

    let visualConditionScore: number | null = null;
    let visualConditionRawResponse: string | undefined = undefined;

    // Analyse de l'image principale si le prompt est défini pour la catégorie
    if (categoryDoc.imageAnalysisPrompt && images.length > 0) {
      const mainImageRelativeUrl = images[0]; // Analyser la première image
      console.log(`[POST /api/offers] Analyse de l'image: ${mainImageRelativeUrl} avec le prompt: "${categoryDoc.imageAnalysisPrompt}"`);
      
      // Pour utiliser analyzeImageCondition, nous avons besoin de l'image en base64.
      // Ici, nous avons une URL. Il faudrait soit :
      // 1. Modifier analyzeImageCondition pour accepter une URL (et faire le fetch + conversion base64 dedans)
      // 2. Faire le fetch de l'image ici et la convertir en base64 avant d'appeler analyzeImageCondition.
      // Option 2 est plus simple à intégrer pour l'instant si analyzeImageCondition attend une ImagePart.
      // Ou, si les images sont accessibles publiquement, le prompt peut inclure l'URL directement
      // et Gemini peut potentiellement la charger. Pour l'instant, supposons que analyzeImageCondition
      // s'attend à une ImagePart (base64).
      // Pour cette implémentation, je vais simuler que l'analyse retourne un score pour ne pas bloquer
      // car la conversion URL -> Base64 côté serveur ajoute de la complexité ici.
      // Dans une vraie implémentation, il faudrait faire le fetch de `mainImageRelativeUrl`.
      
      // SIMULATION (remplacer par un vrai appel avec conversion URL -> base64 si nécessaire)
      // visualConditionScore = Math.floor(Math.random() * 5); // Nombre aléatoire 0-4
      // visualConditionRawResponse = `Simulation: Score ${visualConditionScore} pour ${mainImageRelativeUrl}`;
      // console.log(`[POST /api/offers] Résultat SIMULÉ de l'analyse:`, { visualConditionScore, visualConditionRawResponse });

      // Pour un vrai appel, il faudrait quelque chose comme ça (après avoir récupéré l'image en base64):
      try {
        // Étape 1: Construire l'URL absolue et récupérer l'image depuis l'URL
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
        const mainImageUrl = `${protocol}://${host}${mainImageRelativeUrl}`;
        
        console.log(`[POST /api/offers] Fetching image from absolute URL: ${mainImageUrl}`);
        const imageResponse = await fetch(mainImageUrl);
        if (!imageResponse.ok) {
            console.warn(`Impossible de récupérer l'image ${mainImageUrl} pour l'analyse.`);
        } else {
            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'; // default ou essayer de déduire
            
            const imagePartForAnalysis: ImagePart = { 
                data: imageBase64, 
                // Assurer que le mimeType est l'un de ceux attendus par ImagePart
                mimeType: mimeType.startsWith('image/') ? mimeType as ImagePart['mimeType'] : 'image/jpeg' 
            }; 

            const analysisResult = await analyzeImageCondition(imagePartForAnalysis, categoryDoc.imageAnalysisPrompt);
            if (analysisResult) {
              visualConditionScore = analysisResult.score;
              visualConditionRawResponse = analysisResult.rawResponse;
              console.log(`[POST /api/offers] Résultat de l'analyse Gemini:`, { visualConditionScore, visualConditionRawResponse });
            }
        }
      } catch (analysisError) {
        console.error("[POST /api/offers] Erreur lors de l'analyse de l'image par Gemini:", analysisError);
        // Ne pas bloquer la création de l'offre si l'analyse échoue, mais logguer.
        visualConditionRawResponse = `Erreur analyse Gemini: ${analysisError instanceof Error ? analysisError.message : 'Inconnue'}`;
      }
    }

    const newOfferData: Partial<IProductBase> & { category: Types.ObjectId, productModel: Types.ObjectId, seller: Types.ObjectId, kind: string } = {
      productModel: productModelDoc._id,
      seller: seller._id,
      category: productModelDoc.category,
      kind: categoryDoc.slug,
      price: price,
      currency: body.currency || 'EUR',
      condition: condition,
      description: description,
      images: images,
      stockQuantity: stockQuantity,
      listingStatus: 'active',
      transactionStatus: 'available',
      ...specificFields,
      ...(visualConditionScore !== null && { visualConditionScore }),
      ...(visualConditionRawResponse && { visualConditionRawResponse }),
    };

    // Utiliser le modèle discriminateur spécifique basé sur `kind`
    const DiscriminatorModel = ProductCategorySpecificModel(newOfferData.kind);
    const newOffer = new DiscriminatorModel(newOfferData);
    
    await newOffer.save();

    return NextResponse.json({ success: true, message: "Offre créée avec succès.", data: newOffer }, { status: 201 });

  } catch (error: any) {
    console.error("Erreur lors de la création de l'offre:", error);
    let errorMessage = "Erreur serveur inconnue lors de la création de l'offre.";
    if (error.name === 'ValidationError') {
        errorMessage = Object.values(error.errors).map((val: any) => val.message).join(', ');
        return NextResponse.json({ success: false, message: errorMessage, errors: error.errors }, { status: 400 });
    }
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

// TODO: Ajouter une méthode GET pour lister les offres si nécessaire (par exemple, pour un utilisateur)
// export async function GET(request: Request) { ... } 