import { NextResponse } from 'next/server';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/ProductBaseModel';
import ProductModel, { IProductModel } from '@/lib/mongodb/models/ProductModel';
import dbConnect from '@/lib/mongodb/dbConnect';
import { Types } from 'mongoose';

// Interface pour les informations de modèle de produit
interface ProductModelInfo {
    id: string;
    name: string;
    imageUrl?: string;
}

// Interface pour les offres du vendeur
interface SellerOffer {
    id: string;
    productModel: ProductModelInfo;
    price: number;
    currency: string;
    condition: 'new' | 'used_likenew' | 'used_good' | 'used_fair';
    status: 'available' | 'reserved' | 'sold' | 'pending_shipment' | 'shipped' | 'delivered' | 'cancelled' | 'archived';
    sellerDescription?: string;
    sellerPhotos?: string[];
    createdAt: string;
}

// Helper function pour mapper les données du modèle aux types de l'interface SellerOffer
function mapToSellerOffer(offerDoc: IProductBase): SellerOffer {
    const productModel = offerDoc.productModel as unknown as IProductModel; // Cast après population

    // Gestion des conditions: mapper 'like-new' vers 'used_likenew'
    let clientCondition: SellerOffer['condition'];
    switch (offerDoc.condition) {
        case 'new':
            clientCondition = 'new';
            break;
        case 'like-new':
            clientCondition = 'used_likenew';
            break;
        case 'good':
            clientCondition = 'used_good';
            break;
        case 'fair':
            clientCondition = 'used_fair';
            break;
        // Le cas 'poor' n'est pas dans SellerOffer['condition'], donc on le mappe à 'used_fair' ou on le gère autrement.
        // Pour l'instant, on peut le laisser tel quel si l'UI l'ignore ou le gère.
        // Si SellerOffer['condition'] doit être strictement respecté, il faut une stratégie de mapping.
        // Ici, on va supposer que la fonction translateCondition côté client peut gérer les valeurs.
        // Ou alors, il faut que SellerOffer['condition'] soit mis à jour.
        // Pour l'instant, on va mapper 'poor' à 'used_fair' pour éviter des erreurs si le type est strict.
        case 'poor':
            clientCondition = 'used_fair'; // Ou une autre valeur par défaut/gestion d'erreur
            break;
        default:
            clientCondition = offerDoc.condition as SellerOffer['condition']; // En dernier recours, tenter un cast
    }


    const productModelInfo: ProductModelInfo = {
        id: (productModel._id as unknown as Types.ObjectId).toString(),
        name: productModel.title,
        imageUrl: productModel.standardImageUrls && productModel.standardImageUrls.length > 0 ? productModel.standardImageUrls[0] : undefined,
    };

    return {
        id: (offerDoc._id as unknown as Types.ObjectId).toString(),
        productModel: productModelInfo,
        price: offerDoc.price,
        currency: offerDoc.currency,
        condition: clientCondition,
        // Le statut 'archived' n'est pas dans IProductBase['transactionStatus'].
        // Si 'archived' est un statut valide pour l'API, il faudrait l'ajouter au modèle.
        // Sinon, l'API ne retournera jamais 'archived'.
        status: offerDoc.transactionStatus as SellerOffer['status'], // Cast direct, en supposant que les valeurs correspondent ou sont gérées côté client
        sellerDescription: offerDoc.description,
        sellerPhotos: offerDoc.images,
        createdAt: offerDoc.createdAt.toISOString(),
    };
}


export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;

    if (!userId) {
        return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    try {
        await dbConnect();

        const offers = await ProductOfferModel.find({ seller: userId })
            .populate<{ productModel: IProductModel }>({ // Typage pour la population
                path: 'productModel',
                model: ProductModel, // Nécessaire car ProductModel n'est pas directement "enregistré" via import direct dans ProductBaseModel
                select: 'title standardImageUrls _id' // Sélectionner les champs nécessaires
            })
            .sort({ createdAt: -1 });

        if (!offers || offers.length === 0) {
            return NextResponse.json([], { status: 200 }); // Retourner un tableau vide si aucune offre
        }
        
        // Mapper les résultats au format SellerOffer[]
        const formattedOffers: SellerOffer[] = offers.map(offer => mapToSellerOffer(offer as unknown as IProductBase));

        return NextResponse.json(formattedOffers, { status: 200 });

    } catch (error) {
        // Gestion plus détaillée des erreurs ici si nécessaire
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Failed to fetch offers', error: errorMessage }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/users/{userId}/offers:
 *   get:
 *     summary: Récupère les offres d'un utilisateur spécifique (vendeur).
 *     description: Permet à un utilisateur (ou à un admin) de voir toutes les offres soumises par un vendeur.
 *     tags:
 *       - Users
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID de l'utilisateur (vendeur).
 *     responses:
 *       200:
 *         description: Une liste des offres du vendeur.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SellerOffer'
 *       401:
 *         description: Non autorisé (si l'accès est restreint au propriétaire ou admin).
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 * components: # Ajout de la section components pour définir les schémas réutilisables
 *   schemas:
 *     ProductModelInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: L'ID du modèle de produit.
 *         name:
 *           type: string
 *           description: Le nom du modèle de produit.
 *         imageUrl:
 *           type: string
 *           description: L'URL de l'image du modèle de produit (optionnel).
 *           nullable: true
 *     SellerOffer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: L'ID de l'offre.
 *         productModel:
 *           $ref: '#/components/schemas/ProductModelInfo'
 *         price:
 *           type: number
 *           format: float
 *           description: Le prix de l'offre.
 *         currency:
 *           type: string
 *           description: La devise du prix (ex: EUR).
 *         condition:
 *           type: string
 *           enum: [new, used_likenew, used_good, used_fair]
 *           description: L'état de l'article dans l'offre.
 *         status:
 *           type: string
 *           enum: [available, reserved, sold, pending_shipment, shipped, delivered, cancelled, archived]
 *           description: Le statut actuel de l'offre.
 *         sellerDescription:
 *           type: string
 *           description: Description fournie par le vendeur pour cette offre spécifique (optionnel).
 *           nullable: true
 *         sellerPhotos:
 *           type: array
 *           items:
 *             type: string
 *             format: url
 *           description: URLs des photos fournies par le vendeur pour cette offre (optionnel).
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: La date de création de l'offre.
 */ 