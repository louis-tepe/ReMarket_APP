import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from "next-auth";
import { authOptions } from '@/lib/authOptions';
import { Types } from 'mongoose';
import dbConnect from '@/lib/mongodb/dbConnect';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/SellerProduct';
import CategoryModel, { ICategory } from '@/lib/mongodb/models/CategoryModel';
import ProductModel from '@/lib/mongodb/models/ScrapingProduct';
import User from '@/lib/mongodb/models/User';
import { ImagePart } from '@/services/ai/geminiService';
import { analyzeImageCondition } from '@/services/ai/productAnalysisService';
import { OfferCreationSchema } from '@/lib/validators/offer';
import { ZodError } from 'zod';
import mongoose from 'mongoose';

// Importer les modèles discriminateurs pour s'assurer qu'ils sont enregistrés auprès de Mongoose
import '@/lib/mongodb/models/discriminators/CasesCoversModel';
import '@/lib/mongodb/models/discriminators/ChargersCablesModel';
import '@/lib/mongodb/models/discriminators/CpuModel';
import '@/lib/mongodb/models/discriminators/DesktopComputerModel';
import '@/lib/mongodb/models/discriminators/FeaturePhoneModel';
import '@/lib/mongodb/models/discriminators/FitnessTrackerModel';
import '@/lib/mongodb/models/discriminators/GameConsoleModel';
import '@/lib/mongodb/models/discriminators/GpuModel';
import '@/lib/mongodb/models/discriminators/KeyboardModel';
import '@/lib/mongodb/models/discriminators/LaptopModel';
import '@/lib/mongodb/models/discriminators/MonitorModel';
import '@/lib/mongodb/models/discriminators/MotherboardModel';
import '@/lib/mongodb/models/discriminators/PcCaseModel';
import '@/lib/mongodb/models/discriminators/PowerBanksModel';
import '@/lib/mongodb/models/discriminators/PsuModel';
import '@/lib/mongodb/models/discriminators/RamModel';
import '@/lib/mongodb/models/discriminators/ScreenProtectorsModel';
import '@/lib/mongodb/models/discriminators/SmartphoneModel';
import '@/lib/mongodb/models/discriminators/SmartwatchModel';
import '@/lib/mongodb/models/discriminators/StorageModel';
import '@/lib/mongodb/models/discriminators/TabletModel';

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ success: false, message: 'Non autorisé' }), { status: 401 });
    }

    await dbConnect();

    const body = await req.json();

    // 1. Valider le corps de la requête
    try {
        OfferCreationSchema.parse(body);
    } catch (error) {
        if (error instanceof ZodError) {
            return new Response(JSON.stringify({ success: false, message: 'Validation des données échouée', errors: error.errors }), { status: 400 });
        }
    }

    const { kind, images: uploadedImageUrls, productModelId } = body;

    // Récupérer le ProductModel pour obtenir sa catégorie
    const productModelDoc = await ProductModel.findById(productModelId);
    if (!productModelDoc) {
      return new Response(JSON.stringify({ success: false, message: 'Modèle de produit ReMarket non trouvé.' }), { status: 404 });
    }

    // Récupérer le prompt d'analyse pour la catégorie
    const categoryDoc = await CategoryModel.findOne({ slug: kind }).select('imageAnalysisPrompt').lean();
    if (!categoryDoc || !('imageAnalysisPrompt' in categoryDoc) || !categoryDoc.imageAnalysisPrompt) {
      return new Response(JSON.stringify({ success: false, message: 'Catégorie non trouvée ou sans prompt pour analyse.' }), { status: 400 });
    }

    // 3. Analyser chaque image et stocker les résultats
    const analyzedImages: { url: string; visualConditionScore: number | null; visualConditionRawResponse: string }[] = [];
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    if (uploadedImageUrls && uploadedImageUrls.length > 0) {
      for (const imageUrl of uploadedImageUrls) {
        try {
          const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, baseUrl).toString();
          const response = await fetch(absoluteImageUrl);
          if (!response.ok) {
            console.warn(`Impossible de récupérer l'image depuis l'URL: ${absoluteImageUrl}. Statut: ${response.status}`);
            analyzedImages.push({ url: imageUrl, visualConditionScore: null, visualConditionRawResponse: `Failed to fetch image: ${response.statusText}` });
            continue;
          }

          let mimeType: "image/jpeg" | "image/png" | "image/webp" = 'image/jpeg';
          const contentType = response.headers.get('content-type');
          if (contentType === 'image/png' || imageUrl.endsWith('.png')) mimeType = 'image/png';
          else if (contentType === 'image/webp' || imageUrl.endsWith('.webp')) mimeType = 'image/webp';
          
          const imageBuffer = await response.arrayBuffer();
          const imageBase64 = Buffer.from(imageBuffer).toString('base64');
          
          const imagePartForAnalysis: ImagePart = {
            mimeType: mimeType,
            data: imageBase64,
          };

          const analysisResult = await analyzeImageCondition(
            imagePartForAnalysis,
            categoryDoc.imageAnalysisPrompt,
            productModelDoc.product.title,
            { modelName: 'gemini-2.5-pro' }
          );

          // Vérification #1: L'analyse a-t-elle échoué (réponse vide/invalide) ?
          if (analysisResult.score === null) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: `L'analyse par l'IA de l'image a échoué. Veuillez réessayer. Si le problème persiste, l'image pourrait être refusée par le service d'analyse.`,
                errorType: "AI_ANALYSIS_FAILED",
                culprit: imageUrl
            }), { status: 500 });
          }

          // Vérification #2: L'image ne correspond-elle pas au produit ?
          if (analysisResult.score === -1) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: `L'image ne semble pas correspondre au produit. Veuillez fournir une photo de l'article que vous vendez.`,
                errorType: "IMAGE_MISMATCH",
                culprit: imageUrl
            }), { status: 400 });
          }
          
          analyzedImages.push({
            url: imageUrl,
            visualConditionScore: analysisResult.score,
            visualConditionRawResponse: analysisResult.rawResponse
          });

        } catch (error) {
            console.error(`Erreur lors de l'analyse de l'image ${imageUrl}:`, error);
            throw new Error(`L'analyse d'une des images a échoué. ${error instanceof Error ? error.message : ''}`);
        }
      }
    }

    // 4. Préparer les données de l'offre pour la création
    const offerData: Partial<IProductBase> = {
      ...body,
      seller: new Types.ObjectId(session.user.id),
      productModel: body.productModelId,
      category: productModelDoc.category as Types.ObjectId,
      images: analyzedImages,
    };

    // Assurer la cohérence des statuts
    offerData.listingStatus = 'active';
    offerData.transactionStatus = 'available';

    // 5. Créer l'offre avec les attributs spécifiques à la catégorie (discriminator)
    const newOffer = await ProductOfferModel.create(offerData);
    
    return NextResponse.json({ success: true, offer: newOffer }, { status: 201 });

  } catch (error) {
    console.error('[API_OFFERS_POST]', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return new Response(JSON.stringify({ success: false, message: errorMessage }), { status: 500 });
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

    const offers = await ProductOfferModel.find(queryParams).lean();

    return NextResponse.json({ success: true, data: offers }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur inconnue.";
    return NextResponse.json({ success: false, message: "Erreur lors de la récupération des offres.", errorDetails: errorMessage }, { status: 500 });
  }
} 