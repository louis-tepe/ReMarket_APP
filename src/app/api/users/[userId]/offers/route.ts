import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductOfferModel, { IProductBase } from '@/models/ProductBaseModel';
import ProductModel, { IProductModel } from '@/models/ProductModel'; // Assurez-vous que ProductModel est importé
import { SellerOffer, ProductModelInfo } from '@/app/(main)/dashboard/sales/page'; // Importez les types nécessaires
import { Types } from 'mongoose'; // Importer Types

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
        console.error('Failed to fetch seller offers:', error);
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
 *               items: // TODO: Définir le schéma de l'offre
 *                 type: object 
 *       401:
 *         description: Non autorisé (si l'accès est restreint au propriétaire ou admin).
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur.
 *
 */ 