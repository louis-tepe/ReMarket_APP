import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db.Connect';
import ProductModel, { IProductModel } from '@/models/ProductModel';
import mongoose, { Types } from 'mongoose';
// import { getServerSession } from "next-auth/next"; // Décommenter si authOptions est utilisé
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Décommenter pour la vérification admin
// Décommentez si la vérification des offres est réactivée dans DELETE
// import ProductOfferModel from '@/models/ProductBaseModel'; 

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
  request: NextRequest, // Non utilisé, mais conservé pour la signature de la route
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const product = await ProductModel.findById(id)
      .populate('brand', 'name slug') // Populater la marque
      .populate('category', 'name slug') // Populater la catégorie
      .lean<IProductModel | null>();

    if (!product) {
      return NextResponse.json({ message: 'ProductModel non trouvé.' }, { status: 404 });
    }
    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    return NextResponse.json({ message: 'Erreur serveur lors de la récupération du ProductModel.', errorDetails: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide.' }, { status: 400 });
  }

  // La vérification des droits admin doit être implémentée ici si nécessaire

  try {
    await dbConnect();
    const body = await request.json();
    // Le slug est géré par le hook pre-save du modèle, pas besoin de le manipuler ici.

    const updatedProductModel = await ProductModel.findByIdAndUpdate(
      id,
      { $set: body }, // S'assurer que `body` est validé/nettoyé par ailleurs
      { new: true, runValidators: true }
    ).lean<IProductModel | null>();

    if (!updatedProductModel) {
      return NextResponse.json({ message: 'ProductModel non trouvé pour la mise à jour.' }, { status: 404 });
    }
    return NextResponse.json(updatedProductModel, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ message: 'Erreur de validation des données.', errorDetails: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Erreur serveur lors de la mise à jour du ProductModel.', errorDetails: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, // Non utilisé, mais conservé
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide.' }, { status: 400 });
  }

  // La vérification des droits admin doit être implémentée ici si nécessaire

  try {
    await dbConnect();

    // La logique de vérification des offres associées est omise pour la concision.
    // Si nécessaire, elle peut être ajoutée ici.
    // Exemple : 
    // const offerCount = await ProductOfferModel.countDocuments({ productModel: id });
    // if (offerCount > 0) { ... }

    const deletedProductModel = await ProductModel.findByIdAndDelete(id).lean();

    if (!deletedProductModel) {
      return NextResponse.json({ message: 'ProductModel non trouvé pour la suppression.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'ProductModel supprimé avec succès.', deletedProductId: id }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    return NextResponse.json({ message: 'Erreur serveur lors de la suppression du ProductModel.', errorDetails: errorMessage }, { status: 500 });
  }
} 