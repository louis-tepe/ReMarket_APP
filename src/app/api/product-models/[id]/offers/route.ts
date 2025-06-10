import { NextRequest, NextResponse } from 'next/server';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/ProductBaseModel';
import ProductModel from '@/lib/mongodb/models/ProductModel';
import UserModel from '@/lib/mongodb/models/User';
import dbConnect from '@/lib/mongodb/dbConnect';
import { Types } from 'mongoose';

/**
 * @swagger
 * /api/product-models/{id}/offers:
 *   get:
 *     summary: Récupère toutes les offres actives pour un ProductModel spécifique.
 *     description: Retourne une liste d'offres associées à un ProductModel ReMarket, utile pour voir toutes les options de vente pour un produit standardisé.
 *     tags:
 *       - ProductModels
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID MongoDB du ProductModel.
 *     responses:
 *       200:
 *         description: Une liste d'offres pour le ProductModel.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IOffer' # S'assurer que IOffer est défini
 *       400:
 *         description: ID du ProductModel invalide.
 *       404:
 *         description: ProductModel non trouvé.
 *       500:
 *         description: Erreur serveur.
 */

// Interface pour un vendeur populé de manière concise
interface PopulatedSellerInfo {
  id: string;
  name: string;
}

// Interface pour une offre formatée pour la réponse client
interface FormattedOffer {
  id: string;
  seller: PopulatedSellerInfo;
  price: number;
  currency: string;
  stockQuantity?: number; // Optionnel, car stockQuantity sur IProductBase est optionnel
  condition: IProductBase['condition'];
  description?: string; // Optionnel, car description sur IProductBase est optionnel
  images?: string[]; // Optionnel
  // Pas besoin de productModelInfo ici car toutes les offres sont pour le même ProductModel (défini par la route)
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET(
  request: NextRequest, // request n'est pas utilisé, mais conservé pour la signature
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productModelId } = await params;

  if (!productModelId || !Types.ObjectId.isValid(productModelId)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();

    // Vérifier d'abord si le ProductModel existe pour éviter des requêtes inutiles
    const productModelExists = await ProductModel.findById(productModelId).select('_id').lean();
    if (!productModelExists) {
      return NextResponse.json({ message: 'ProductModel non trouvé.' }, { status: 404 });
    }

    const offersFromDB = await ProductOfferModel.find({
      productModel: new Types.ObjectId(productModelId),
      listingStatus: 'active',
      transactionStatus: 'available'
    })
    .populate<{ seller: { _id: Types.ObjectId; name?: string; username?: string } }>(
      { path: 'seller', select: 'name username _id', model: UserModel }
    )
    // Pas besoin de populer productModel ici, on l'a déjà via productModelId
    .sort({ price: 1 })
    .lean<IProductBase[]>(); // IProductBase est suffisant ici, seller sera du type du populate

    if (!offersFromDB || offersFromDB.length === 0) {
      return NextResponse.json({ message: 'Aucune offre active trouvée pour ce ProductModel.', offers: [] }, { status: 200 });
    }
    
    const formattedOffers: FormattedOffer[] = offersFromDB.map(offer => {
        const sellerInfo = offer.seller as unknown as { _id: Types.ObjectId; name?: string; username?: string }; // Cast pour le populate
        return {
            id: (offer._id as Types.ObjectId).toString(), 
            seller: {
                id: sellerInfo?._id?.toString() || '',
                name: sellerInfo?.name || sellerInfo?.username || 'Vendeur ReMarket'
            },
            price: offer.price,
            currency: offer.currency,
            stockQuantity: offer.stockQuantity,
            condition: offer.condition,
            description: offer.description,
            images: offer.images,
            createdAt: offer.createdAt,
            updatedAt: offer.updatedAt,
        };
    });

    return NextResponse.json({ offers: formattedOffers }, { status: 200 });

  } catch (error) {
    // console.error(`[GET /api/product-models/${productModelId}/offers] Erreur:`, error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la récupération des offres.', errorDetails: errorMessage }, { status: 500 });
  }
} 