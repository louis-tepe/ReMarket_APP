import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db.Connect';
import ProductOfferModel, { IProductBase } from '@/models/ProductBaseModel';
import ProductModel from '@/models/ProductModel'; // Pour populer productModel
import UserModel from '@/models/User'; // Pour populer seller
import { Types } from 'mongoose';

/**
 * @swagger
 * /api/offers/{id}:
 *   put:
 *     summary: Met à jour une offre existante.
 *     description: Permet à un vendeur de mettre à jour les détails de son offre (si elle n'est pas vendue).
 *     tags:
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: offerid
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID de l'offre à mettre à jour.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               condition:
 *                 type: string
 *               sellerDescription:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               dynamicFields:
 *                 type: object
 *     responses:
 *       200:
 *         description: Offre mise à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IOffer'
 *       400:
 *         description: Données d'entrée invalides.
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Interdit (ex: l'utilisateur n'est pas le propriétaire de l'offre, ou l'offre est déjà vendue).
 *       404:
 *         description: Offre non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
export async function PUT(
  request: Request,
  { params }: { params: { offerid: string } }
) {
  const { offerid } = params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await request.json();
    await dbConnect();

    const offer = await ProductOfferModel.findById(offerid);
    if (!offer) {
      return NextResponse.json({ message: 'Offre non trouvée.' }, { status: 404 });
    }

    if (offer.seller.toString() !== userId) { 
      return NextResponse.json({ message: 'Interdit de modifier cette offre.' }, { status: 403 });
    }
    if (offer.transactionStatus === 'sold' || offer.transactionStatus === 'shipped' || offer.transactionStatus === 'archived') { 
      return NextResponse.json({ message: 'Cette offre ne peut plus être modifiée car elle est vendue, expédiée ou archivée.' }, { status: 403 });
    }

    const { productModel, seller, listingStatus, transactionStatus, kind, ...updateData } = body;
    const updatedOffer = await ProductOfferModel.findByIdAndUpdate(offerid, { $set: updateData }, { new: true, runValidators: true });

    return NextResponse.json(updatedOffer, { status: 200 });
  } catch (error) {
    console.error(`[PUT /api/offers/${offerid}]`, error);
    const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "Erreur inconnue lors de la mise à jour de l'offre.");
    if (error instanceof Error && (error.name === 'ValidationError' || error.name === 'CastError')) {
        return NextResponse.json({ message: 'Erreur de validation des données ou ID invalide.', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Erreur lors de la mise à jour de l'offre.", error: errorMessage }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/offers/{id}:
 *   get:
 *     summary: Récupère les détails d'une offre spécifique.
 *     description: Retourne les informations complètes d'une offre par son ID, y compris les détails du produit et du vendeur.
 *     tags:
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: offerid
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID MongoDB de l'offre.
 *     responses:
 *       200:
 *         description: Détails de l'offre.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IOffer'
 *       404:
 *         description: Offre non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
export async function GET(
  request: Request,
  { params }: { params: { offerid: string } }
) {
  const { offerid } = params;

  if (!offerid || !Types.ObjectId.isValid(offerid)) {
    return NextResponse.json({ message: 'ID de l'offre invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();

    const offer = await ProductOfferModel.findById(offerid)
      .populate({
        path: 'productModel',
        model: ProductModel,
        select: 'title slug standardImageUrls brand category',
        populate: [
            { path: 'brand', select: 'name slug' },
            { path: 'category', select: 'name slug' }
        ]
      })
      .populate({
        path: 'seller',
        model: UserModel,
        select: 'name username _id'
      })
      .lean() as IProductBase | null;

    if (!offer) {
      return NextResponse.json({ message: 'Offre non trouvée.' }, { status: 404 });
    }

    return NextResponse.json(offer, { status: 200 });

  } catch (error) {
    console.error(`[GET /api/offers/${offerid}]`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la récupération de l'offre.', error: errorMessage }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/offers/{id}:
 *   delete:
 *     summary: Supprime une offre.
 *     description: Permet à un vendeur de supprimer son offre (si elle n'est pas vendue/expédiée) ou à un admin de la supprimer.
 *     tags:
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: offerid
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID MongoDB de l'offre à supprimer.
 *     responses:
 *       200:
 *         description: Offre supprimée avec succès.
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Interdit (ex: l'utilisateur n'est pas le propriétaire ou l'offre ne peut être supprimée).
 *       404:
 *         description: Offre non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { offerid: string } }
) {
  const { offerid } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!offerid || !Types.ObjectId.isValid(offerid)) {
    return NextResponse.json({ message: 'ID de l'offre invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const offer = await ProductOfferModel.findById(offerid);

    if (!offer) {
      return NextResponse.json({ message: 'Offre non trouvée.' }, { status: 404 });
    }

    if (offer.seller.toString() !== userId) {
      return NextResponse.json({ message: 'Action non autorisée. Vous n\'êtes pas le propriétaire de cette offre.' }, { status: 403 });
    }

    if (offer.transactionStatus === 'sold' || offer.transactionStatus === 'shipped') {
      return NextResponse.json({ message: 'Impossible de supprimer une offre vendue ou expédiée.' }, { status: 403 });
    }

    const archivedOffer = await ProductOfferModel.findByIdAndUpdate(
        offerid,
        { $set: { listingStatus: 'archived', transactionStatus: 'archived' } }, 
        { new: true }
    );

    if (!archivedOffer) {
        return NextResponse.json({ message: 'Offre non trouvée lors de la tentative d\'archivage.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Offre archivée avec succès.', offerId: offerid }, { status: 200 });

  } catch (error) {
    console.error(`[DELETE /api/offers/${offerid}]`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la suppression/archivage de l'offre.', error: errorMessage }, { status: 500 });
  }
}