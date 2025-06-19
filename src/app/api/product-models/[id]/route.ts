import { NextRequest, NextResponse } from 'next/server';
import ProductModel, { IScrapedProduct } from '@/lib/mongodb/models/ScrapingProduct';
import dbConnect from '@/lib/mongodb/dbConnect';
import { Types } from 'mongoose';
import { z } from 'zod';
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

type Specification = {
    label: string;
    value: string;
    unit?: string;
};

type PopulatedBrand = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
};

type PopulatedCategory = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
};

// Étend IScrapedProduct pour inclure les champs populés et _id
type PopulatedScrapedProduct = Omit<IScrapedProduct, 'brand' | 'category' | '_id'> & {
  _id: number;
  brand?: PopulatedBrand;
  category?: PopulatedCategory;
};

const UpdateProductModelSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").optional(),
  brand: z.string().optional(), // Attendu comme ObjectId de la marque
  category: z.string().optional(), // Attendu comme ObjectId de la catégorie
  standardDescription: z.string().optional(),
  standardImageUrls: z.array(z.string().url("URL d'image invalide.")).optional(),
  specifications: z.record(z.unknown()).optional(), // Validation basique pour le moment
}).strict(); // Rejette les champs non définis dans le schéma

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const productModel = await ProductModel.findById(productId)
      .populate('brand', 'name slug')
      .populate('category', 'name slug')
      .lean<PopulatedScrapedProduct | null>();

    if (!productModel) {
      return NextResponse.json({ success: false, message: 'ProductModel non trouvé.' }, { status: 404 });
    }

    let specifications: Specification[];
    if (Array.isArray(productModel.specifications)) {
      // Nouveau format : les spécifications sont déjà un tableau plat
      specifications = productModel.specifications as Specification[];
    } else if (typeof productModel.specifications === 'object' && productModel.specifications !== null) {
      // Ancien format : objet imbriqué nécessitant une transformation
      specifications = Object.entries(productModel.specifications).flatMap(([category, specsObject]) => {
          if (typeof specsObject !== 'object' || specsObject === null) return [];
          return Object.entries(specsObject).map(([label, value]) => ({
            label: `${category} > ${label}`,
            value: String(value),
          }));
        })
    } else {
      // Pas de spécifications ou format inconnu
      specifications = [];
    }

    const response = {
        _id: productModel._id.toString(),
        leDenicheurId: productModel._id,
        slug: productModel.slug,
        title: productModel.product.title,
        brand: {
            _id: productModel.brand?._id.toString(),
            name: productModel.brand?.name || productModel.product.brand,
            slug: productModel.brand?.slug,
        },
        category: {
            _id: productModel.category?._id.toString(),
            name: productModel.category?.name,
            slug: productModel.category?.slug,
        },
        rawDescription: productModel.product.description,
        standardImageUrls: productModel.product.images || [],
        rawImageUrls: productModel.product.images || [],
        specifications: specifications,
        options: productModel.options,
        price_analysis: productModel.price_analysis,
        product: {
            title: productModel.product.title,
            image_url: productModel.product.image_url
        }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(`Erreur API /api/product-models/${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    return NextResponse.json({ success: false, message: 'Erreur serveur lors de la récupération du ProductModel.', errorDetails: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ message: 'ID du ProductModel invalide.' }, { status: 400 });
  }

  // La vérification des droits admin doit être implémentée ici si nécessaire

  try {
    const body = await request.json();
    const validationResult = UpdateProductModelSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Données de mise à jour invalides.',
        errors: validationResult.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const updateData = validationResult.data;
    
    // Logique de mise à jour spécifique si nécessaire...
    // Exemple: si 'brand' ou 'category' sont des slugs, les convertir en ObjectId.
    // Cette partie est à adapter en fonction des données réellement envoyées.

    await dbConnect();
    const updatedProductModel = await ProductModel.findByIdAndUpdate(
      productId, // Utiliser l'ID numérique parsé
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProductModel) {
      return NextResponse.json({ success: false, message: 'ProductModel non trouvé.' }, { status: 404 });
    }

    return NextResponse.json(updatedProductModel, { status: 200 });
  } catch (error) {
    console.error(`Erreur API PUT /api/product-models/${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    return NextResponse.json({ success: false, message: 'Erreur serveur lors de la mise à jour du ProductModel.', errorDetails: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, // Non utilisé, mais conservé
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ message: 'ID du ProductModel doit être un nombre valide.' }, { status: 400 });
  }

  // La vérification des droits admin doit être implémentée ici si nécessaire

  try {
    await dbConnect();

    // La logique de vérification des offres associées est omise pour la concision.
    // Si nécessaire, elle peut être ajoutée ici.
    // Exemple : 
    // const offerCount = await ProductOfferModel.countDocuments({ productModel: id });
    // if (offerCount > 0) { ... }

    const deletedProductModel = await ProductModel.findByIdAndDelete(productId).lean();

    if (!deletedProductModel) {
      return NextResponse.json({ message: 'ProductModel non trouvé pour la suppression.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'ProductModel supprimé avec succès.', deletedProductId: id }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur inconnue.';
    return NextResponse.json({ message: 'Erreur serveur lors de la suppression du ProductModel.', errorDetails: errorMessage }, { status: 500 });
  }
} 