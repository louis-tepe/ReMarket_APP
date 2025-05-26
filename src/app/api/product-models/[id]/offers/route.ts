import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductOfferModel, { IProductBase } from '@/models/ProductBaseModel';
import ProductModel from '@/models/ProductModel';
import UserModel from '@/models/User';
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

// Définition du type pour le vendeur peuplé
type PopulatedSellerType = {
  _id: Types.ObjectId;
  name?: string;
  username?: string;
};

// Définition du type pour ProductModel peuplé dans une offre
type PopulatedProductModelInOfferType = {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  standardImageUrls?: string[];
};

// Interface pour une offre avec vendeur et productModel peuplés
interface IPopulatedOffer extends Omit<IProductBase, 'seller' | 'productModel' | '_id'> {
  _id: Types.ObjectId; // Assurer que _id est bien là et est ObjectId initialement
  seller: PopulatedSellerType;
  productModel: PopulatedProductModelInOfferType;
  // createdAt et updatedAt sont déjà dans IProductBase via MongooseTimestamps
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();

    const productModelExists = await ProductModel.findById(id).lean();
    if (!productModelExists) {
      return NextResponse.json({ message: 'ProductModel non trouvé.' }, { status: 404 });
    }

    const offersFromDB = await ProductOfferModel.find({
      productModel: new Types.ObjectId(id),
      listingStatus: 'active', // Ne prendre que les offres actives
      transactionStatus: 'available' // Et disponibles
    })
    .populate({
        path: 'seller',
        select: 'name username _id', // Champs limités du vendeur
        model: UserModel 
    })
    .populate({
        path: 'productModel', 
        select: 'title slug standardImageUrls',
        model: ProductModel
    })
    .sort({ price: 1 })
    .lean() as IPopulatedOffer[]; // Utilisation de IPopulatedOffer

    if (!offersFromDB || offersFromDB.length === 0) {
      return NextResponse.json({ message: 'Aucune offre active trouvée pour ce ProductModel.', offers: [] }, { status: 200 });
    }
    
    const formattedOffers = offersFromDB.map(offer => {
        return {
            id: offer._id.toString(), // _id est déjà Types.ObjectId grâce à IPopulatedOffer
            seller: {
                id: offer.seller?._id?.toString(),
                name: offer.seller?.name || offer.seller?.username || 'Vendeur ReMarket'
            },
            price: offer.price,
            currency: offer.currency,
            quantity: offer.stockQuantity,
            condition: offer.condition,
            sellerDescription: offer.description,
            sellerPhotos: offer.images,
            productModelInfo: {
                title: offer.productModel?.title,
                slug: offer.productModel?.slug,
                mainImage: offer.productModel?.standardImageUrls?.[0]
            },
            createdAt: offer.createdAt,
            updatedAt: offer.updatedAt,
        };
    });

    return NextResponse.json({ offers: formattedOffers }, { status: 200 });

  } catch (error) {
    // console.error(`[GET /api/product-models/${id}/offers]`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la récupération des offres pour le ProductModel.', error: errorMessage }, { status: 500 });
  }
} 