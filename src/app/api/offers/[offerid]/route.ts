import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb/dbConnect';
import ProductOfferModel, { IProductBase } from '@/lib/mongodb/models/SellerProduct';
import ProductModel from '@/lib/mongodb/models/ScrapingProduct';
import UserModel from '@/lib/mongodb/models/User';
import { Types } from 'mongoose';
import { z } from 'zod';

const UpdateOfferSchema = z.object({
  price: z.number().positive("Le prix doit être positif.").optional(),
  condition: z.enum(['new', 'used_likenew', 'used_good', 'used_fair']).optional(),
  description: z.string().max(2000, "La description ne peut excéder 2000 caractères.").optional(),
  images: z.array(z.string().url("URL d'image invalide.")).optional(),
  stockQuantity: z.number().int("La quantité doit être un nombre entier.").min(0).optional(),
  // Accepte un objet plat de champs supplémentaires pour les discriminateurs
  specificFields: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
}).strict(); // N'autorise que les champs définis ci-dessus

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

// Champs autorisés pour la mise à jour d'une offre (Obsolète, validation via Zod)
// const ALLOWED_OFFER_UPDATE_FIELDS = ['price', 'condition', 'description', 'images', 'stockQuantity', 'specificFields'];

// Type pour une offre avec les champs populés
type PopulatedOffer = IProductBase & {
  _id: Types.ObjectId;
  seller: { _id: Types.ObjectId; name: string; };
  productModel: { 
    _id: Types.ObjectId; 
    title: string; 
    slug: string; 
    brand: { _id: Types.ObjectId; name: string; slug: string; };
    category: { _id: Types.ObjectId; name: string; slug: string; };
  };
};

// Fonction pour transformer l'objet de l'offre en un objet sûr pour le client
const toSafeOfferDTO = (offer: PopulatedOffer | null) => {
  if (!offer) return null;

  // Le 'offer' est un objet lean, déjà un POJO.
  // On copie toutes ses propriétés pour créer un DTO propre.
  const { _id, seller, productModel, ...restOfOffer } = offer;

  const dto: Record<string, unknown> = {
    id: _id.toString(),
    ...restOfOffer
  };

  if (seller) {
    dto.seller = {
      id: seller._id.toString(),
      name: seller.name,
    };
  }

  if (productModel) {
    dto.productModel = {
      id: productModel._id.toString(),
      title: productModel.title,
      slug: productModel.slug,
      brand: productModel.brand,
      category: productModel.category,
    };
  }
  
  return dto;
};

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

    // 1. Valider le corps de la requête avec Zod
    const validationResult = UpdateOfferSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        message: 'Données d\'entrée invalides.',
        errors: validationResult.error.flatten().fieldErrors,
      }, { status: 400 });
    }
    
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

    // 2. Construire l'objet de mise à jour à partir des données validées
    const { specificFields, ...otherFields } = validationResult.data;
    const updateData = { ...otherFields, ...specificFields };

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: "Aucune donnée valide à mettre à jour." }, { status: 400 });
    }

    const updatedOffer = await ProductOfferModel.findByIdAndUpdate(offerid, { $set: updateData }, { new: true, runValidators: true })
        .populate([
            { path: 'productModel', model: ProductModel, select: 'title slug brand category', populate: [{ path: 'brand', select: 'name slug' }, { path: 'category', select: 'name slug'}] },
            { path: 'seller', model: UserModel, select: 'name _id' }
        ])
        .lean<PopulatedOffer | null>();

    return NextResponse.json(toSafeOfferDTO(updatedOffer), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue.";
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ message: 'Données invalides.', errorDetails: error.message }, { status: 400 });
    }
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
      .lean<PopulatedOffer | null>();

    if (!offer) {
      return NextResponse.json({ message: 'Offre non trouvée.' }, { status: 404 });
    }
    return NextResponse.json(toSafeOfferDTO(offer), { status: 200 });
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
 *     description: Permet à un vendeur de supprimer son offre (si elle n'est pas vendue).
 *     tags:
 *       - Offers
 *     parameters:
 *       - in: path
 *         name: offerid
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID de l'offre à supprimer.
 *     responses:
 *       200:
 *         description: Offre supprimée avec succès.
 *       401:
 *         description: Non autorisé.
 *       403:
 *         description: Interdit (l'utilisateur n'est pas le propriétaire ou l'offre ne peut être supprimée).
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
      return NextResponse.json({ message: 'Action non autorisée sur cette offre.' }, { status: 403 });
    }

    if (offer.transactionStatus !== 'available') {
        return NextResponse.json({ message: 'Cette offre ne peut être supprimée car elle n\'est plus disponible.' }, { status: 403 });
    }

    await ProductOfferModel.findByIdAndDelete(offerid);

    return NextResponse.json({ message: 'Offre supprimée avec succès.' }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: "Erreur serveur lors de la suppression.", errorDetails: errorMessage }, { status: 500 });
  }
}