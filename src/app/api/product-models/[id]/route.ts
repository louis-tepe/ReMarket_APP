import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import mongoose from 'mongoose';
// import { getServerSession } from "next-auth/next"; // Décommenter si authOptions est utilisé
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Décommenter pour la vérification admin

// L'interface RouteContext n'est plus nécessaire si on destructure directement { params }
// interface RouteContext {
//   params: {
//     id: string; // L'_id du ProductModel
//   }
// }

/**
 * @swagger
 * /api/product-models/{id}:
 *   get:
 *     summary: Récupère les détails complets d'un ProductModel ReMarket spécifique.
 *     description: Retourne toutes les informations d'un ProductModel standardisé par son ID.
 *     tags:
 *       - ProductModels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID MongoDB du ProductModel.
 *     responses:
 *       200:
 *         description: Détails du ProductModel.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IProductModel' # Référence au schéma IProductModel complet
 *       400:
 *         description: ID invalide fourni.
 *       404:
 *         description: ProductModel non trouvé.
 *       500:
 *         description: Erreur serveur.
 *   put:
 *     summary: Met à jour un ProductModel ReMarket existant.
 *     description: Permet à un administrateur de mettre à jour les détails d'un ProductModel.
 *     tags:
 *       - ProductModels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID MongoDB du ProductModel.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IProductModel' # Ou un sous-ensemble des champs modifiables
 *     responses:
 *       200:
 *         description: ProductModel mis à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IProductModel'
 *       400:
 *         description: ID invalide ou données d'entrée invalides.
 *       401:
 *         description: Non autorisé (nécessite des droits admin).
 *       404:
 *         description: ProductModel non trouvé.
 *       500:
 *         description: Erreur serveur.
 *   delete:
 *     summary: Supprime un ProductModel ReMarket.
 *     description: Permet à un administrateur de supprimer un ProductModel.
 *     tags:
 *       - ProductModels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID MongoDB du ProductModel.
 *     responses:
 *       200:
 *         description: ProductModel supprimé avec succès.
 *       400:
 *         description: ID invalide fourni.
 *       401:
 *         description: Non autorisé (nécessite des droits admin).
 *       404:
 *         description: ProductModel non trouvé.
 *       500:
 *         description: Erreur serveur.
 * components:
 *  schemas:
 *    IStandardSpecification: # Ajouté pour la complétude du schéma IProductModel
 *      type: object
 *      properties:
 *        label:
 *          type: string
 *        value:
 *          type: string
 *        unit:
 *          type: string
 *    IProductModel:
 *      type: object
 *      properties:
 *        _id:
 *          type: string
 *        title:
 *          type: string
 *        brand:
 *          type: string
 *        category:
 *          type: string
 *        standardDescription:
 *          type: string
 *        standardImageUrls:
 *          type: array
 *          items:
 *            type: string
 *        keyFeatures:
 *          type: array
 *          items:
 *            type: string
 *        specifications:
 *          type: array
 *          items:
 *            $ref: '#/components/schemas/IStandardSpecification'
 *        createdAt:
 *          type: string
 *          format: date-time
 *        updatedAt:
 *          type: string
 *          format: date-time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // Signature de params simplifiée
) {
  const { id } = params; // Accès direct à id

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const product = await ProductModel.findById(id).lean() as IProductModel | null;

    if (!product) {
      return NextResponse.json({ message: 'ProductModel non trouvé.' }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error) {
    // console.error(`[GET /api/product-models/${id}]`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la récupération du produit.', error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } } // Signature de params simplifiée
) {
  const { id } = params; // Accès direct à id

  // TODO: Implémenter la vérification des droits administrateur ici
  // Exemple:
  // const session = await getServerSession(authOptions);
  // if (!session || !session.user?.isAdmin) { // Assurez-vous que votre session user a un champ isAdmin ou équivalent
  //   return NextResponse.json({ message: 'Accès non autorisé. Droits administrateur requis.' }, { status: 403 }); // 403 Forbidden
  // }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const body = await request.json();

    if (body.slug) {
      delete body.slug;
    }

    const updatedProductModel = await ProductModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).lean() as IProductModel | null;

    if (!updatedProductModel) {
      return NextResponse.json({ message: 'ProductModel non trouvé pour la mise à jour.' }, { status: 404 });
    }

    return NextResponse.json(updatedProductModel, { status: 200 });
  } catch (error) {
    // console.error(`[PUT /api/product-models/${id}]`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ message: 'Erreur de validation.', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Erreur lors de la mise à jour du ProductModel.', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string } } // Signature de params simplifiée
) {
  const { id } = params; // Accès direct à id

  // TODO: Implémenter la vérification des droits administrateur ici
  // Exemple:
  // const session = await getServerSession(authOptions);
  // if (!session || !session.user?.isAdmin) {
  //   return NextResponse.json({ message: 'Accès non autorisé. Droits administrateur requis.' }, { status: 403 });
  // }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide ou manquant.' }, { status: 400 });
  }

  try {
    await dbConnect();

    // TODO: Vérifier s'il existe des offres associées (ProductOfferModel).
    // Stratégie à définir : interdire suppression, ou supprimer/archiver offres en cascade.
    // Exemple de vérification:
    // const offerCount = await ProductOfferModel.countDocuments({ productModel: id });
    // if (offerCount > 0) {
    //   return NextResponse.json({ message: `Impossible de supprimer: ${offerCount} offre(s) sont associées à ce ProductModel.` }, { status: 409 }); // 409 Conflict
    // }

    const deletedProductModel = await ProductModel.findByIdAndDelete(id).lean();

    if (!deletedProductModel) {
      return NextResponse.json({ message: 'ProductModel non trouvé pour la suppression.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'ProductModel supprimé avec succès.', deletedProductModelId: id }, { status: 200 });
  } catch (error) {
    // console.error(`[DELETE /api/product-models/${id}]`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ message: 'Erreur lors de la suppression du ProductModel.', error: errorMessage }, { status: 500 });
  }
} 