import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/db.Connect';
import ProductOfferModel, { IProductBase } from '@/models/ProductBaseModel';
import ProductModel from '@/models/ProductModel';
import UserModel from '@/models/User';
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

// Champs autorisés pour la mise à jour d'une offre
const ALLOWED_OFFER_UPDATE_FIELDS = ['price', 'condition', 'description', 'images', 'stockQuantity', 'specificFields']; // 'specificFields' pour les champs dynamiques

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ offerid: string }> }
) {
  const { offerid } = await params;
  if (!offerid || !Types.ObjectId.isValid(offerid)) {
    return NextResponse.json({ message: "ID d'offre invalide ou manquant." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
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
      return NextResponse.json({ message: 'Action non autorisée sur cette offre.' }, { status: 403 });
    }
    if (offer.transactionStatus === 'sold' || offer.transactionStatus === 'shipped' || offer.listingStatus === 'rejected') { 
      return NextResponse.json({ message: 'Cette offre ne peut plus être modifiée.' }, { status: 403 });
    }

    // Filtrer le corps de la requête pour ne garder que les champs modifiables
    const updateData: Partial<IProductBase> & Record<string, unknown> = {};
    for (const key in body) {
        if (ALLOWED_OFFER_UPDATE_FIELDS.includes(key) || offer.schema.pathType(key) === 'real') { // Accepter aussi les champs du discriminateur
            // Attention: specificFields doit être traité correctement si c'est un objet imbriqué
            if (key === 'specificFields' && typeof body[key] === 'object') {
                 Object.assign(updateData, body[key]); // Écraser les champs spécifiques directement à la racine
            } else {
                updateData[key] = body[key];
            }
        }
    }
    // S'assurer que les champs non modifiables ne sont pas passés
    delete updateData.productModel;
    delete updateData.seller;
    delete updateData.listingStatus;
    delete updateData.transactionStatus;
    delete updateData.kind;
    delete updateData.category;

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: "Aucune donnée valide à mettre à jour." }, { status: 400 });
    }

    const updatedOffer = await ProductOfferModel.findByIdAndUpdate(offerid, { $set: updateData }, { new: true, runValidators: true });

    return NextResponse.json(updatedOffer, { status: 200 });
  } catch (error) {
    // console.error(`[PUT /api/offers/${offerid}]`, error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue.";
    if (error instanceof Error && (error.name === 'ValidationError' || error.name === 'CastError')) {
        return NextResponse.json({ message: 'Données invalides.', errorDetails: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ message: "Erreur serveur lors de la mise à jour.", errorDetails: errorMessage }, { status: 500 });
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
  request: NextRequest,
  { params }: { params: Promise<{ offerid: string }> }
) {
  const { offerid } = await params;
  if (!offerid || !Types.ObjectId.isValid(offerid)) {
    return NextResponse.json({ message: "ID d'offre invalide ou manquant." }, { status: 400 });
  }

  try {
    await dbConnect();
    const offer = await ProductOfferModel.findById(offerid)
      .populate([
          { 
            path: 'productModel', model: ProductModel, select: 'title slug standardImageUrls brand category',
            populate: [{ path: 'brand', select: 'name slug' }, { path: 'category', select: 'name slug'}]
          },
          { path: 'seller', model: UserModel, select: 'name username _id' }
      ])
      .lean<IProductBase | null>();

    if (!offer) {
      return NextResponse.json({ message: 'Offre non trouvée.' }, { status: 404 });
    }
    return NextResponse.json(offer, { status: 200 });
  } catch (error) {
    // console.error(`[GET /api/offers/${offerid}]`, error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: "Erreur serveur lors de la récupération.", errorDetails: errorMessage }, { status: 500 });
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
  request: NextRequest,
  { params }: { params: Promise<{ offerid: string }> }
) {
  const { offerid } = await params;
  if (!offerid || !Types.ObjectId.isValid(offerid)) {
    return NextResponse.json({ message: "ID d'offre invalide ou manquant." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    await dbConnect();
    const offer = await ProductOfferModel.findById(offerid);

    if (!offer) {
      return NextResponse.json({ message: 'Offre non trouvée.' }, { status: 404 });
    }
    if (offer.seller.toString() !== userId) {
      return NextResponse.json({ message: "Action non autorisée sur cette offre." }, { status: 403 });
    }
    if (offer.listingStatus === 'inactive') {
      return NextResponse.json({ message: 'L\'offre est déjà désactivée.' }, { status: 400 });
    }
    if (offer.transactionStatus === 'sold' || offer.transactionStatus === 'shipped') {
      return NextResponse.json({ message: 'Impossible de désactiver une offre vendue ou expédiée.' }, { status: 403 });
    }

    const deactivatedOffer = await ProductOfferModel.findByIdAndUpdate(
        offerid,
        { $set: { listingStatus: 'inactive', transactionStatus: 'cancelled' } }, 
        { new: true }
    );

    if (!deactivatedOffer) {
        // Ce cas ne devrait pas arriver si l'offre a été trouvée initialement
        return NextResponse.json({ message: "Erreur lors de la désactivation de l'offre." }, { status: 500 });
    }

    return NextResponse.json({ message: 'Offre désactivée avec succès.', offerId: offerid }, { status: 200 });

  } catch (error) {
    // console.error(`[DELETE /api/offers/${offerid}]`, error); // Log serveur optionnel
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: "Erreur serveur lors de la désactivation.", errorDetails: errorMessage }, { status: 500 });
  }
}